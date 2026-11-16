import { Plus, Sprout } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt } from "@/lib/format";
import { listProductions } from "@/services/production";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

type SP = { q?: string; product?: string; page?: string };
const UUID = /^[0-9a-f-]{36}$/i;

export default async function ProductionPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams, t = await getTranslations("production"), tu = await getTranslations("units"), locale = await getLocale();
  const ctx = await requirePermission("production:read");
  const q = sp.q?.trim().slice(0, 80) || undefined, productId = sp.product && UUID.test(sp.product) ? sp.product : undefined;
  const { items, count, hasAny, products, page, pages } = await listProductions(ctx, { q, productId, page: Number(sp.page) || 1 });
  const canWrite = ctx.permissions.has("production:write");
  const who = (r: (typeof items)[number]) => (r.member ? `${r.member.firstName} ${r.member.lastName}` : r.groupName ?? "—");

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {canWrite && <Link href="/production/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("add")}</Link>}
      </div>
      {!hasAny ? (
        <EmptyState icon={Sprout} title={t("empty.title")} text={t("empty.text")}>
          {canWrite && <Link href="/production/new" className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("empty.cta")}</Link>}
        </EmptyState>
      ) : (
        <>
          <form className="mb-4 flex flex-wrap gap-2" role="search">
            <input name="q" defaultValue={q} type="search" placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
            <select name="product" defaultValue={productId ?? ""} aria-label={t("fields.productId")} className="rounded-lg border border-line bg-white p-2.5 text-sm">
              <option value="">{t("allProducts")}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>
            {(q || productId) && <Link href="/production" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
          </form>
          {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p> : (
            <>
              <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
              <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
                <table className="w-full text-sm">
                  <thead className="bg-field text-ink-muted"><tr>{["date", "product", "quantity", "producer", "batch"].map((c) => <th key={c} scope="col" className="px-4 py-3 text-start font-medium">{t(`cols.${c}`)}</th>)}</tr></thead>
                  <tbody>{items.map((r) => (
                    <tr key={r.id} className="border-t border-line hover:bg-field">
                      <td className="px-4 py-3">{dateFmt(r.producedAt, locale)}</td>
                      <td className="px-4 py-3"><Link href={`/production/${r.id}`} className="font-medium hover:text-canopy">{r.product.name}</Link></td>
                      <td className="px-4 py-3 font-medium">{Number(r.quantity)} {tu(r.unit)}</td>
                      <td className="px-4 py-3">{who(r)}</td>
                      <td className="px-4 py-3 text-ink-muted">{r.batch?.batchNumber ?? "—"}</td>
                    </tr>))}</tbody>
                </table>
              </div>
              <ul className="grid gap-3 md:hidden">{items.map((r) => (
                <li key={r.id}><Link href={`/production/${r.id}`} className="block rounded-xl border border-line bg-white p-4">
                  <div className="flex justify-between gap-2"><p className="font-semibold">{r.product.name}</p><p className="font-semibold text-canopy">{Number(r.quantity)} {tu(r.unit)}</p></div>
                  <p className="mt-1 text-xs text-ink-muted">{dateFmt(r.producedAt, locale)} · {who(r)} · {r.batch?.batchNumber}</p>
                </Link></li>))}</ul>
              <Pagination pathname="/production" query={{ q, product: productId }} page={page} pages={pages} />
            </>
          )}
        </>
      )}
    </>
  );
}
