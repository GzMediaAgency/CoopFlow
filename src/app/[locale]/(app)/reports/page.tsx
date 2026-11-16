import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { resolvePeriod } from "@/lib/period";
import { buildReport } from "@/services/reports";
import { PrintButton } from "@/components/ui/print-button";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const sp = await searchParams, t = await getTranslations("reports"), tc = await getTranslations("expenseCategory"), tu = await getTranslations("units"), locale = await getLocale();
  const ctx = await requirePermission("reports:read");
  const per = resolvePeriod(sp), r = await buildReport(ctx, per), m = (v: number) => money(v, locale);
  const qs = new URLSearchParams({ period: per.key, ...(per.key === "custom" ? { from: per.fromStr, to: per.toStr } : {}) }).toString();
  const canExport = ctx.permissions.has("reports:export");
  const KPI = ({ label, value, tone = "" }: { label: string; value: string; tone?: string }) => <div className="card p-4"><p className="text-sm text-ink-muted">{label}</p><p className={`font-display text-xl font-bold ${tone}`}>{value}</p></div>;
  const List = ({ title, rows }: { title: string; rows: [string, string][] }) => (
    <section className="card p-4 lg:p-6"><h3 className="mb-2 font-semibold">{title}</h3>{rows.length === 0 ? <p className="text-sm text-ink-muted">{t("none")}</p> :
      <ul className="divide-y divide-line text-sm">{rows.map(([a, b], i) => <li key={i} className="flex justify-between gap-3 py-2"><span>{a}</span><span className="font-medium">{b}</span></li>)}</ul>}</section>);
  const H = ({ children }: { children: string }) => <h2 className="mb-3 mt-8 text-lg font-bold">{children}</h2>;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1><PrintButton label={t("print")} /></div>
      <form className="mb-2 flex flex-wrap items-end gap-2 print:hidden">
        <label className="grid gap-1 text-xs font-medium">{t("periodLabel")}<select name="period" defaultValue={per.key} className="rounded-lg border border-line bg-white p-2.5 text-sm">{(["month", "quarter", "year", "custom"] as const).map((k) => <option key={k} value={k}>{t(`periods.${k}`)}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium">{t("from")}<input type="date" name="from" defaultValue={per.fromStr} className="rounded-lg border border-line bg-white p-2.5 text-sm" /></label>
        <label className="grid gap-1 text-xs font-medium">{t("to")}<input type="date" name="to" defaultValue={per.toStr} className="rounded-lg border border-line bg-white p-2.5 text-sm" /></label>
        <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">{t("apply")}</button>
      </form>
      <p className="text-sm text-ink-muted">{dateFmt(per.from, locale)} → {per.toStr && dateFmt(new Date(`${per.toStr}T00:00:00`), locale)}</p>
      {canExport && <p className="mt-2 flex flex-wrap items-center gap-2 text-sm print:hidden"><span className="text-ink-muted">{t("export")} :</span>
        {(["sales", "payments", "expenses"] as const).map((k) => <a key={k} href={`/api/reports/export?type=${k}&${qs}`} className="rounded-lg border border-line bg-white px-3 py-1.5">{t(`exports.${k}`)}</a>)}</p>}

      <H>{t("sections.sales")}</H>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><KPI label={t("kpi.ht")} value={m(r.sales.ht)} /><KPI label={t("kpi.vat")} value={m(r.sales.vat)} /><KPI label={t("kpi.ttc")} value={m(r.sales.ttc)} tone="text-canopy" /><KPI label={t("kpi.count")} value={String(r.sales.count)} /><KPI label={t("kpi.basket")} value={m(r.sales.basket)} /></div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2"><List title={t("topProducts")} rows={r.sales.top.map((x) => [x.name, m(x.amount)])} /><List title={t("topCustomers")} rows={r.sales.customers.map((x) => [x.name, m(x.amount)])} /></div>

      <H>{t("sections.finance")}</H>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><KPI label={t("kpi.income")} value={m(r.finance.income)} tone="text-canopy" /><KPI label={t("kpi.expenses")} value={m(r.finance.spent)} tone="text-clay" />
        <KPI label={t("kpi.result")} value={m(r.finance.result)} tone={r.finance.result < 0 ? "text-clay" : "text-canopy"} /><KPI label={t("kpi.receivables")} value={m(r.finance.receivables)} /><KPI label={t("kpi.payables")} value={m(r.finance.payables)} tone={r.finance.payables > 0 ? "text-clay" : ""} /></div>
      <div className="mt-3"><List title={t("expensesByCategory")} rows={r.finance.byCategory.map((x) => [tc(x.category), m(x.amount)])} /></div>

      <H>{t("sections.production")}</H>
      <List title={t("produced")} rows={r.production.map((x) => [x.name, `${x.qty} ${tu(x.unit)}`])} />

      <H>{t("sections.stock")}</H>
      <div className="grid grid-cols-3 gap-3"><KPI label={t("kpi.stockValue")} value={m(r.stock.value)} /><KPI label={t("kpi.low")} value={String(r.stock.low)} /><KPI label={t("kpi.out")} value={String(r.stock.out)} /></div>

      <H>{t("sections.members")}</H>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI label={t("kpi.newMembers")} value={String(r.members.added)} /><KPI label={t("kpi.due")} value={m(r.contributions.due)} /><KPI label={t("kpi.paid")} value={m(r.contributions.paid)} tone="text-canopy" /><KPI label={t("kpi.contributions")} value={m(r.finance.contributions)} /></div>
    </>
  );
}
