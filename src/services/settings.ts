import { createClient } from "@supabase/supabase-js";
import type { UserStatus } from "@prisma/client";
import type { z } from "zod";
import type { requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { prisma } from "@/lib/db/tenant";
import type { billingSchema, inviteSchema, orgSchema } from "@/schemas/modules";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 30;

export const listUsers = (ctx: Ctx) => prisma.user.findMany({ where: { organizationId: ctx.org.id }, orderBy: { createdAt: "asc" }, include: { role: { select: { id: true, name: true, code: true } } } });
export const listRoles = (ctx: Ctx) => prisma.role.findMany({ where: { organizationId: ctx.org.id }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } });

export type PlanTier = {
  code: "STARTER" | "PROFESSIONAL" | "BUSINESS";
  name: string;
  nameAr: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxMembers: number | null;
  rank: number;
  badge?: string;
  badgeAr?: string;
  features: string[];
  featuresAr: string[];
};

export const PLANS_CATALOG: PlanTier[] = [
  {
    code: "STARTER",
    name: "Starter",
    nameAr: "البداية",
    priceMonthly: Math.round(1990 / 12),
    priceYearly: 1990,
    maxUsers: 3,
    maxMembers: 50,
    rank: 1,
    features: [
      "Jusqu'à 3 utilisateurs actifs",
      "Jusqu'à 50 membres & adhérents",
      "Gestion des parts sociales & cotisations",
      "Gestion des stocks, articles & lots",
      "Ventes, commandes & facturation simple",
      "Traçabilité publique & QR Code produit",
      "Export des données (Excel / CSV)",
      "Support d'assistance par e-mail",
    ],
    featuresAr: [
      "حتى 3 مستخدمين نشطين",
      "حتى 50 منخرطاً وعضواً",
      "إدارة الحصص الاجتماعية والمساهمات",
      "إدارة المخزون، المواد والدفعات",
      "المبيعات، الطلبيات والفوترة الأساسية",
      "التتبع العام ورمز QR للمنتجات",
      "تصدير البيانات (Excel / CSV)",
      "دعم فني عبر البريد الإلكتروني",
    ],
  },
  {
    code: "PROFESSIONAL",
    name: "Professionnel",
    nameAr: "الاحترافي",
    priceMonthly: Math.round(3990 / 12),
    priceYearly: 3990,
    maxUsers: 10,
    maxMembers: 300,
    rank: 2,
    badge: "Recommandé",
    badgeAr: "الأكثر طلباً",
    features: [
      "Jusqu'à 10 utilisateurs actifs",
      "Jusqu'à 300 membres & adhérents",
      "Toutes les fonctionnalités Starter incluses",
      "Notifications & Rappels clients WhatsApp",
      "Gestion de la production & transformation",
      "Multi-ateliers et multi-dépôts de stock",
      "Factures conformes DGI & Gestion des avoirs",
      "Rapports financiers & Tableaux de bord avancés",
      "Support prioritaire Téléphone & WhatsApp 6j/7",
    ],
    featuresAr: [
      "حتى 10 مستخدمين نشطين",
      "حتى 300 منخرط وعضو",
      "جميع ميزات خطة البداية مضمنة",
      "إشعارات وتذكيرات للزبائن عبر WhatsApp",
      "إدارة دورات الإنتاج والتحويل الغذائي/الحرفي",
      "إدارة متعددة للورش ومستودعات التخزين",
      "فواتير مطابقة لمعايير DGI وإدارة فواتير الإرجاع",
      "تقارير مالية ولوحات قيادة تفصيلية",
      "دعم هاتفي وواتساب ذو أولوية 6 أيام في الأسبوع",
    ],
  },
  {
    code: "BUSINESS",
    name: "Entreprise",
    nameAr: "المؤسسات",
    priceMonthly: Math.round(5990 / 12),
    priceYearly: 5990,
    maxUsers: 50,
    maxMembers: null, // illimité
    rank: 3,
    badge: "Complet",
    badgeAr: "شامل",
    features: [
      "Jusqu'à 50 utilisateurs avec rôles avancés",
      "Membres & adhérents illimités",
      "Toutes les fonctionnalités Professionnel incluses",
      "Automatisations & alertes intelligentes",
      "Rapprochement bancaire & multi-devises",
      "Exports comptables personnalisés (Sage, FEC, CIH)",
      "Accompagnement dédié & formation sur site",
      "Support VIP 7j/7 avec gestionnaire de compte dédié",
    ],
    featuresAr: [
      "حتى 50 مستخدماً مع صلاحيات وأدوار متقدمة",
      "عدد غير محدود من المنخرطين والأعضاء",
      "جميع ميزات الخطة الاحترافية مضمنة",
      "أتمتة ذكية للمهام والتنبيهات الاستباقية",
      "مطابقة بنكية ومعاملات متعددة العملات",
      "تصدير محاسبي مهيأ للبرامج المعتمدة (Sage, CIH)",
      "مرافقة خاصة وتدريب ميداني لأعضاء التعاونية",
      "دعم VIP طوال أيام الأسبوع مع مستشار خاص",
    ],
  },
];

