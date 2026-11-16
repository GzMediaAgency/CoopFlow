"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { contributionPaymentSchema, contributionSchema } from "@/schemas/modules";
import { createContribution, payContribution } from "@/services/contributions";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

export async function saveContribution(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("contributions:write");
  const parsed = contributionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  let id: string;
  try { id = (await createContribution(ctx, parsed.data)).id; }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[contributions] create failed", e); return { error: "generic" }; }
  revalidatePath("/[locale]", "layout");
  redirect({ href: `/contributions/${id}`, locale: await getLocale() });
  return {};
}

export async function payContributionAction(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("contributions:write");
  const parsed = contributionPaymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  try { await payContribution(ctx, id, parsed.data); }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[contributions] pay failed", e); return { error: "generic" }; }
  revalidatePath("/[locale]", "layout");
  redirect({ href: `/contributions/${id}`, locale: await getLocale() });
  return {};
}
