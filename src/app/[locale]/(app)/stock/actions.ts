"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { movementSchema } from "@/schemas/stock";
import { createInventory, manualMovement, saveCounts, validateInventory } from "@/services/stock-ops";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };
const refresh = () => revalidatePath("/[locale]", "layout");

export async function saveMovement(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("stock:write");
  const parsed = movementSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  try { await manualMovement(ctx, parsed.data); }
  catch (e) {
    if (e instanceof DomainError) return { error: e.code };
    console.error("[stock] movement failed", e);
    return { error: "generic" };
  }
  refresh();
  redirect({ href: "/stock/movements", locale: await getLocale() });
  return {}; // inatteignable : redirect() interrompt l'exécution
}

export async function startInventory() {
  const ctx = await requirePermission("stock:write");
  const inv = await createInventory(ctx);
  refresh();
  redirect({ href: `/stock/inventories/${inv.id}`, locale: await getLocale() });
}

export async function saveInventoryCounts(id: string, form: FormData) {
  const ctx = await requirePermission("stock:write");
  const entries = [...form.entries()].filter(([k]) => k.startsWith("qty_")).map(([k, v]) => [k.slice(4), String(v).trim()] as [string, string]);
  await saveCounts(ctx, id, entries);
  revalidatePath("/[locale]/stock", "layout");
}

export async function validateInventoryAction(id: string) {
  const ctx = await requirePermission("stock:validate");
  await validateInventory(ctx, id);
  refresh();
  redirect({ href: `/stock/inventories/${id}`, locale: await getLocale() });
}