export async function subscriptionInfo(ctx: Ctx) {
  let sub = null;
  let users = 1;
  let members = 0;
  try {
    const [dbSub, uCount, mCount] = await Promise.all([
      prisma.subscription.findUnique({ where: { organizationId: ctx.org.id }, include: { plan: true } }),
      prisma.user.count({ where: { organizationId: ctx.org.id, status: { not: "DISABLED" } } }),
      ctx.db.member.count({ where: { deletedAt: null } }),
    ]);
    sub = dbSub;
    users = uCount;
    members = mCount;
  } catch (e) {
    console.error("[subscriptionInfo] DB query error", e);
  }

  // Si pas de plan en DB ou fallback, on propose le starter
  const currentPlanCode = (sub?.plan?.code ?? "STARTER") as "STARTER" | "PROFESSIONAL" | "BUSINESS";
  const daysRemaining = sub?.status === "TRIALING" && sub.trialEndsAt
    ? Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / 864e5)
    : null;
  const isTrialEnded = sub?.status === "TRIALING" && daysRemaining !== null && daysRemaining <= 0;
  const isExpired = sub ? ["EXPIRED", "CANCELLED", "PAST_DUE"].includes(sub.status) || isTrialEnded : false;

  return {
    sub,
    users,
    members,
    plans: PLANS_CATALOG,
    currentPlanCode,
    daysRemaining,
    isExpired,
  };
}

/** Invite un collaborateur : e-mail Supabase + fiche utilisateur rattachée à CETTE coopérative, dans la limite du plan. */
export async function inviteUser(ctx: Ctx, i: z.infer<typeof inviteSchema>, locale: string, site: string) {
  const { sub, users } = await subscriptionInfo(ctx);
  if (sub && users >= sub.plan.maxUsers) throw new DomainError("planLimit");
  if (!(await prisma.role.findFirst({ where: { id: i.roleId, organizationId: ctx.org.id } }))) throw new DomainError("roleNotFound");
  if (await prisma.user.findUnique({ where: { email: i.email } })) throw new DomainError("emailTaken");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new DomainError("inviteUnavailable");
  const admin = createClient(url, key, { auth: { persistSession: false } }).auth.admin;
  const { data, error } = await admin.inviteUserByEmail(i.email, { data: { full_name: i.fullName }, redirectTo: `${site}/auth/callback?next=/${locale}/reset-password` });
  if (error || !data.user) throw new DomainError("inviteFailed");
  try {
    await prisma.user.create({ data: { authId: data.user.id, email: i.email, fullName: i.fullName, organizationId: ctx.org.id, roleId: i.roleId, status: "ACTIVE" } });
  } catch (e) { await admin.deleteUser(data.user.id); throw e; } // pas de compte orphelin
  await audit(ctx, "CREATE", "user", data.user.id, { email: i.email });
}

async function target(ctx: Ctx, userId: string) {
  const u = await prisma.user.findFirst({ where: { id: userId, organizationId: ctx.org.id }, include: { role: true } }); // jamais un utilisateur d'une autre coopérative
  if (!u) throw new DomainError("userNotFound");
  return u;
}
const activeAdmins = (ctx: Ctx) => prisma.user.count({ where: { organizationId: ctx.org.id, status: "ACTIVE", role: { code: "ADMIN" } } });

