import { AlertTriangle, Boxes, PackageX, Wallet } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { stockOverview } from "@/services/stock-ops";
import { Link } from "@/i18n/routing";
import { StockBadge } from "@/components/ui/stock-badge";
import { StockTabs } from "./stock-tabs";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string }> }) {
  const sp = await searchParams, t = await getTranslations("stock"), tu = await getTranslations("units"), ts = await getTranslations("products.stockState"), locale = await getLocale();
  const ctx = await requirePermission("stock:read");
  const q = sp.q?.trim().slice(0, 80) || undefined, state = sp.state === "low" || sp.state === "out" ? sp.state : undefined;
  const { rows, expiring, kpi } = await stockOverview(ctx, { q, state });
  const cards = [[t("kpi.value"), money(kpi.value, locale), Wallet, "text-canopy bg-canopy/10"], [t("kpi.products"), String(kpi.total), Boxes, "text-sky bg-sky/10"], [t("kpi.low"), String(kpi.low), AlertTriangle, "text-gold-deep bg-argan/25"], [t("kpi.out"), String(kpi.out), PackageX, "text-clay bg-clay/10"]] as const;

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      <StockTabs current="overview" />
      <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, value, Icon, tint]) => (
        <div key={label} className="card p-4"><span className={`grid size-9 place-items-center rounded-xl ${tint}`}><Icon size={18} aria-hidden /></span>
          <dt className="mt-2 text-sm text-ink-muted">{label}</dt><dd className="font-display text-xl font-bold">{value}</dd></div>))}</dl>

      {expiring.length > 0 && (
        <section className="mb-5 rounded-xl border border-argan/60 bg-argan-soft p-4"><h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-deep">⏰ {t("expiring")}</h2>
          <ul className="space-y-1 text-sm">{expiring.map((b) => {
            const late = b.expiresAt! < new Date();
            return <li key={b.id} className="flex justify-between gap-3"><span>{b.product.name} · {b.batchNumber}</span><span className={late ? "font-semibold text-clay" : "text-gold-deep"}>{late ? t("expired") : t("expiresOn")} {dateFmt(b.expiresAt, locale)} · {Number(b.remainingQty)}</span></li>;
          })}</ul></section>)}

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} type="search" placeholder={t("search")} aria-label={t("search")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
        <select name="state" defaultValue={state ?? ""} aria-label={t("filterState")} className="rounded-lg border border-line bg-white p-2.5 text-sm">
          <option value="">{t("allStates")}</option><option value="low">{ts("low")}</option><option value="out">{ts("out")}</option></select>
        <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>
        {(q || state) && <Link href="/stock" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
      </form>

      {rows.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("none")}</p> : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-field text-ink-muted"><tr>{["product", "current", "reserved", "available", "minmax", "value", "state"].map((c) => <th key={c} scope="col" className="px-4 py-3 text-start font-medium">{t(`cols.${c}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-line hover:bg-field">
                <td className="px-4 py-3"><Link href={`/products/${r.id}`} className="font-medium hover:text-canopy">{r.name}</Link><span className="block text-xs text-ink-muted">{r.sku}</span></td>
                <td className="px-4 py-3 font-semibold">{r.qty} <span className="text-xs font-normal text-ink-muted">{tu(r.unit)}</span></td>
                <td className="px-4 py-3">{r.reserved}</td><td className="px-4 py-3">{r.available}</td>
                <td className="px-4 py-3 text-ink-muted">{r.min}{r.max ? ` / ${r.max}` : ""}</td>
                <td className="px-4 py-3">{money(r.value, locale)}</td>
                <td className="px-4 py-3"><StockBadge state={r.state} label={ts(r.state)} /></td>
              </tr>))}</tbody>
          </table>
        </div>)}
    </>
  );
}
