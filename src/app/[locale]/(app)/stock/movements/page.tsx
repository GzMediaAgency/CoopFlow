import { Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt } from "@/lib/format";
import { MANUAL_TYPES } from "@/schemas/stock";
import { listMovements } from "@/services/stock-ops";
import { Link } from "@/i18n/routing";
import { Pagination } from "@/components/ui/pagination";
import { StockTabs } from "../stock-tabs";

const ALL_TYPES = ["PRODUCTION", "SALE", "ADJUSTMENT", ...MANUAL_TYPES];
const UUID = /^[0-9a-f-]{36}$/i;

export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ product?: string; type?: string; page?: string }> }) {
  const sp = await searchParams, t = await getTranslations("stock"), tm = await getTranslations("movementType"), tu = await getTranslations("units"), locale = await getLocale();
  const ctx = await requirePermission("stock:read");
  const productId = sp.product && UUID.test(sp.product) ? sp.product : undefined, type = ALL_TYPES.find((x) => x === sp.type);
  const { items, count, products, page, pages } = await listMovements(ctx, { productId, type, page: Number(sp.page) || 1 });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1>
        {ctx.permissions.has("stock:write") && <Link href="/stock/movements/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("newMovement")}</Link>}</div>
      <StockTabs current="movements" />
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="product" defaultValue={productId ?? ""} aria-label={t("fields.productId")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm"><option value="">{t("allProducts")}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="type" defaultValue={type ?? ""} aria-label={t("fields.type")} className="rounded-lg border border-line bg-white p-2.5 text-sm"><option value="">{t("allTypes")}</option>{ALL_TYPES.map((x) => <option key={x} value={x}>{tm(x)}</option>)}</select>
        <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>
        {(productId || type) && <Link href="/stock/movements" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
      </form>
      {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noMovements")}</p> : (
        <>
          <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">{items.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <div className="min-w-0"><p className="truncate font-medium">{m.product.name}</p>
                <p className="text-xs text-ink-muted">{tm(m.type)} · {dateFmt(m.movedAt, locale)}{m.batch && ` · ${m.batch.batchNumber}`}{m.reference && !m.batch && ` · ${m.reference}`}{m.user && ` · ${m.user.fullName}`}</p>
                {m.comment && <p className="mt-0.5 text-xs text-ink-muted">{m.comment}</p>}</div>
              <span className={`shrink-0 text-base font-semibold ${m.direction === "IN" ? "text-canopy" : "text-clay"}`}>{m.direction === "IN" ? "+" : "−"}{Number(m.quantity)} <span className="text-xs font-normal text-ink-muted">{tu(m.product.unit)}</span></span>
            </li>))}</ul>
          <Pagination pathname="/stock/movements" query={{ product: productId, type }} page={page} pages={pages} />
        </>)}
    </>
  );
}
