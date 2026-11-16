"use client";
import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, LogOut, Menu, Search, Sprout, X } from "lucide-react";
import { logout } from "@/lib/auth/logout";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { GROUPS, NAV } from "@/config/nav";
import { GlobalSearchDialog } from "./global-search-dialog";

type Props = { children: ReactNode; allowed: string[]; orgName: string; userName: string };

export function AppShell({ children, allowed, orgName, userName }: Props) {
  const t = useTranslations();
  const pathname = usePathname(), locale = useLocale(), router = useRouter();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => allowed.includes(n.key));
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const initials = userName.split(" ").map((w) => w[0]).slice(0, 2).join("");

  const NavList = ({ onPick }: { onPick?: () => void }) => (
    <nav className="space-y-5" aria-label="Navigation principale">
      {GROUPS.map((g) => {
        const list = items.filter((n) => n.group === g);
        if (!list.length) return null;
        return (
          <div key={g}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{t(`nav.groups.${g}`)}</p>
            <ul className="space-y-0.5">{list.map(({ key, href, icon: Icon, ready }) => {
              const on = active(href);
              const base = "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14.5px] transition-colors";
              return (
                <li key={key}>
                  {ready ? (
                    <Link href={href} onClick={onPick} aria-current={on ? "page" : undefined}
                      className={`${base} ${on ? "bg-white/12 font-semibold text-white" : "text-white/70 hover:bg-white/8 hover:text-white"}`}>
                      {on && <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-argan" aria-hidden />}
                      <Icon size={18} aria-hidden className={on ? "text-argan" : ""} /> {t(`nav.${key}`)}
                    </Link>
                  ) : (
                    <span aria-disabled className={`${base} cursor-not-allowed text-white/35`}>
                      <Icon size={18} aria-hidden /> {t(`nav.${key}`)}
                      <span className="ms-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/50">{t("nav.soon")}</span>
                    </span>
                  )}
                </li>
              );
            })}</ul>
          </div>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <div className="mb-6 flex items-center gap-3 px-3">
      <span className="grid size-9 place-items-center rounded-xl bg-argan text-forest"><Sprout size={20} aria-hidden /></span>
      <span className="font-display text-xl font-bold !text-white text-white" style={{ color: "#ffffff" }}>{t("brand.name")}</span>
    </div>
  );

  return (
    <div data-shell className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto bg-gradient-to-br from-forest via-forest-2 to-olive p-4 lg:flex">
        <Brand />
        <div className="flex-1"><NavList /></div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/8 p-3">
          <span className="grid size-9 place-items-center rounded-full bg-argan text-sm font-bold text-forest" aria-hidden>{initials}</span>
          <div className="min-w-0 flex-1 text-sm"><p className="truncate font-medium text-white">{userName}</p><p className="truncate text-white/55">{orgName}</p></div>
          <form action={logout}><button aria-label={t("nav.logout")} title={t("nav.logout")} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"><LogOut size={18} /></button></form>
        </div>
      </aside>

      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur-md lg:px-8">
          <GlobalSearchDialog />
          <select aria-label={t("topbar.language")} value={locale} onChange={(e) => router.replace(pathname, { locale: e.target.value })}
            className="rounded-full border border-line bg-white px-3 py-2 text-sm">
            <option value="fr">Français</option><option value="ar">العربية</option>
          </select>
          <button aria-label={t("topbar.notifications")} className="relative rounded-full border border-line bg-white p-2.5 hover:bg-canopy-soft">
            <Bell size={18} /><span className="absolute end-2 top-2 size-2 rounded-full bg-clay" aria-hidden />
          </button>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.filter((n) => (MOBILE as readonly string[]).includes(n.key) && allowed.includes(n.key)).map(({ key, href, icon: Icon }) => (
          <Link key={key} href={href} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${active(href) ? "font-semibold text-canopy" : "text-ink-muted"}`}>
            <Icon size={21} aria-hidden />{key === "dashboard" ? t("nav.home") : t(`nav.${key}`)}
          </Link>
        ))}
        <button onClick={() => setOpen(true)} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs text-ink-muted"><Menu size={21} aria-hidden />{t("nav.menu")}</button>
      </nav>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-y-0 end-0 w-72 overflow-y-auto bg-gradient-to-br from-forest via-forest-2 to-olive p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex justify-end"><button aria-label="Fermer" onClick={() => setOpen(false)} className="rounded-lg p-2 text-white"><X size={20} /></button></div>
            <Brand /><NavList onPick={() => setOpen(false)} />
            <form action={logout} className="mt-6"><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-white/70 hover:bg-white/10"><LogOut size={18} aria-hidden />{t("nav.logout")}</button></form>
          </div>
        </div>
      )}
    </div>
  );
}
const MOBILE = ["dashboard", "members"];
