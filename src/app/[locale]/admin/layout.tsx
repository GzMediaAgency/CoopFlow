import type { ReactNode } from "react";
import { Sprout, LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/lib/auth/session";
import { logout } from "@/lib/auth/logout";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSuperAdmin(); // contrôle d'accès revérifié à chaque affichage
  const t = await getTranslations("admin");
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between gap-3 bg-gradient-to-br from-forest via-forest-2 to-olive px-4 py-3 text-white lg:px-8">
        <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-argan text-forest"><Sprout size={20} aria-hidden /></span>
          <span className="font-display text-xl font-bold !text-white text-white" style={{ color: "#ffffff" }}>CoopFlow</span><span className="rounded bg-argan px-2 py-0.5 text-xs font-semibold text-forest">{t("badge")}</span></div>
        <div className="flex items-center gap-3 text-sm"><span className="hidden text-white/70 sm:inline">{user.email}</span>
          <form action={logout}><button aria-label={t("logout")} title={t("logout")} className="rounded-lg p-2 text-white/80 hover:bg-white/10"><LogOut size={18} /></button></form></div>
      </header>
      <main className="mx-auto max-w-6xl p-4 lg:p-8">{children}</main>
    </div>
  );
}
