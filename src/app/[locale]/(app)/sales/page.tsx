import { Plus, ShoppingCart } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { listSales } from "@/services/sales";
import { Link } from "@/i18n/routing";
import { DataList } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Pill, payTone } from "@/components/ui/pill";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams, t = await getTranslations("sales"), tp = await getTranslations("paymentState"), locale = await getLocale();
  const ctx = await requirePermission("sales:read");
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const { items, count, page, pages } = await listSales(ctx, { q, page: Number(sp.page) || 1 });
  const canWrite = ctx.permissions.has("sales:write");

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1>
        {canWrite && <Link href="/sales/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("add")}</Link>}</div>
      {count === 0 && !q ? <EmptyState icon={ShoppingCart} title={t("empty.title")} text={t("empty.text")}>{canWrite && <Link href="/sales/new" className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("empty.cta")}</Link>}</EmptyState> : (
        <>
          <form className="mb-4 flex gap-2" role="search"><input name="q" defaultValue={q} type="search" placeholder={t("search")} aria-label={t("search")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
            <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>{q && <Link href="/sales" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}</form>
          {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p> : (
            <>
              <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
              <DataList columns={[t("cols.number"), t("cols.customer"), t("cols.date"), t("cols.payment"), t("cols.total")]}
                rows={items.map((s) => ({ id: s.id, href: s.invoices[0] ? `/invoices/${s.invoices[0].id}` : undefined, title: s.number, subtitle: `${s.customer?.name ?? "—"} · ${dateFmt(s.soldAt, locale)}`, right: money(s.total, locale),
                  cells: [s.number, s.customer?.name ?? "—", dateFmt(s.soldAt, locale), <Pill key="p" tone={payTone(s.paymentState)}>{tp(s.paymentState)}</Pill>, <b key="t">{money(s.total, locale)}</b>] }))} />
              <Pagination pathname="/sales" query={{ q }} page={page} pages={pages} />
            </>)}
        </>)}
    </>
  );
}
