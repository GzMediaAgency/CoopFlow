import { Package, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { money } from "@/lib/format";
import { listProducts } from "@/services/products";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StockBadge } from "@/components/ui/stock-badge";

type SP = { q?: string; category?: string; active?: string; page?: string };
const UUID = /^[0-9a-f-]{36}$/i;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams, t = await getTranslations("products"), tu = await getTranslations("units"), locale = await getLocale();
  const ctx = await requirePermission("products:read");
  const q = sp.q?.trim().slice(0, 80) || undefined, categoryId = sp.category && UUID.test(sp.category) ? sp.category : undefined;
  const active = sp.active === "1" || sp.active === "0" ? sp.active : undefined;
  const { items, count, hasAny, categories, page, pages } = await listProducts(ctx, { q, categoryId, active, page: Number(sp.page) || 1 });
  const canWrite = ctx.permissions.has("products:write");
  const unit = (u: string) => tu(u);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {canWrite && <Link href="/products/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("add")}</Link>}
      </div>
      {!hasAny ? (
        <EmptyState icon={Package} title={t("empty.title")} text={t("empty.text")}>
          {canWrite && <Link href="/products/new" className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("empty.cta")}</Link>}
        </EmptyState>
      ) : (
        <>
          <form className="mb-4 flex flex-wrap gap-2" role="search">
            <input name="q" defaultValue={q} type="search" placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
            <select name="category" defaultValue={categoryId ?? ""} aria-label={t("fields.category")} className="rounded-lg border border-line bg-white p-2.5 text-sm">
              <option value="">{t("allCategories")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select name="active" defaultValue={active ?? ""} aria-label={t("fields.isActive")} className="rounded-lg border border-line bg-white p-2.5 text-sm">
              <option value="">{t("allStatuses")}</option><option value="1">{t("activeOnly")}</option><option value="0">{t("inactiveOnly")}</option></select>
            <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>
            {(q || categoryId || active) && <Link href="/products" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
          </form>
          {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p> : (
            <>
              <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
              <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
                <table className="w-full text-sm">
                  <thead className="bg-field text-ink-muted"><tr>{["product", "category", "price", "stock"].map((c) => <th key={c} scope="col" className="px-4 py-3 text-start font-medium">{t(`cols.${c}`)}</th>)}</tr></thead>
                  <tbody>{items.map((p) => (
                    <tr key={p.id} className="border-t border-line hover:bg-field">
                      <td className="px-4 py-3"><Link href={`/products/${p.id}`} className="font-medium hover:text-canopy">{p.name}</Link><span className="block text-xs text-ink-muted">{p.sku}{!p.isActive && ` · ${t("inactive")}`}</span></td>
                      <td className="px-4 py-3">{p.category?.name ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{money(p.priceRetail, locale)}<span className="text-xs font-normal text-ink-muted"> / {unit(p.unit)}</span></td>
                      <td className="px-4 py-3"><span className="me-2">{p.qty}</span><StockBadge state={p.state} label={t(`stockState.${p.state}`)} /></td>
                    </tr>))}</tbody>
                </table>
              </div>
              <ul className="grid gap-3 md:hidden">{items.map((p) => (
                <li key={p.id}><Link href={`/products/${p.id}`} className="block rounded-xl border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold">{p.name}</p><p className="text-xs text-ink-muted">{p.sku} · {p.category?.name ?? "—"}</p></div><StockBadge state={p.state} label={t(`stockState.${p.state}`)} /></div>
                  <div className="mt-3 flex justify-between text-sm"><span className="font-medium">{money(p.priceRetail, locale)}</span><span className="text-ink-muted">{p.qty} {unit(p.unit)}</span></div>
                </Link></li>))}</ul>
              <Pagination pathname="/products" query={{ q, category: categoryId, active }} page={page} pages={pages} />
            </>
          )}
        </>
      )}
    </>
  );
}
