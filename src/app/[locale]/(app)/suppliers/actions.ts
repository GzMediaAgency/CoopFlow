"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { contributionPaymentSchema, supplierSchema } from "@/schemas/modules";
import { archiveSupplier, createSupplier, paySupplier, updateSupplier } from "@/services/suppliers";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

export async function saveSupplier(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("suppliers:write");
  const parsed = supplierSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  let sid: string;
  try { sid = (id ? await updateSupplier(ctx, id, parsed.data) : await createSupplier(ctx, parsed.data)).id; }
  catch (e) { console.error("[suppliers] save failed", e); return { error: "generic" }; }
  revalidatePath("/[locale]", "layout");
  redirect({ href: `/suppliers/${sid}`, locale: await getLocale() });
  return {};
}

export async function archive(id: string) {
  const ctx = await requirePermission("suppliers:delete");
  await archiveSupplier(ctx, id);
  revalidatePath("/[locale]", "layout");
  redirect({ href: "/suppliers", locale: await getLocale() });
}

export async function paySupplierAction(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("suppliers:write");
  const parsed = contributionPaymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  try { await paySupplier(ctx, id, parsed.data); }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[suppliers] pay failed", e); return { error: "generic" }; }
  revalidatePath("/[locale]", "layout");
  redirect({ href: `/suppliers/${id}`, locale: await getLocale() });
  return {};
}
