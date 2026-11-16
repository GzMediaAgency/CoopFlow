import { HandCoins, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { listContributions, statusOf } from "@/services/contributions";
import { Link } from "@/i18n/routing";
import { DataList } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Pill, type Tone } from "@/components/ui/pill";

const TONE: Record<string, Tone> = { PAID: "green", LATE: "clay", PENDING: "gold" };
const FILTERS = ["late", "pending", "paid"] as const;

export default async function ContributionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams, t = await getTranslations("contributions"), ts = await getTranslations("contributions.status"), tt = await getTranslations("contributionType"), locale = await getLocale();
  const ctx = await requirePermission("contributions:read");
  const q = sp.q?.trim().slice(0, 80) || undefined, status = FILTERS.find((s) => s === sp.status);
  const { items, count, kpi, page, pages } = await listContributions(ctx, { q, status, page: Number(sp.page) || 1 });
  const canWrite = ctx.permissions.has("contributions:write"), empty = count === 0 && !q && !status;
  const kpis = [[t("kpi.due"), money(kpi.due, locale), ""], [t("kpi.paid"), money(kpi.paid, locale), "text-canopy"], [t("kpi.remaining"), money(kpi.remaining, locale), "text-clay"], [t("kpi.late"), String(kpi.late), kpi.late ? "text-clay" : ""]] as const;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1>
        {canWrite && <Link href="/contributions/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("add")}</Link>}</div>
      {empty ? <EmptyState icon={HandCoins} title={t("empty.title")} text={t("empty.text")}>{canWrite && <Link href="/contributions/new" className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("empty.cta")}</Link>}</EmptyState> : (
        <>
          <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(([l, v, c]) => <div key={l} className="card p-4"><dt className="text-sm text-ink-muted">{l}</dt><dd className={`font-display text-xl font-bold ${c}`}>{v}</dd></div>)}</dl>
          <form className="mb-4 flex flex-wrap gap-2" role="search">
            <input name="q" defaultValue={q} type="search" placeholder={t("search")} aria-label={t("search")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
            <select name="status" defaultValue={status ?? ""} aria-label={t("cols.status")} className="rounded-lg border border-line bg-white p-2.5 text-sm"><option value="">{t("allStatuses")}</option>{FILTERS.map((s) => <option key={s} value={s}>{ts(s.toUpperCase())}</option>)}</select>
            <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>
            {(q || status) && <Link href="/contributions" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
          </form>
          {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p> : (
            <>
              <DataList columns={[t("cols.member"), t("cols.type"), t("cols.due"), t("cols.amount"), t("cols.paid"), t("cols.status")]}
                rows={items.map((c) => { const s = statusOf(c), name = `${c.member.firstName} ${c.member.lastName}`; return { id: c.id, href: `/contributions/${c.id}`, title: name, subtitle: `${tt(c.type)} · ${dateFmt(c.dueDate, locale)}`,
                  right: <><span className="block">{money(c.amountDue, locale)}</span><Pill tone={TONE[s]!}>{ts(s)}</Pill></>,
                  cells: [name, tt(c.type), dateFmt(c.dueDate, locale), money(c.amountDue, locale), money(c.amountPaid, locale), <Pill key="s" tone={TONE[s]!}>{ts(s)}</Pill>] }; })} />
              <Pagination pathname="/contributions" query={{ q, status }} page={page} pages={pages} />
            </>)}
        </>)}
    </>
  );
}
