import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

type Props = { pathname: string; query: Record<string, string | undefined>; page: number; pages: number };

export async function Pagination({ pathname, query, page, pages }: Props) {
  const t = await getTranslations("common");
  if (pages <= 1) return null;
  const href = (p: number) => ({ pathname, query: Object.fromEntries(Object.entries({ ...query, page: String(p) }).filter(([, v]) => v)) });
  const cls = "rounded-lg border border-line bg-white px-3 py-2 text-sm";
  return (
    <nav className="mt-4 flex items-center justify-between" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)} className={cls}>{t("prev")}</Link> : <span />}
      <span className="text-sm text-ink-muted">{t("pageOf", { page, pages })}</span>
      {page < pages ? <Link href={href(page + 1)} className={cls}>{t("next")}</Link> : <span />}
    </nav>
  );
}
