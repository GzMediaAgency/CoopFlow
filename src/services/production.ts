import type { Prisma } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import type { ProductionInput } from "@/schemas/production";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { applyMovement } from "./stock";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 20;
export type ProductionFilters = { q?: string; productId?: string; page?: number };

export async function listProductions(ctx: Ctx, f: ProductionFilters) {
  const page = Math.max(1, f.page ?? 1);
  const where: Prisma.ProductionRecordWhereInput = {
    ...(f.productId ? { productId: f.productId } : {}),
    ...(f.q ? { OR: [{ batch: { batchNumber: { contains: f.q, mode: "insensitive" } } }, { product: { name: { contains: f.q, mode: "insensitive" } } }] } : {}),
  };
  const [items, count, total, products] = await Promise.all([
    ctx.db.productionRecord.findMany({ where, orderBy: { producedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { product: { select: { name: true } }, member: { select: { firstName: true, lastName: true } }, batch: { select: { batchNumber: true } } } }),
    ctx.db.productionRecord.count({ where }),
    ctx.db.productionRecord.count(),
    ctx.db.product.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { items, count, hasAny: total > 0, products, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export const getProduction = (ctx: Ctx, id: string) =>
  ctx.db.productionRecord.findFirst({
    where: { id },
    include: { product: { select: { name: true, sku: true } }, member: { select: { id: true, firstName: true, lastName: true } }, batch: true },
  });

export const batchTrace = (ctx: Ctx, batchId: string) =>
  ctx.db.inventoryMovement.findMany({ where: { batchId }, orderBy: { movedAt: "asc" } });

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** Enregistre une production : lot + production + mouvement d'entrée + stock, en UNE transaction. */
export async function createProduction(ctx: Ctx, input: ProductionInput) {
  // Produit et membre sont lus via ctx.db : un identifiant d'une autre coopérative est simplement introuvable.
  const product = await ctx.db.product.findFirst({ where: { id: input.productId, deletedAt: null, isActive: true } });
  if (!product) throw new DomainError("productNotFound");
  const member = input.memberId ? await ctx.db.member.findFirst({ where: { id: input.memberId, deletedAt: null } }) : null;
  if (input.memberId && !member) throw new DomainError("memberNotFound");

  const producedAt = new Date(input.producedAt);
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : product.shelfLifeDays ? new Date(producedAt.getTime() + product.shelfLifeDays * 864e5) : null;
  const prefix = `${product.sku.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase()}-${ymd(producedAt)}`;
  const existing = await ctx.db.productionBatch.count({ where: { batchNumber: { startsWith: prefix } } });
  const producerName = member ? `${member.firstName} ${member.lastName}` : input.groupName ?? null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const batchNumber = input.batchNumber ?? `${prefix}-${existing + 1 + attempt}`;
    try {
      const out = await ctx.db.$transaction(async (tx) => {
        const batch = await tx.productionBatch.create({ data: { organizationId: ctx.org.id, productId: product.id, batchNumber, producedAt, initialQuantity: input.quantity, remainingQty: input.quantity, producerName, expiresAt, status: "AVAILABLE" } });
        const record = await tx.productionRecord.create({ data: {
          organizationId: ctx.org.id, productId: product.id, memberId: member?.id, batchId: batch.id, groupName: input.groupName, plotOrUnit: input.plotOrUnit,
          quantity: input.quantity, unit: product.unit, producedAt, quality: input.quality, unitCost: input.unitCost, comment: input.comment, createdById: ctx.user.id } });
        await applyMovement(tx, { organizationId: ctx.org.id, userId: ctx.user.id, productId: product.id, batchId: batch.id, direction: "IN", type: "PRODUCTION",
          quantity: input.quantity, movedAt: producedAt, reference: batchNumber, productionRecordId: record.id });
        return record;
      });
      await audit(ctx, "STOCK_CHANGE", "production", out.id, { product: product.sku, quantity: input.quantity, batch: batchNumber });
      return out;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002" && !input.batchNumber) continue; // numéro auto déjà pris : on réessaie
      throw e;
    }
  }
  throw new DomainError("batchTaken");
}
