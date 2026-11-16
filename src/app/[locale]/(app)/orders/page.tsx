import { ClipboardList, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { OrderStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { FLOW, listOrders } from "@/services/orders";
import { Link } from "@/i18n/routing";
import { DataList } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Pill, orderTone, payTone } from "@/components/ui/pill";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams, t = await getTranslations("orders"), to = await getTranslations("orderStatus"), tp = await getTranslations("paymentState"), locale = await getLocale();
  const ctx = await requirePermission("orders:read");
  const q = sp.q?.trim().slice(0, 80) || undefined, status = (Object.keys(FLOW) as OrderStatus[]).find((s) => s === sp.status);
  const { items, count, hasAny, page, pages } = await listOrders(ctx, { q, status, page: Number(sp.page) || 1 });
  const canWrite = ctx.permissions.has("orders:write");

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1>
        {canWrite && <Link href="/orders/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("add")}</Link>}</div>
      {!hasAny ? <EmptyState icon={ClipboardList} title={t("empty.title")} text={t("empty.text")}>{canWrite && <Link href="/orders/new" className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("empty.cta")}</Link>}</EmptyState> : (
        <>
          <form className="mb-4 flex flex-wrap gap-2" role="search">
            <input name="q" defaultValue={q} type="search" placeholder={t("search")} aria-label={t("search")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
            <select name="status" defaultValue={status ?? ""} aria-label={t("status")} className="rounded-lg border border-line bg-white p-2.5 text-sm"><option value="">{t("allStatuses")}</option>{(Object.keys(FLOW) as OrderStatus[]).map((s) => <option key={s} value={s}>{to(s)}</option>)}</select>
            <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>
            {(q || status) && <Link href="/orders" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
          </form>
          {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p> : (
            <>
              <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
              <DataList columns={[t("cols.number"), t("cols.customer"), t("cols.date"), t("cols.status"), t("cols.payment"), t("cols.total")]}
                rows={items.map((o) => ({ id: o.id, href: `/orders/${o.id}`, title: o.number, subtitle: `${o.customer.name} · ${dateFmt(o.orderedAt, locale)}`, right: money(o.total, locale),
                  cells: [o.number, o.customer.name, dateFmt(o.orderedAt, locale), <Pill key="s" tone={orderTone(o.status)}>{to(o.status)}</Pill>, <Pill key="p" tone={payTone(o.paymentState)}>{tp(o.paymentState)}</Pill>, <b key="t">{money(o.total, locale)}</b>] }))} />
              <Pagination pathname="/orders" query={{ q, status }} page={page} pages={pages} />
            </>)}
        </>)}
    </>
  );
}
