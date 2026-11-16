"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { paymentSchema } from "@/schemas/payment";
import { addPayment } from "@/services/payments";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

export async function savePayment(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("payments:write");
  const parsed = paymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try { await addPayment(ctx, { invoiceId: d.invoiceId, amount: d.amount, method: d.method, paidAt: new Date(d.paidAt), reference: d.reference, note: d.note }); }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[payments] failed", e); return { error: "generic" }; }
  revalidatePath("/[locale]", "layout");
  redirect({ href: `/invoices/${d.invoiceId}`, locale: await getLocale() });
  return {}; // inatteignable : redirect() interrompt l'exécution
}
