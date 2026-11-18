import { Sprout } from "lucide-react";
import { Link } from "@/i18n/routing";

type Props = {
  locale: string;
  currentPath: "/terms" | "/privacy";
};

export function PublicLegalHeader({ locale, currentPath }: Props) {
  const isAr = locale === "ar";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 px-4 py-3 backdrop-blur-md sm:px-8">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-forest text-argan">
            <Sprout size={18} aria-hidden />
          </span>
          <div className="leading-tight">
            <span className="block font-display text-lg font-bold text-forest">CoopFlow</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-deep">
              {isAr ? "منصة التعاونيات المغربية" : "Plateforme des Coopératives"}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Bascule de langue FR / AR */}
          <div className="flex rounded-lg border border-line bg-field p-0.5 text-xs font-medium">
            <Link
              href={currentPath}
              locale="fr"
              className={`rounded-md px-2.5 py-1 transition-colors ${
                locale === "fr" ? "bg-white font-bold text-forest shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              FR
            </Link>
            <Link
              href={currentPath}
              locale="ar"
              className={`rounded-md px-2.5 py-1 transition-colors ${
                locale === "ar" ? "bg-white font-bold text-forest shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              العربية
            </Link>
          </div>

          <Link
            href="/login"
            className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-canopy shadow-xs transition hover:bg-canopy-soft"
          >
            {isAr ? "تسجيل الدخول" : "Connexion"}
          </Link>
        </div>
      </div>
    </header>
  );
}

