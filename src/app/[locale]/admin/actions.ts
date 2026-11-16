"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { OrgStatus, PlanCode } from "@prisma/client";
import { redirect } from "@/i18n/routing";
import { requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";
import { planSchema, subscriptionSchema } from "@/schemas/modules";
import { changeSubscription, setOrgStatus, setUserStatusAdmin, updatePlan } from "@/services/admin";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };
const refresh = () => revalidatePath("/[locale]/admin", "layout");
const log = (adminId: string, orgId: string | null, entity: string, entityId: string, changes: object) =>
  prisma.auditLog.create({ data: { organizationId: orgId, userId: adminId, action: "UPDATE", entityType: entity, entityId, changes } });

export async function setOrgStatusAction(id: string, status: OrgStatus) {
  const { user } = await requireSuperAdmin();
  if (status !== "ACTIVE" && status !== "SUSPENDED") return;
  await setOrgStatus(id, status);
  await log(user.id, id, "platform_org_status", id, { status });
  refresh(); redirect({ href: `/admin/organizations/${id}`, locale: await getLocale() });
}

export async function changeSubscriptionAction(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireSuperAdmin();
  const parsed = subscriptionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  try { await changeSubscription(orgId, parsed.data); await log(user.id, orgId, "platform_subscription", orgId, parsed.data); }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[admin] subscription failed", e); return { error: "generic" }; }
  refresh(); redirect({ href: `/admin/organizations/${orgId}`, locale: await getLocale() }); return {};
}

export async function updatePlanAction(code: PlanCode, _prev: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireSuperAdmin();
  const parsed = planSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  try { await updatePlan(code, parsed.data); await log(user.id, null, "platform_plan", code, parsed.data); }
  catch (e) { console.error("[admin] plan failed", e); return { error: "generic" }; }
  refresh(); redirect({ href: "/admin/plans", locale: await getLocale() }); return {};
}

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "DISABLED") {
  const { user } = await requireSuperAdmin();
  try { await setUserStatusAdmin(userId, status); await log(user.id, null, "platform_user_status", userId, { status }); } catch (e) { console.error("[admin] user status failed", e); }
  refresh(); redirect({ href: "/admin/users", locale: await getLocale() });
}