export async function setUserRole(ctx: Ctx, userId: string, roleId: string) {
  const u = await target(ctx, userId);
  const role = await prisma.role.findFirst({ where: { id: roleId, organizationId: ctx.org.id } });
  if (!role) throw new DomainError("roleNotFound");
  if (u.role?.code === "ADMIN" && role.code !== "ADMIN" && (await activeAdmins(ctx)) <= 1) throw new DomainError("lastAdmin");
  await prisma.user.update({ where: { id: u.id }, data: { roleId } });
  await audit(ctx, "UPDATE", "user", u.id, { role: role.name });
}

export async function setUserStatus(ctx: Ctx, userId: string, status: UserStatus) {
  const u = await target(ctx, userId);
  if (u.id === ctx.user.id) throw new DomainError("selfAction");
  if (status === "DISABLED" && u.role?.code === "ADMIN" && (await activeAdmins(ctx)) <= 1) throw new DomainError("lastAdmin");
  await prisma.user.update({ where: { id: u.id }, data: { status } });
  await audit(ctx, "UPDATE", "user", u.id, { status });
}

export async function updateOrganization(ctx: Ctx, d: z.infer<typeof orgSchema>) {
  await prisma.organization.update({ where: { id: ctx.org.id }, data: { name: d.name, type: d.type, sector: d.sector, foundedAt: d.foundedAt ? new Date(d.foundedAt) : null,
    address: d.address ?? null, city: d.city ?? null, region: d.region ?? null, phone: d.phone ?? null, ice: d.ice ?? null, taxId: d.taxId ?? null, registrationNumber: d.registrationNumber ?? null, description: d.description ?? null } });
  await audit(ctx, "UPDATE", "organization", ctx.org.id);
}
export async function updateBilling(ctx: Ctx, d: z.infer<typeof billingSchema>) {
  await prisma.organization.update({ where: { id: ctx.org.id }, data: { invoicePrefix: d.invoicePrefix, orderPrefix: d.orderPrefix, defaultVatRate: d.defaultVatRate } });
  await audit(ctx, "UPDATE", "organization", ctx.org.id, d);
}

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT", "PAYMENT", "STOCK_CHANGE", "INVOICE_VALIDATED"] as const;
export type AuditFilters = { userId?: string; action?: (typeof AUDIT_ACTIONS)[number]; entity?: string; from?: string; to?: string };

/** Filtres validés : on n'accepte que des valeurs au bon format, jamais du texte libre dans la requête. */
export function parseAuditFilters(sp: Record<string, string | undefined>): AuditFilters {
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined);
  return {
    userId: sp.user && /^[0-9a-f-]{36}$/i.test(sp.user) ? sp.user : undefined,
    action: AUDIT_ACTIONS.find((a) => a === sp.action),
    entity: sp.entity && /^[\w.-]{1,60}$/.test(sp.entity) ? sp.entity : undefined,
    from: date(sp.from), to: date(sp.to),
  };
}
const auditWhere = (f: AuditFilters) => ({
  ...(f.userId ? { userId: f.userId } : {}), ...(f.action ? { action: f.action } : {}), ...(f.entity ? { entityType: f.entity } : {}),
  ...(f.from || f.to ? { createdAt: { ...(f.from ? { gte: new Date(`${f.from}T00:00:00`) } : {}), ...(f.to ? { lt: new Date(new Date(`${f.to}T00:00:00`).getTime() + 864e5) } : {}) } } : {}),
});

export async function listAudit(ctx: Ctx, f: AuditFilters, page: number) {
  const p = Math.max(1, page), where = auditWhere(f);
  const [items, count, users, entities] = await Promise.all([
    ctx.db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (p - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { user: { select: { fullName: true } } } }),
    ctx.db.auditLog.count({ where }),
    prisma.user.findMany({ where: { organizationId: ctx.org.id }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
    ctx.db.auditLog.groupBy({ by: ["entityType"], orderBy: { entityType: "asc" } }),
  ]);
  return { items, count, users, entities: entities.map((e) => e.entityType), page: p, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}
export const auditExportRows = (ctx: Ctx, f: AuditFilters) => ctx.db.auditLog.findMany({ where: auditWhere(f), orderBy: { createdAt: "desc" }, take: 5000, include: { user: { select: { fullName: true } } } });
