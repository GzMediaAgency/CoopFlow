"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { saleSchema } from "@/schemas/sales";
import { createSale } from "@/services/sales";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

export async function saveSale(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("sales:write");
  const parsed = saleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  let invoiceId: string;
  try { invoiceId = (await createSale(ctx, parsed.data)).invoice.id; }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[sales] create failed", e); return { error: "generic" }; }
  revalidatePath("/[locale]", "layout");
  redirect({ href: `/invoices/${invoiceId}`, locale: await getLocale() });
  return {}; // inatteignable : redirect() interrompt l'exécution
}
