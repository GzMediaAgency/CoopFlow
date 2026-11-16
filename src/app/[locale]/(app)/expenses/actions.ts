"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { expenseSchema } from "@/schemas/expense";
import { archiveExpense, createExpense, updateExpense } from "@/services/expenses";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

export async function saveExpense(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("expenses:write");
  const parsed = expenseSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  try { if (id) await updateExpense(ctx, id, parsed.data); else await createExpense(ctx, parsed.data); }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[expenses] save failed", e); return { error: "generic" }; }
  revalidatePath("/[locale]", "layout");
  redirect({ href: "/expenses", locale: await getLocale() });
  return {}; // inatteignable : redirect() interrompt l'exécution
}

export async function archive(id: string) {
  const ctx = await requirePermission("expenses:delete");
  await archiveExpense(ctx, id);
  revalidatePath("/[locale]", "layout");
  redirect({ href: "/expenses", locale: await getLocale() });
}
