import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { getProduct, stockState } from "@/services/products";
import { Link } from "@/i18n/routing";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { StockBadge } from "@/components/ui/stock-badge";
import { ProductQrCard } from "@/components/products/qr-card";
import { archive } from "../actions";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("products"), c = await getTranslations("common"), tu = await getTranslations("units"), tm = await getTranslations("movementType"), locale = await getLocale();
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("products:read");
  const p = await getProduct(ctx, id);
  if (!p) notFound();

  const qty = Number(p.inventory?.quantity ?? 0), reserved = Number(p.inventory?.reservedQty ?? 0), min = Number(p.stockMin);
  const state = stockState(qty, min), cost = Number(p.purchasePrice), price = Number(p.priceRetail);
  const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : null;
  const u = tu(p.unit);
  const Row = ({ k, v }: { k: string; v: ReactNode }) => (<div className="flex justify-between gap-4 py-2"><dt className="text-ink-muted">{t(`fields.${k}`)}</dt><dd className="text-end font-medium">{v ?? "—"}</dd></div>);
  const Card = ({ title, children }: { title: string; children: ReactNode }) => (<section className="card p-4 lg:p-6"><h2 className="mb-2 font-semibold">{title}</h2>{children}</section>);
  const price2 = (v: unknown) => (v == null ? null : money(v, locale));

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm text-ink-muted">{p.sku}{p.category && ` · ${p.category.name}`}</p><h1 className="text-2xl font-bold">{p.name}</h1>
          {p.nameAr && <p className="text-ink-muted" dir="rtl">{p.nameAr}</p>}
          <div className="mt-2 flex gap-2"><StockBadge state={state} label={t(`stockState.${state}`)} />{!p.isActive && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{t("inactive")}</span>}</div></div>
        <div className="flex flex-wrap gap-2">
          <a href={`/${locale}/p/${p.slug || id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-forest hover:bg-field transition-colors">
            <ExternalLink size={15} aria-hidden />
            {locale === "ar" ? "الصفحة العامة والشهادة" : "Page publique & Certificat"}
          </a>
          {ctx.permissions.has("production:write") && p.isActive && <Link href={`/production/new?product=${id}`} className="rounded-lg bg-canopy px-4 py-2 text-sm font-semibold text-white">{t("produce")}</Link>}
          {ctx.permissions.has("products:write") && <Link href={`/products/${id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm"><Pencil size={15} aria-hidden />{t("edit")}</Link>}
          {ctx.permissions.has("products:delete") && <ConfirmAction action={archive.bind(null, id)} label={t("archive.label")} title={t("archive.title")} message={t("archive.message")} confirmLabel={t("archive.confirm")} cancelLabel={c("cancel")} />}
        </div>
      </div>

      <div className="mb-5">
        <ProductQrCard
          productId={id}
          productSlug={p.slug}
          productName={p.name}
          productSku={p.sku}
          cooperativeName={ctx.org.name}
          batches={p.batches.map((b) => ({ id: b.id, batchNumber: b.batchNumber, producedAt: b.producedAt }))}
          locale={locale}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("sections.prices")}><dl className="divide-y divide-line text-sm">
          <Row k="purchasePrice" v={money(cost, locale)} /><Row k="priceRetail" v={money(price, locale)} />
          <Row k="priceProfessional" v={price2(p.priceProfessional)} /><Row k="priceReseller" v={price2(p.priceReseller)} /><Row k="priceMember" v={price2(p.priceMember)} />
          <Row k="vatRate" v={`${Number(p.vatRate)} %`} />{margin !== null && <Row k="margin" v={`${margin} %`} />}</dl></Card>
        <Card title={t("sections.stock")}><dl className="divide-y divide-line text-sm">
          <Row k="currentStock" v={`${qty} ${u}`} /><Row k="reserved" v={`${reserved} ${u}`} /><Row k="available" v={`${qty - reserved} ${u}`} />
          <Row k="stockMin" v={`${min} ${u}`} /><Row k="stockMax" v={p.stockMax ? `${Number(p.stockMax)} ${u}` : null} /></dl></Card>
        <Card title={t("sections.batches")}>
          {p.batches.length === 0 ? <p className="text-sm text-ink-muted">{t("noBatches")}</p> :
            <ul className="divide-y divide-line text-sm">{p.batches.map((b) => (
              <li key={b.id} className="flex justify-between gap-3 py-2"><span className="font-medium">{b.batchNumber}</span><span className="text-ink-muted">{Number(b.remainingQty)}/{Number(b.initialQuantity)} {b.expiresAt && `· ${dateFmt(b.expiresAt, locale)}`}</span></li>))}</ul>}</Card>
        <Card title={t("sections.movements")}>
          {p.movements.length === 0 ? <p className="text-sm text-ink-muted">{t("noMovements")}</p> :
            <ul className="divide-y divide-line text-sm">{p.movements.map((m) => (
              <li key={m.id} className="flex justify-between gap-3 py-2"><span>{tm(m.type)}<span className="block text-xs text-ink-muted">{dateFmt(m.movedAt, locale)}</span></span>
                <span className={`font-semibold ${m.direction === "IN" ? "text-canopy" : "text-clay"}`}>{m.direction === "IN" ? "+" : "−"}{Number(m.quantity)} {u}</span></li>))}</ul>}</Card>
      </div>
      {p.description && <p className="mt-4 rounded-xl border border-line bg-white p-4 text-sm">{p.description}</p>}
    </>
  );
}
