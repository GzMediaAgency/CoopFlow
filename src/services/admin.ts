import type { OrgStatus, PlanCode, Prisma, SubscriptionStatus } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/db/tenant";
import type { planSchema } from "@/schemas/modules";
import { DomainError } from "@/lib/errors";

export const PAGE_SIZE = 25;
const day = 864e5;

export async function overview() {
  const since = new Date(Date.now() - 30 * day);
  const [orgs, active, fresh, users, subs, activeSubs, members, sales] = await Promise.all([
    prisma.organization.count(), prisma.organization.count({ where: { status: "ACTIVE" } }), prisma.organization.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { organizationId: { not: null } } }), prisma.subscription.groupBy({ by: ["status"], _count: true }),
    prisma.subscription.findMany({ where: { status: "ACTIVE" }, include: { plan: { select: { priceMonthly: true, code: true } } } }),
    prisma.member.count(), prisma.sale.count({ where: { soldAt: { gte: since } } }),
  ]);
  const byPlan = new Map<string, number>();
  activeSubs.forEach((s) => byPlan.set(s.plan.code, (byPlan.get(s.plan.code) ?? 0) + 1));
  return { orgs, active, fresh, users, members, sales, subs, mrr: activeSubs.reduce((a, s) => a + Number(s.plan.priceMonthly), 0), byPlan: [...byPlan.entries()] };
}

export async function listOrganizations(f: { q?: string; status?: OrgStatus; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const where: Prisma.OrganizationWhereInput = { ...(f.status ? { status: f.status } : {}), ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { city: { contains: f.q, mode: "insensitive" } }, { email: { contains: f.q, mode: "insensitive" } }] } : {}) };
  const [items, count] = await Promise.all([
    prisma.organization.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { subscription: { include: { plan: { select: { name: true } } } }, _count: { select: { users: true, members: true } } } }),
    prisma.organization.count({ where }),
  ]);
  return { items, count, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export async function getOrganization(id: string) {
  const o = await prisma.organization.findUnique({ where: { id }, include: {
    subscription: { include: { plan: true } }, users: { include: { role: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    _count: { select: { members: true, products: true, customers: true, sales: true, invoices: true } } } });
  return o;
}

export const listPlans = () => prisma.subscriptionPlan.findMany({ orderBy: { priceMonthly: "asc" }, include: { _count: { select: { subscriptions: true } } } });
export const listAllUsers = (q?: string) => prisma.user.findMany({ where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }] } : {}, orderBy: { createdAt: "desc" }, take: 100, include: { organization: { select: { id: true, name: true } }, role: { select: { name: true } } } });

export async function setOrgStatus(id: string, status: OrgStatus) { await prisma.organization.update({ where: { id }, data: { status } }); }

export async function changeSubscription(orgId: string, p: { planCode: PlanCode; status: SubscriptionStatus; periodEnd?: string }) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: p.planCode } });
  if (!plan) throw new DomainError("planNotFound");
  const end = p.periodEnd ? new Date(p.periodEnd) : null;
  const data = { planId: plan.id, status: p.status, currentPeriodEnd: end, ...(p.status === "TRIALING" ? { trialEndsAt: end ?? new Date(Date.now() + 14 * day) } : {}), ...(p.status === "CANCELLED" ? { cancelledAt: new Date() } : {}) };
  await prisma.subscription.upsert({ where: { organizationId: orgId }, update: data, create: { organizationId: orgId, ...data } });
}

export async function updatePlan(code: PlanCode, d: z.infer<typeof planSchema>) {
  await prisma.subscriptionPlan.update({ where: { code }, data: { priceMonthly: d.priceMonthly, priceYearly: d.priceYearly ?? null, maxUsers: d.maxUsers, maxMembers: d.maxMembers ?? null } });
}

export async function setUserStatusAdmin(userId: string, status: "ACTIVE" | "DISABLED") {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u || u.isSuperAdmin) throw new DomainError("userNotFound"); // un super admin ne se désactive pas ici
  await prisma.user.update({ where: { id: userId }, data: { status } });
}
