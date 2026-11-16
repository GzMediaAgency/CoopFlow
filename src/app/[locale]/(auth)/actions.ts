"use server";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/tenant";
import { supabaseServer } from "@/lib/supabase/server";
import { forgotSchema, onboardingSchema, registerSchema, resetSchema } from "@/schemas/auth";
import { createCooperative } from "@/services/tenant-bootstrap";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

export async function register(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data, locale = (await getLocale()) as "fr" | "ar";
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({ email: d.email, password: d.password,
    options: { data: { full_name: d.fullName }, emailRedirectTo: `${await siteUrl()}/auth/callback?next=/${locale}/onboarding` } });
  if (error) return { error: /registered|exists/i.test(error.message) ? "emailTaken" : "authFailed" };
  if (!data.user || data.user.identities?.length === 0) return { error: "emailTaken" }; // Supabase masque les comptes existants
  try {
    await createCooperative({ authId: data.user.id, email: d.email, fullName: d.fullName, orgName: d.orgName, locale });
  } catch (e) {
    console.error("[register] bootstrap failed", e);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) await createClient(url, key, { auth: { persistSession: false } }).auth.admin.deleteUser(data.user.id); // pas de compte orphelin
    return { error: (e as { code?: string }).code === "P2002" ? "emailTaken" : "generic" };
  }
  redirect({ href: data.session ? "/onboarding" : "/login?registered=1", locale });
  return {};
}

export async function forgotPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const locale = await getLocale();
  // Réponse identique que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites.
  await (await supabaseServer()).auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${await siteUrl()}/auth/callback?next=/${locale}/reset-password` });
  redirect({ href: "/forgot-password?sent=1", locale });
  return {};
}

export async function resetPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const { error } = await (await supabaseServer()).auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "resetFailed" };
  redirect({ href: "/", locale: await getLocale() });
  return {};
}

export async function saveOnboarding(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireUser();
  if (!ctx.permissions.has("settings:write")) return { error: "forbidden" };
  const parsed = onboardingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await prisma.organization.update({ where: { id: ctx.org.id }, data: { // id issu de la session, jamais du formulaire
      type: d.type, sector: d.sector, foundedAt: d.foundedAt ? new Date(d.foundedAt) : null, address: d.address ?? null, city: d.city ?? null, region: d.region ?? null,
      phone: d.phone ?? null, ice: d.ice ?? null, taxId: d.taxId ?? null, registrationNumber: d.registrationNumber ?? null, description: d.description ?? null, onboardingStep: 6, onboardedAt: new Date() } });
    await audit(ctx, "UPDATE", "organization", ctx.org.id);
  } catch (e) { console.error("[onboarding] failed", e); return { error: "generic" }; }
  revalidatePath("/[locale]", "layout");
  redirect({ href: "/", locale: await getLocale() });
  return {};
}
