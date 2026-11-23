"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { UserStatus } from "@prisma/client";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { billingSchema, inviteSchema, orgSchema } from "@/schemas/modules";
import { deleteUser, inviteUser, setUserRole, setUserStatus, updateBilling, updateOrganization } from "@/services/settings";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };
const refresh = () => revalidatePath("/[locale]", "layout");

export async function saveOrg(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("settings:write");
  const parsed = orgSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  try { await updateOrganization(ctx, parsed.data); } catch (e) { console.error("[settings] org failed", e); return { error: "generic" }; }
  refresh(); redirect({ href: "/settings", locale: await getLocale() }); return {};
}

export async function saveBilling(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("settings:write");
  const parsed = billingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  try { await updateBilling(ctx, parsed.data); } catch (e) { console.error("[settings] billing failed", e); return { error: "generic" }; }
  refresh(); redirect({ href: "/settings/billing", locale: await getLocale() }); return {};
}

export async function inviteUserAction(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("settings:write");
  const parsed = inviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const locale = await getLocale(), h = await headers();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`).replace(/\/$/, "");
  try { await inviteUser(ctx, parsed.data, locale, site); }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[settings] invite failed", e); return { error: "generic" }; }
  refresh(); redirect({ href: "/settings/users", locale }); return {};
}

async function back(error?: string) { redirect({ href: error ? `/settings/users?error=${error}` : "/settings/users", locale: await getLocale() }); }

export async function changeRole(userId: string, form: FormData) {
  const ctx = await requirePermission("settings:write");
  let error = "";
  try { await setUserRole(ctx, userId, String(form.get("roleId"))); } catch (e) { error = e instanceof DomainError ? e.code : "generic"; }
  refresh(); await back(error);
}
export async function changeStatus(userId: string, status: UserStatus) {
  const ctx = await requirePermission("settings:write");
  if (status !== "ACTIVE" && status !== "DISABLED") return;
  let error = "";
  try { await setUserStatus(ctx, userId, status); } catch (e) { error = e instanceof DomainError ? e.code : "generic"; }
  refresh(); await back(error);
}

export async function deleteUserAction(userId: string) {
  const ctx = await requirePermission("settings:write");
  let error = "";
  try { await deleteUser(ctx, userId); } catch (e) { error = e instanceof DomainError ? e.code : "generic"; }
  refresh(); await back(error);
}
