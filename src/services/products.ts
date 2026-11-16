import type { Prisma } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import type { ProductInput } from "@/schemas/product";
import { audit } from "@/lib/audit";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 20;
export type ProductFilters = { q?: string; categoryId?: string; active?: "1" | "0"; page?: number };
export type StockState = "out" | "low" | "ok";
export const stockState = (qty: number, min: number): StockState => (qty <= 0 ? "out" : qty <= min ? "low" : "ok");

const whereOf = (f: ProductFilters): Prisma.ProductWhereInput => ({
  deletedAt: null,
  ...(f.categoryId ? { categoryId: f.categoryId } : {}),
  ...(f.active ? { isActive: f.active === "1" } : {}),
  ...(f.q ? { OR: ["name", "nameAr", "sku"].map((k) => ({ [k]: { contains: f.q, mode: "insensitive" as const } })) } : {}),
});

export async function listProducts(ctx: Ctx, f: ProductFilters) {
  const page = Math.max(1, f.page ?? 1), where = whereOf(f);
  const [rows, count, total, categories] = await Promise.all([
    ctx.db.product.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { category: { select: { name: true } }, inventory: true } }),
    ctx.db.product.count({ where }),
    ctx.db.product.count({ where: { deletedAt: null } }),
    ctx.db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const items = rows.map((p) => {
    const qty = Number(p.inventory?.quantity ?? 0), reserved = Number(p.inventory?.reservedQty ?? 0);
    return { ...p, qty, reserved, state: stockState(qty, Number(p.stockMin)) };
  });
  return { items, count, hasAny: total > 0, categories, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export const getProduct = (ctx: Ctx, id: string) =>
  ctx.db.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: true, inventory: true,
      batches: { orderBy: { producedAt: "desc" }, take: 8 },
      movements: { orderBy: { movedAt: "desc" }, take: 10 },
    },
  });

async function categoryId(ctx: Ctx, name?: string) {
  if (!name) return null;
  const found = await ctx.db.category.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  return (found ?? (await ctx.db.category.create({ data: { organizationId: ctx.org.id, name } }))).id;
}

const fields = (i: ProductInput, categoryId: string | null) => ({
  name: i.name, nameAr: i.nameAr ?? null, description: i.description ?? null, unit: i.unit, categoryId,
  purchasePrice: i.purchasePrice, priceRetail: i.priceRetail,
  priceProfessional: i.priceProfessional ?? null, priceReseller: i.priceReseller ?? null, priceMember: i.priceMember ?? null,
  vatRate: i.vatRate, stockMin: i.stockMin, stockMax: i.stockMax ?? null, shelfLifeDays: i.shelfLifeDays ?? null, isActive: i.isActive,
});

export async function createProduct(ctx: Ctx, input: ProductInput) {
  const catId = await categoryId(ctx, input.category);
  const base = await ctx.db.product.count(); // archivés inclus : un SKU auto ne se réutilise jamais
  for (let n = base + 1; n < base + 4; n++) {
    try {
      const sku = input.sku ?? `P-${String(n).padStart(3, "0")}`;
      const p = await ctx.db.product.create({ data: { organizationId: ctx.org.id, sku, ...fields(input, catId) } });
      await ctx.db.inventory.create({ data: { organizationId: ctx.org.id, productId: p.id } }); // ligne de stock à zéro
      await audit(ctx, "CREATE", "product", p.id, { sku });
      return p;
    } catch (e) { if ((e as { code?: string }).code !== "P2002" || input.sku) throw e; } // SKU choisi en doublon : on remonte l'erreur
  }
  throw new Error("Impossible d'attribuer un SKU");
}

export async function updateProduct(ctx: Ctx, id: string, input: ProductInput) {
  const p = await ctx.db.product.update({ where: { id }, data: { ...fields(input, await categoryId(ctx, input.category)), ...(input.sku ? { sku: input.sku } : {}) } });
  await audit(ctx, "UPDATE", "product", id, fields(input, p.categoryId));
  return p;
}

/** Archivage : le produit disparaît du catalogue mais reste dans l'historique de stock et de ventes. */
export async function archiveProduct(ctx: Ctx, id: string) {
  await ctx.db.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  await audit(ctx, "DELETE", "product", id, { archived: true });
}
