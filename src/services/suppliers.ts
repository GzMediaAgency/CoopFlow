import type { requireUser } from "@/lib/auth/session";
import type { z } from "zod";
import type { contributionPaymentSchema, supplierSchema } from "@/schemas/modules";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { c2 } from "@/lib/totals";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
type Input = z.infer<typeof supplierSchema>;
export const PAGE_SIZE = 25;
const fields = (i: Input) => ({ name: i.name, company: i.company ?? null, ice: i.ice ?? null, taxId: i.taxId ?? null, phone: i.phone ?? null, email: i.email ?? null, address: i.address ?? null, notes: i.notes ?? null });
const num = (v: unknown) => Number(v ?? 0);

/** Dette envers les fournisseurs = achats à crédit − paiements effectués (compte courant, sans rapprochement ligne à ligne). */
export async function debts(ctx: Ctx, ids: string[]) {
  const [credit, paid] = await Promise.all([
    ctx.db.expense.groupBy({ by: ["supplierId"], where: { supplierId: { in: ids }, onCredit: true, deletedAt: null }, _sum: { amount: true } }),
    ctx.db.payment.groupBy({ by: ["supplierId"], where: { supplierId: { in: ids }, type: "SUPPLIER", direction: "OUT", status: "COMPLETED" }, _sum: { amount: true } }),
  ]);
  const out = new Map<string, number>(ids.map((id) => [id, 0]));
  credit.forEach((c) => c.supplierId && out.set(c.supplierId, num(c._sum.amount)));
  paid.forEach((p) => p.supplierId && out.set(p.supplierId, (out.get(p.supplierId) ?? 0) - num(p._sum.amount)));
  return out;
}

export async function listSuppliersPaged(ctx: Ctx, f: { q?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const where = { deletedAt: null, ...(f.q ? { OR: ["name", "company", "phone"].map((k) => ({ [k]: { contains: f.q, mode: "insensitive" as const } })) } : {}) };
  const [rows, count, total] = await Promise.all([
    ctx.db.supplier.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    ctx.db.supplier.count({ where }), ctx.db.supplier.count({ where: { deletedAt: null } }),
  ]);
  const d = await debts(ctx, rows.map((r) => r.id));
  return { items: rows.map((r) => ({ ...r, debt: d.get(r.id) ?? 0 })), count, hasAny: total > 0, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export async function getSupplier(ctx: Ctx, id: string) {
  const s = await ctx.db.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!s) return null;
  const [expenses, sum, products, payments, d] = await Promise.all([
    ctx.db.expense.findMany({ where: { supplierId: id, deletedAt: null }, orderBy: { spentAt: "desc" }, take: 10 }),
    ctx.db.expense.aggregate({ where: { supplierId: id, deletedAt: null }, _sum: { amount: true } }),
    ctx.db.product.findMany({ where: { supplierId: id, deletedAt: null }, select: { id: true, name: true }, take: 10 }),
    ctx.db.payment.findMany({ where: { supplierId: id, type: "SUPPLIER", status: "COMPLETED" }, orderBy: { paidAt: "desc" }, take: 10 }),
    debts(ctx, [id]),
  ]);
  return { ...s, expenses, spent: Number(sum._sum.amount ?? 0), products, payments, debt: d.get(id) ?? 0 };
}

export async function createSupplier(ctx: Ctx, i: Input) {
  const s = await ctx.db.supplier.create({ data: { organizationId: ctx.org.id, ...fields(i) } });
  await audit(ctx, "CREATE", "supplier", s.id, { name: s.name });
  return s;
}
export async function updateSupplier(ctx: Ctx, id: string, i: Input) {
  const s = await ctx.db.supplier.update({ where: { id }, data: fields(i) });
  await audit(ctx, "UPDATE", "supplier", id, fields(i));
  return s;
}
export async function archiveSupplier(ctx: Ctx, id: string) {
  await ctx.db.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(ctx, "DELETE", "supplier", id, { archived: true });
}

/** Paie un fournisseur : on verrouille sa ligne pour que deux paiements simultanés ne dépassent jamais la dette. */
export async function paySupplier(ctx: Ctx, id: string, i: z.infer<typeof contributionPaymentSchema>) {
  const pay = await ctx.db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "suppliers" WHERE "id" = ${id}::uuid AND "organizationId" = ${ctx.org.id}::uuid AND "deletedAt" IS NULL FOR UPDATE`;
    if (locked.length === 0) throw new DomainError("supplierNotFound");
    const [credit, repaid] = await Promise.all([
      tx.expense.aggregate({ where: { supplierId: id, onCredit: true, deletedAt: null }, _sum: { amount: true } }),
      tx.payment.aggregate({ where: { supplierId: id, type: "SUPPLIER", direction: "OUT", status: "COMPLETED" }, _sum: { amount: true } }),
    ]);
    const amount = c2(i.amount), debt = c2(num(credit._sum.amount) - num(repaid._sum.amount));
    if (amount > debt + 0.005) throw new DomainError("overDebt");
    return tx.payment.create({ data: { organizationId: ctx.org.id, type: "SUPPLIER", direction: "OUT", amount, paidAt: new Date(i.paidAt), method: i.method, reference: i.reference, status: "COMPLETED", supplierId: id, createdById: ctx.user.id } });
  });
  await audit(ctx, "PAYMENT", "supplier", id, { amount: i.amount });
  return pay;
}
