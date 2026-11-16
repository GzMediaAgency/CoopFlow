import type { InvoiceStatus } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 25;

/** Les factures échues et non soldées passent « En retard » (appelé à l'affichage, pas de tâche planifiée nécessaire). */
export async function refreshOverdue(ctx: Ctx) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  await ctx.db.invoice.updateMany({ where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] }, dueDate: { lt: today }, deletedAt: null }, data: { status: "OVERDUE" } });
}

export async function listInvoices(ctx: Ctx, f: { q?: string; status?: InvoiceStatus; page?: number }) {
  await refreshOverdue(ctx);
  const page = Math.max(1, f.page ?? 1);
  const where = { deletedAt: null, ...(f.status ? { status: f.status } : {}),
    ...(f.q ? { OR: [{ number: { contains: f.q, mode: "insensitive" as const } }, { customer: { name: { contains: f.q, mode: "insensitive" as const } } }] } : {}) };
  const [items, count, sums] = await Promise.all([
    ctx.db.invoice.findMany({ where, orderBy: { issueDate: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { customer: { select: { name: true } } } }),
    ctx.db.invoice.count({ where }), ctx.db.invoice.aggregate({ where, _sum: { total: true, amountPaid: true } }),
  ]);
  return { items, count, billed: Number(sums._sum.total ?? 0), paid: Number(sums._sum.amountPaid ?? 0), page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export async function getInvoice(ctx: Ctx, id: string) {
  await refreshOverdue(ctx);
  return ctx.db.invoice.findFirst({ where: { id, deletedAt: null }, include: {
    customer: true, items: { orderBy: { description: "asc" } }, payments: { where: { status: "COMPLETED" }, orderBy: { paidAt: "asc" } } } });
}
