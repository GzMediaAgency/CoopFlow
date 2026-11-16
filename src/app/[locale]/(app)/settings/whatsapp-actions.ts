"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db/tenant";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };

export async function saveWhatsappPrefs(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("settings:write");
  const parsed = z.object({ enabled: z.enum(["0", "1"]) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  await prisma.organization.update({ where: { id: ctx.org.id }, data: { whatsappEnabled: parsed.data.enabled === "1" } });
  revalidatePath("/[locale]", "layout");
  redirect({ href: "/settings/whatsapp", locale: await getLocale() });
  return {};
}
