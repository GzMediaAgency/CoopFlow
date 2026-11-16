"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { documentMetaSchema } from "@/schemas/modules";
import { deleteDocument, uploadDocument } from "@/services/documents";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

export async function uploadAction(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("documents:write");
  const parsed = documentMetaSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const file = form.get("file");
  if (!(file instanceof File)) return { error: "fileRequired" };
  try { await uploadDocument(ctx, file, parsed.data); }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[documents] upload failed", e); return { error: "generic" }; }
  revalidatePath("/[locale]/documents", "layout");
  redirect({ href: "/documents", locale: await getLocale() });
  return {};
}

export async function removeDocument(id: string) {
  const ctx = await requirePermission("documents:delete");
  try { await deleteDocument(ctx, id); } catch (e) { console.error("[documents] delete failed", e); }
  revalidatePath("/[locale]/documents", "layout");
  redirect({ href: "/documents", locale: await getLocale() });
}
