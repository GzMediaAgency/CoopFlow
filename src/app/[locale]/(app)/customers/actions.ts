"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { customerSchema } from "@/schemas/customer";
import { archiveCustomer, createCustomer, updateCustomer } from "@/services/customers";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

export async function saveCustomer(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("customers:write");
  const parsed = customerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  let customerId: string;
  try { customerId = (id ? await updateCustomer(ctx, id, parsed.data) : await createCustomer(ctx, parsed.data)).id; }
  catch (e) { console.error("[customers] save failed", e); return { error: "generic" }; }
  revalidatePath("/[locale]/customers", "layout");
  redirect({ href: `/customers/${customerId}`, locale: await getLocale() });
  return {}; // inatteignable : redirect() interrompt l'exécution
}

export async function archive(id: string) {
  const ctx = await requirePermission("customers:delete");
  await archiveCustomer(ctx, id);
  revalidatePath("/[locale]/customers", "layout");
  redirect({ href: "/customers", locale: await getLocale() });
}
