"use server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { prisma } from "@/lib/db/tenant";
import { supabaseServer } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await supabaseServer();
  try {
    const { data } = await supabase.auth.getUser();
    const u = data.user ? await prisma.user.findUnique({ where: { authId: data.user.id } }) : null;
    if (u?.organizationId) await prisma.auditLog.create({ data: { organizationId: u.organizationId, userId: u.id, action: "LOGOUT", entityType: "session" } });
  } catch (e) { console.error("[logout] audit failed", e); }
  await supabase.auth.signOut();
  redirect({ href: "/login", locale: await getLocale() });
}
