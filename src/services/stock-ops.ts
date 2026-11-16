import type { Prisma } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import type { MovementInput } from "@/schemas/stock";
import { IN_TYPES } from "@/schemas/stock";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { applyMovement, applyOutFifo } from "./stock";
import { stockState } from "./products";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 25;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

// ---------- vue d'ensemble ----------
export async function stockOverview(ctx: Ctx, f: { q?: string; state?: "low" | "out" }) {
  const products = await ctx.db.product.findMany({
    where: { deletedAt: null, isActive: true, ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { sku: { contains: f.q, mode: "insensitive" } }] } : {}) },
    orderBy: { name: "asc" }, take: 500, include: { inventory: true },
  });
  const rows = products.map((p) => {
    const qty = Number(p.inventory?.quantity ?? 0), reserved = Number(p.inventory?.reservedQty ?? 0), min = Number(p.stockMin);
    return { id: p.id, name: p.name, sku: p.sku, unit: p.unit, qty, reserved, available: r3(qty - reserved), min, max: p.stockMax ? Number(p.stockMax) : null, value: qty * Number(p.purchasePrice), state: stockState(qty, min) };
  });
  const soon = new Date(Date.now() + 30 * 864e5);
  const expiring = await ctx.db.productionBatch.findMany({ where: { remainingQty: { gt: 0 }, expiresAt: { lte: soon } }, orderBy: { expiresAt: "asc" }, take: 10, include: { product: { select: { name: true } } } });
  return {
    rows: f.state ? rows.filter((r) => r.state === f.state) : rows, expiring,
    kpi: { value: rows.reduce((s, r) => s + r.value, 0), total: rows.length, low: rows.filter((r) => r.state === "low").length, out: rows.filter((r) => r.state === "out").length },
  };
}

// ---------- historique ----------
export async function listMovements(ctx: Ctx, f: { productId?: string; type?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const where: Prisma.InventoryMovementWhereInput = { ...(f.productId ? { productId: f.productId } : {}), ...(f.type ? { type: f.type as never } : {}) };
  const [items, count, products] = await Promise.all([
    ctx.db.inventoryMovement.findMany({ where, orderBy: [{ movedAt: "desc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { product: { select: { name: true, unit: true } }, batch: { select: { batchNumber: true } }, user: { select: { fullName: true } } } }),
    ctx.db.inventoryMovement.count({ where }),
    ctx.db.product.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { items, count, products, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

// ---------- mouvement manuel ----------
export async function manualMovement(ctx: Ctx, input: MovementInput) {
  const product = await ctx.db.product.findFirst({ where: { id: input.productId, deletedAt: null } });
  if (!product) throw new DomainError("productNotFound");
  const isIn = (IN_TYPES as readonly string[]).includes(input.type);
  await ctx.db.$transaction(async (tx) => {
    const base = { organizationId: ctx.org.id, userId: ctx.user.id, productId: product.id, type: input.type, quantity: input.quantity, movedAt: new Date(input.movedAt), reference: input.reference, comment: input.comment };
    if (isIn) return void (await applyMovement(tx, { ...base, direction: "IN" }));
    if (input.batchId) {
      if (!(await tx.productionBatch.findFirst({ where: { id: input.batchId, productId: product.id } }))) throw new DomainError("batchNotFound");
      return void (await applyMovement(tx, { ...base, direction: "OUT", batchId: input.batchId }));
    }
    await applyOutFifo(tx, base);
  });
  await audit(ctx, "STOCK_CHANGE", "movement", undefined, { product: product.sku, type: input.type, quantity: input.quantity });
}

// ---------- inventaire physique ----------
export const listInventories = (ctx: Ctx) => ctx.db.inventoryCount.findMany({ orderBy: { countedAt: "desc" }, take: 50, include: { _count: { select: { lines: true } } } });

export const getInventory = (ctx: Ctx, id: string) =>
  ctx.db.inventoryCount.findFirst({ where: { id }, include: { lines: { include: { product: { select: { name: true, sku: true, unit: true } } }, orderBy: { product: { name: "asc" } } } } });

export async function createInventory(ctx: Ctx) {
  const n = (await ctx.db.inventoryCount.count()) + 1;
  const products = await ctx.db.product.findMany({ where: { deletedAt: null, isActive: true }, include: { inventory: true } });
  if (!products.length) throw new DomainError("noProducts");
  const inv = await ctx.db.inventoryCount.create({ data: {
    organizationId: ctx.org.id, reference: `INV-${new Date().getFullYear()}-${String(n).padStart(3, "0")}`, status: "IN_PROGRESS", createdById: ctx.user.id,
    lines: { create: products.map((p) => ({ productId: p.id, theoreticalQty: p.inventory?.quantity ?? 0, unitCost: p.purchasePrice })) }, // photographie du stock théorique
  } });
  await audit(ctx, "CREATE", "inventory_count", inv.id, { reference: inv.reference });
  return inv;
}

export async function saveCounts(ctx: Ctx, id: string, entries: [string, string][]) {
  const inv = await ctx.db.inventoryCount.findFirst({ where: { id, status: { in: ["DRAFT", "IN_PROGRESS"] } } });
  if (!inv) throw new DomainError("inventoryClosed");
  for (const [lineId, raw] of entries) {
    const qty = raw === "" ? null : Number(raw);
    if (qty !== null && (!Number.isFinite(qty) || qty < 0)) throw new DomainError("invalidQuantity");
    // la ligne doit appartenir à CET inventaire (donc à cette coopérative)
    await ctx.db.inventoryCountLine.updateMany({ where: { id: lineId, inventoryCountId: inv.id }, data: { actualQty: qty } });
  }
}

/** Valide l'inventaire : chaque écart devient un mouvement « Ajustement » (calculé sur le stock au moment de la validation). */
export async function validateInventory(ctx: Ctx, id: string) {
  await ctx.db.$transaction(async (tx) => {
    const lock = await tx.inventoryCount.updateMany({ where: { id, status: { in: ["DRAFT", "IN_PROGRESS"] } }, data: { status: "VALIDATED", validatedAt: new Date() } });
    if (lock.count === 0) throw new DomainError("inventoryClosed"); // déjà validé (double clic, deux onglets…)
    const inv = await tx.inventoryCount.findFirst({ where: { id }, include: { lines: true } });
    const counted = inv?.lines.filter((l) => l.actualQty !== null) ?? [];
    if (!inv || counted.length === 0) throw new DomainError("nothingCounted");
    for (const l of counted) {
      const current = Number((await tx.inventory.findFirst({ where: { productId: l.productId } }))?.quantity ?? 0);
      const diff = r3(Number(l.actualQty) - current);
      if (diff === 0) continue;
      const base = { organizationId: ctx.org.id, userId: ctx.user.id, productId: l.productId, type: "ADJUSTMENT" as const, quantity: Math.abs(diff), reference: inv.reference, comment: "Inventaire physique", inventoryCountId: id };
      if (diff > 0) await applyMovement(tx, { ...base, direction: "IN" });
      else await applyOutFifo(tx, base);
    }
  });
  await audit(ctx, "STOCK_CHANGE", "inventory_count", id, { validated: true });
}
