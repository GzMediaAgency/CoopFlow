import type { ExpenseCategory, Prisma } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import type { ExpenseInput } from "@/schemas/expense";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 25;

export async function listExpenses(ctx: Ctx, f: { category?: ExpenseCategory; page?: number }) {
  const page = Math.max(1, f.page ?? 1), where: Prisma.ExpenseWhereInput = { deletedAt: null, ...(f.category ? { category: f.category } : {}) };
  const [items, count, sum] = await Promise.all([
    ctx.db.expense.findMany({ where, orderBy: { spentAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { supplier: { select: { name: true } } } }),
    ctx.db.expense.count({ where }), ctx.db.expense.aggregate({ where, _sum: { amount: true } }),
  ]);
  return { items, count, total: Number(sum._sum.amount ?? 0), page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}
export const getExpense = (ctx: Ctx, id: string) => ctx.db.expense.findFirst({ where: { id, deletedAt: null } });
export const listSuppliers = (ctx: Ctx) => ctx.db.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });

async function checkSupplier(ctx: Ctx, id?: string) {
  if (id && !(await ctx.db.supplier.findFirst({ where: { id, deletedAt: null } }))) throw new DomainError("supplierNotFound");
}
const fields = (i: ExpenseInput) => ({ category: i.category, amount: i.amount, spentAt: new Date(i.spentAt), supplierId: i.supplierId ?? null, method: i.method, note: i.note ?? null, onCredit: i.onCredit === "1" });

export async function createExpense(ctx: Ctx, i: ExpenseInput) {
  await checkSupplier(ctx, i.supplierId);
  const e = await ctx.db.expense.create({ data: { organizationId: ctx.org.id, createdById: ctx.user.id, ...fields(i) } });
  await audit(ctx, "CREATE", "expense", e.id, { category: i.category, amount: i.amount });
  return e;
}
export async function updateExpense(ctx: Ctx, id: string, i: ExpenseInput) {
  await checkSupplier(ctx, i.supplierId);
  const e = await ctx.db.expense.update({ where: { id }, data: fields(i) });
  await audit(ctx, "UPDATE", "expense", id, fields(i));
  return e;
}
export async function archiveExpense(ctx: Ctx, id: string) {
  await ctx.db.expense.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(ctx, "DELETE", "expense", id, { archived: true });
}
