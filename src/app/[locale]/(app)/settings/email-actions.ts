"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { EmailKind } from "@prisma/client";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";
import { EMAIL_KINDS, emailPrefsSchema, templateSchema } from "@/schemas/email";
import { asMailer, resetTemplate, saveTemplate, sendTest } from "@/services/email";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };
const kindOf = (k: string) => (EMAIL_KINDS as readonly string[]).includes(k) ? (k as EmailKind) : null;
const done = async (q = "") => { revalidatePath("/[locale]/settings", "layout"); redirect({ href: `/settings/email${q}`, locale: await getLocale() }); };

export async function savePrefs(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("settings:write");
  const parsed = emailPrefsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  await prisma.organization.update({ where: { id: ctx.org.id }, data: { emailAutoOrder: parsed.data.autoOrder === "1", emailAutoReminders: parsed.data.autoReminders === "1" } });
  await done(); return {};
}

export async function saveTemplateAction(kind: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("settings:write"), k = kindOf(kind);
  if (!k) return { error: "generic" };
  const parsed = templateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  await saveTemplate(asMailer(ctx), k, parsed.data);
  await done(); return {};
}

export async function resetTemplateAction(kind: string) {
  const ctx = await requirePermission("settings:write"), k = kindOf(kind);
  if (k) await resetTemplate(asMailer(ctx), k);
  await done();
}

/** Test : envoyé uniquement à l'adresse de l'utilisateur connecté (jamais à une adresse saisie). */
export async function sendTestAction() {
  const ctx = await requirePermission("settings:write");
  let q = "?test=1";
  try { await sendTest(asMailer(ctx), ctx.user.email); }
  catch (e) { q = `?error=${e instanceof DomainError ? e.code : "generic"}`; if (!(e instanceof DomainError)) console.error("[email] test failed", e); }
  await done(q);
}
