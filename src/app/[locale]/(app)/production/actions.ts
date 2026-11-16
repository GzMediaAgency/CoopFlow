"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { productionSchema } from "@/schemas/production";
import { createProduction } from "@/services/production";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

export async function saveProduction(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("production:write");
  const parsed = productionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  let id: string;
  try {
    id = (await createProduction(ctx, parsed.data)).id;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { errors: { batchNumber: ["batchTaken"] } };
    if (e instanceof DomainError) return { error: e.code };
    console.error("[production] save failed", e);
    return { error: "generic" };
  }
  revalidatePath("/[locale]", "layout"); // stock, produits et tableau de bord changent
  redirect({ href: `/production/${id}`, locale: await getLocale() });
  return {}; // inatteignable : redirect() interrompt l'exécution
}
