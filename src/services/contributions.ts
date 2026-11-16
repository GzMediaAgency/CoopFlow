import type { Prisma } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { c2 } from "@/lib/totals";
import type { z } from "zod";
import type { contributionPaymentSchema, contributionSchema } from "@/schemas/modules";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 25;
export type ContribStatus = "PAID" | "LATE" | "PENDING";
export const statusOf = (c: { paidAt: Date | null; dueDate: Date | null }): ContribStatus => (c.paidAt ? "PAID" : c.dueDate && c.dueDate < new Date(new Date().setHours(0, 0, 0, 0)) ? "LATE" : "PENDING");

export async function listContributions(ctx: Ctx, f: { q?: string; status?: "late" | "pending" | "paid"; page?: number }) {
  const page = Math.max(1, f.page ?? 1), today = new Date(new Date().setHours(0, 0, 0, 0));
  const where: Prisma.ContributionWhereInput = { deletedAt: null,
    ...(f.status === "paid" ? { paidAt: { not: null } } : f.status === "late" ? { paidAt: null, dueDate: { lt: today } } : f.status === "pending" ? { paidAt: null, dueDate: { gte: today } } : {}),
    ...(f.q ? { member: { OR: [{ firstName: { contains: f.q, mode: "insensitive" } }, { lastName: { contains: f.q, mode: "insensitive" } }] } } : {}) };
  const [items, count, sums, late] = await Promise.all([
    ctx.db.contribution.findMany({ where, orderBy: [{ dueDate: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { member: { select: { firstName: true, lastName: true } } } }),
    ctx.db.contribution.count({ where }),
    ctx.db.contribution.aggregate({ where: { deletedAt: null }, _sum: { amountDue: true, amountPaid: true } }),
    ctx.db.contribution.count({ where: { deletedAt: null, paidAt: null, dueDate: { lt: today } } }),
  ]);
  const due = Number(sums._sum.amountDue ?? 0), paid = Number(sums._sum.amountPaid ?? 0);
  return { items, count, kpi: { due, paid, remaining: due - paid, late }, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export const getContribution = (ctx: Ctx, id: string) =>
  ctx.db.contribution.findFirst({ where: { id, deletedAt: null }, include: { member: { select: { id: true, firstName: true, lastName: true } } } });
export const contributionPayments = (ctx: Ctx, id: string) => ctx.db.payment.findMany({ where: { contributionId: id, status: "COMPLETED" }, orderBy: { paidAt: "asc" } });

export async function createContribution(ctx: Ctx, i: z.infer<typeof contributionSchema>) {
  if (!(await ctx.db.member.findFirst({ where: { id: i.memberId, deletedAt: null } }))) throw new DomainError("memberNotFound");
  const c = await ctx.db.contribution.create({ data: { organizationId: ctx.org.id, memberId: i.memberId, type: i.type, amountDue: i.amountDue, dueDate: new Date(i.dueDate), note: i.note, createdById: ctx.user.id } });
  await audit(ctx, "CREATE", "contribution", c.id, { type: i.type, amount: i.amountDue });
  return c;
}

/** Encaisse une cotisation : plafond atomique (jamais plus que le dû) + paiement lié au membre. */
export async function payContribution(ctx: Ctx, id: string, i: z.infer<typeof contributionPaymentSchema>) {
  const pay = await ctx.db.$transaction(async (tx) => {
    const c = await tx.contribution.findFirst({ where: { id, deletedAt: null } });
    if (!c) throw new DomainError("contributionNotFound");
    const due = Number(c.amountDue), amount = c2(i.amount);
    const lock = await tx.contribution.updateMany({ where: { id, amountPaid: { lte: c2(due - amount) } }, data: { amountPaid: { increment: amount } } });
    if (lock.count === 0) throw new DomainError("overpayment");
    const fresh = await tx.contribution.findFirstOrThrow({ where: { id } });
    if (Number(fresh.amountPaid) >= due - 0.005) await tx.contribution.update({ where: { id }, data: { paidAt: new Date(i.paidAt), method: i.method, reference: i.reference } });
    return tx.payment.create({ data: { organizationId: ctx.org.id, type: "CONTRIBUTION", direction: "IN", amount, paidAt: new Date(i.paidAt), method: i.method, reference: i.reference, status: "COMPLETED", memberId: c.memberId, contributionId: id, createdById: ctx.user.id } });
  });
  await audit(ctx, "PAYMENT", "contribution", id, { amount: i.amount });
  return pay;
}
