"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { memberSchema } from "@/schemas/member";
import { archiveMember, createMember, updateMember } from "@/services/members";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

export async function saveMember(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("members:write"); // revérifié côté serveur à chaque appel
  const parsed = memberSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  let memberId: string;
  try {
    memberId = (id ? await updateMember(ctx, id, parsed.data) : await createMember(ctx, parsed.data)).id;
  } catch (e) {
    console.error("[members] save failed", e); // log technique côté serveur uniquement
    return { error: "generic" };
  }
  revalidatePath("/[locale]/members", "layout");
  redirect({ href: `/members/${memberId}`, locale: await getLocale() });
  return {}; // inatteignable : redirect() interrompt l'exécution
}

export async function archive(id: string) {
  const ctx = await requirePermission("members:delete");
  await archiveMember(ctx, id);
  revalidatePath("/[locale]/members", "layout");
  redirect({ href: "/members", locale: await getLocale() });
}
