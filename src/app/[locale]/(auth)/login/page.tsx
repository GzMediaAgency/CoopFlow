import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/ui/auth-card";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/db/tenant";
import { supabaseServer } from "@/lib/supabase/server";
import { LoginError } from "./login-error";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; registered?: string }> }) {
  const t = await getTranslations("auth");
  const { error, registered } = await searchParams;

  async function signIn(form: FormData) {
    "use server";
    const supabase = await supabaseServer();
    const res = await supabase.auth.signInWithPassword({ email: String(form.get("email")).trim().toLowerCase(), password: String(form.get("password")) });
    if (!res.error && res.data.user) { // trace de connexion : ne bloque jamais l'accès en cas de problème
      try {
        const u = await prisma.user.findUnique({ where: { authId: res.data.user.id } });
        if (u) { await prisma.user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
          if (u.organizationId) await prisma.auditLog.create({ data: { organizationId: u.organizationId, userId: u.id, action: "LOGIN", entityType: "session" } }); }
      } catch (e) { console.error("[login] audit failed", e); }
    }
    redirect(res.error ? "?error=1" : "/");
  }

  return (
    <AuthCard title={t("login")} subtitle={t("loginIntro")}>
      {registered && <p role="status" className="rounded-lg bg-canopy-soft p-3 text-sm text-canopy">{t("checkEmail")}</p>}
      <LoginError
        error={error}
        invalidMsg={t("invalid")}
        expiredMsg={t("resetExpired")}
        forgotMsg={t("forgotIntro")}
      />
      <form action={signIn} className="grid gap-3">
        <label className="grid gap-1 text-sm font-medium">{t("email")}<input name="email" type="email" required autoComplete="email" className="rounded-lg border border-line bg-white p-3" /></label>
        <label className="grid gap-1 text-sm font-medium">{t("password")}<input name="password" type="password" required autoComplete="current-password" className="rounded-lg border border-line bg-white p-3" /></label>
        <button className="rounded-lg bg-canopy p-3 font-semibold text-white">{t("login")}</button>
      </form>
      <div className="flex flex-wrap justify-between gap-2 text-sm"><Link href="/forgot-password" className="text-canopy hover:underline">{t("forgot")}</Link><Link href="/register" className="font-medium text-canopy hover:underline">{t("noAccount")}</Link></div>
    </AuthCard>
  );
}
