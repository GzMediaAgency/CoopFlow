import { Download, Plus, UserRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { CUSTOMER_TYPES } from "@/schemas/customer";
import { requirePermission } from "@/lib/auth/session";
import { money } from "@/lib/format";
import { listCustomers } from "@/services/customers";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; page?: string }> }) {
  const sp = await searchParams, t = await getTranslations("customers"), locale = await getLocale();
  const ctx = await requirePermission("customers:read");
  const q = sp.q?.trim().slice(0, 80) || undefined, type = CUSTOMER_TYPES.find((x) => x === sp.type);
  const { items, count, hasAny, page, pages } = await listCustomers(ctx, { q, type, page: Number(sp.page) || 1 });
  const canWrite = ctx.permissions.has("customers:write"), canExport = ctx.permissions.has("customers:export");
  const qs = new URLSearchParams(Object.entries({ q, type }).filter(([, v]) => v) as [string, string][]).toString();
  const Badge = ({ x }: { x: string }) => <span className="rounded-full bg-canopy-soft px-2.5 py-0.5 text-xs font-medium text-canopy">{t(`types.${x}`)}</span>;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex gap-2">
          {canExport && hasAny && <a href={`/api/customers/export?${qs}`} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm"><Download size={16} aria-hidden />{t("export")}</a>}
          {canWrite && <Link href="/customers/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("add")}</Link>}</div></div>
      {!hasAny ? (
        <EmptyState icon={UserRound} title={t("empty.title")} text={t("empty.text")}>{canWrite && <Link href="/customers/new" className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("empty.cta")}</Link>}</EmptyState>
      ) : (
        <>
          <form className="mb-4 flex flex-wrap gap-2" role="search">
            <input name="q" defaultValue={q} type="search" placeholder={t("search")} aria-label={t("search")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
            <select name="type" defaultValue={type ?? ""} aria-label={t("fields.type")} className="rounded-lg border border-line bg-white p-2.5 text-sm"><option value="">{t("allTypes")}</option>{CUSTOMER_TYPES.map((x) => <option key={x} value={x}>{t(`types.${x}`)}</option>)}</select>
            <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>
            {(q || type) && <Link href="/customers" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
          </form>
          {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p> : (
            <>
              <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
              <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block"><table className="w-full text-sm">
                <thead className="bg-field text-ink-muted"><tr>{["customer", "type", "phone", "city", "balance"].map((c) => <th key={c} scope="col" className="px-4 py-3 text-start font-medium">{t(`cols.${c}`)}</th>)}</tr></thead>
                <tbody>{items.map((c) => (
                  <tr key={c.id} className="border-t border-line hover:bg-field">
                    <td className="px-4 py-3"><Link href={`/customers/${c.id}`} className="font-medium hover:text-canopy">{c.name}</Link>{c.company && <span className="block text-xs text-ink-muted">{c.company}</span>}</td>
                    <td className="px-4 py-3"><Badge x={c.type} /></td><td className="px-4 py-3" dir="ltr">{c.phone ?? "—"}</td><td className="px-4 py-3">{c.city ?? "—"}</td>
                    <td className={`px-4 py-3 font-medium ${c.balance > 0 ? "text-clay" : "text-canopy"}`}>{money(c.balance, locale)}</td>
                  </tr>))}</tbody></table></div>
              <ul className="grid gap-3 md:hidden">{items.map((c) => (
                <li key={c.id}><Link href={`/customers/${c.id}`} className="block rounded-xl border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold">{c.name}</p><p className="text-xs text-ink-muted">{c.company ?? c.city ?? "—"}</p></div><Badge x={c.type} /></div>
                  <div className="mt-3 flex justify-between text-sm"><span className="text-ink-muted" dir="ltr">{c.phone ?? "—"}</span><span className={c.balance > 0 ? "font-medium text-clay" : "text-canopy"}>{money(c.balance, locale)}</span></div></Link></li>))}</ul>
              <Pagination pathname="/customers" query={{ q, type }} page={page} pages={pages} />
            </>)}
        </>)}
    </>
  );
}
