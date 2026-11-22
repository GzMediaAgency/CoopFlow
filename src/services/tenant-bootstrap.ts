import type { SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/tenant";
import { DEFAULT_PERMISSIONS, MODULES } from "@/lib/auth/permissions";

const ROLE_NAMES: Partial<Record<SystemRole, string>> = { ADMIN: "Administrateur", PRESIDENT: "Président / Directeur", MANAGER: "Responsable", ACCOUNTANT: "Comptable", STOCK_MANAGER: "Responsable stock", AGENT: "Agent" };
const PLANS = [
  { code: "STARTER", name: "Starter", monthly: Math.round(1990 / 12), yearly: 1990, users: 3, members: 50 },
  { code: "PROFESSIONAL", name: "Professional", monthly: Math.round(3990 / 12), yearly: 3990, users: 10, members: 300 },
  { code: "BUSINESS", name: "Business", monthly: Math.round(5990 / 12), yearly: 5990, users: 50, members: null },
] as const;

/** Données de plateforme indispensables (permissions, plans) : créées si absentes, donc l'inscription marche sur une base vierge. */
async function ensurePlatformData() {
  await prisma.permission.createMany({ data: MODULES.flatMap((m) => ["read", "write", "delete", "validate", "export"].map((a) => ({ code: `${m}:${a}`, module: m }))), skipDuplicates: true });
  for (const p of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: { priceMonthly: p.monthly, priceYearly: p.yearly },
      create: { code: p.code, name: p.name, priceMonthly: p.monthly, priceYearly: p.yearly, maxUsers: p.users, maxMembers: p.members, features: { whatsapp: p.code !== "STARTER", automations: p.code === "BUSINESS" } },
    });
  }
}

const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "cooperative";

/** Crée la coopérative, ses rôles, son administrateur et un essai de 30 jours, en une transaction. */
export async function createCooperative(p: { authId: string; email: string; fullName: string; orgName: string; locale: "fr" | "ar" }) {
  await ensurePlatformData();
  const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "PROFESSIONAL" } });
  const perms = new Map((await prisma.permission.findMany()).map((x) => [x.code, x.id]));
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: p.orgName, slug: `${slugify(p.orgName)}-${Math.random().toString(36).slice(2, 6)}`, defaultLocale: p.locale, email: p.email } });
    let adminRoleId = "";
    for (const [code, name] of Object.entries(ROLE_NAMES) as [SystemRole, string][]) {
      const role = await tx.role.create({ data: { organizationId: org.id, code, name, isSystem: true } });
      if (code === "ADMIN") adminRoleId = role.id;
      await tx.rolePermission.createMany({ data: DEFAULT_PERMISSIONS[code].map((c) => ({ roleId: role.id, permissionId: perms.get(c)! })) });
    }
    await tx.user.create({ data: { authId: p.authId, email: p.email, fullName: p.fullName, locale: p.locale, organizationId: org.id, roleId: adminRoleId } });
    await tx.subscription.create({ data: { organizationId: org.id, planId: plan.id, status: "TRIALING", trialEndsAt: new Date(Date.now() + 30 * 864e5) } });
    return org;
  });
}
