import type { PaymentMethod } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { c2 } from "@/lib/totals";
import { DomainError } from "@/lib/errors";
import type { Tx } from "./stock";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 25;
export const OPEN_STATUSES = ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] as const;

/**
 * Encaisse un paiement sur une facture ET met à jour facture, vente et commande (rapprochement automatique).
 * Le plafond (reste à payer) est vérifié de façon atomique : deux encaissements simultanés ne peuvent pas dépasser le total.
 */
export async function recordPayment(tx: Tx, ctx: Ctx, p: { invoiceId: string; amount: number; method: PaymentMethod; paidAt?: Date; reference?: string; note?: string }) {
  const inv = await tx.invoice.findFirst({ where: { id: p.invoiceId, deletedAt: null, status: { in: [...OPEN_STATUSES] } } });
  if (!inv) throw new DomainError("invoiceNotPayable");
  const amount = c2(p.amount), total = Number(inv.total);
  if (!(amount > 0)) throw new DomainError("invalidAmount");
  const lock = await tx.invoice.updateMany({ where: { id: inv.id, amountPaid: { lte: c2(total - amount) } }, data: { amountPaid: { increment: amount } } });
  if (lock.count === 0) throw new DomainError("overpayment");

  const fresh = await tx.invoice.findFirstOrThrow({ where: { id: inv.id } });
  const paid = Number(fresh.amountPaid), full = paid >= total - 0.005;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const status = full ? "PAID" : fresh.dueDate && fresh.dueDate < today ? "OVERDUE" : "PARTIALLY_PAID";
  const state = full ? ("PAID" as const) : ("PARTIAL" as const);
  await tx.invoice.update({ where: { id: inv.id }, data: { status } });
  if (inv.saleId) await tx.sale.update({ where: { id: inv.saleId }, data: { amountPaid: paid, paymentState: state } });
  if (inv.orderId) await tx.order.update({ where: { id: inv.orderId }, data: { paymentState: state } });
  return tx.payment.create({ data: {
    organizationId: ctx.org.id, type: "CUSTOMER", direction: "IN", amount, paidAt: p.paidAt ?? new Date(), method: p.method, reference: p.reference, note: p.note,
    status: "COMPLETED", customerId: inv.customerId, invoiceId: inv.id, orderId: inv.orderId, createdById: ctx.user.id } });
}

export async function addPayment(ctx: Ctx, p: Parameters<typeof recordPayment>[2]) {
  const pay = await ctx.db.$transaction((tx) => recordPayment(tx, ctx, p));
  await audit(ctx, "PAYMENT", "payment", pay.id, { invoice: p.invoiceId, amount: p.amount });
  return pay;
}

export async function listPayments(ctx: Ctx, f: { q?: string; method?: PaymentMethod; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const where = { ...(f.method ? { method: f.method } : {}),
    ...(f.q ? { OR: [{ reference: { contains: f.q, mode: "insensitive" as const } }, { customer: { name: { contains: f.q, mode: "insensitive" as const } } }, { invoice: { number: { contains: f.q, mode: "insensitive" as const } } }] } : {}) };
  const [items, count, sum] = await Promise.all([
    ctx.db.payment.findMany({ where, orderBy: { paidAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { customer: { select: { name: true } }, supplier: { select: { name: true } }, member: { select: { firstName: true, lastName: true } }, invoice: { select: { id: true, number: true } } } }),
    ctx.db.payment.count({ where }),
    ctx.db.payment.aggregate({ where: { ...where, status: "COMPLETED", direction: "IN" }, _sum: { amount: true } }),
  ]);
  return { items, count, total: Number(sum._sum.amount ?? 0), page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export const openInvoices = (ctx: Ctx) =>
  ctx.db.invoice.findMany({ where: { deletedAt: null, status: { in: [...OPEN_STATUSES] } }, orderBy: { issueDate: "desc" }, take: 200, include: { customer: { select: { name: true } } } });
