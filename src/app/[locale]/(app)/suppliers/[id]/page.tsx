import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { getSupplier } from "@/services/suppliers";
import { Link } from "@/i18n/routing";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { FieldsForm } from "@/components/ui/fields-form";
import { METHODS } from "@/schemas/payment";
import { archive, paySupplierAction } from "../actions";

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("suppliers"), tc = await getTranslations("expenseCategory"), tm = await getTranslations("paymentMethod"), c = await getTranslations("common"), locale = await getLocale();
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("suppliers:read");
  const s = await getSupplier(ctx, id);
  if (!s) notFound();
  const Row = ({ k, v }: { k: string; v: ReactNode }) => <div className="flex justify-between gap-4 py-2"><dt className="text-ink-muted">{t(`fields.${k}`)}</dt><dd className="text-end font-medium">{v || "—"}</dd></div>;
  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{s.name}</h1>{s.company && <p className="text-ink-muted">{s.company}</p>}</div>
        <div className="flex flex-wrap gap-2">
          {ctx.permissions.has("suppliers:write") && <Link href={`/suppliers/${id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm"><Pencil size={15} aria-hidden />{t("edit")}</Link>}
          {ctx.permissions.has("suppliers:delete") && <ConfirmAction action={archive.bind(null, id)} label={t("archive.label")} title={t("archive.title")} message={t("archive.message")} confirmLabel={t("archive.confirm")} cancelLabel={c("cancel")} />}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 lg:p-6"><dl className="divide-y divide-line text-sm"><Row k="phone" v={s.phone && <span dir="ltr">{s.phone}</span>} /><Row k="email" v={s.email} /><Row k="address" v={s.address} /><Row k="ice" v={s.ice} /><Row k="taxId" v={s.taxId} /></dl>{s.notes && <p className="mt-3 rounded-lg bg-field p-3 text-sm">{s.notes}</p>}</section>
        <section className="card p-4 lg:p-6"><h2 className="mb-1 font-semibold">{t("debt")}</h2><p className={`font-display text-3xl font-bold ${s.debt > 0.005 ? "text-clay" : "text-canopy"}`}>{money(s.debt, locale)}</p><p className="mb-4 text-sm text-ink-muted">{t("debtHint")}</p>
          <h2 className="mb-1 font-semibold">{t("spent")}</h2><p className="font-display text-3xl font-bold text-clay">{money(s.spent, locale)}</p>
          {s.products.length > 0 && <><h2 className="mb-1 mt-4 font-semibold">{t("products")}</h2><ul className="text-sm">{s.products.map((p) => <li key={p.id}><Link href={`/products/${p.id}`} className="text-canopy hover:underline">{p.name}</Link></li>)}</ul></>}</section>
        {s.debt > 0.005 && ctx.permissions.has("suppliers:write") && (
          <section className="lg:col-span-2"><h2 className="mb-3 font-semibold">{t("pay")}</h2>
            <FieldsForm action={paySupplierAction.bind(null, id)} cancelHref={`/suppliers/${id}`} submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
              { name: "amount", label: t("payFields.amount"), type: "number", required: true, step: "0.01", defaultValue: String(Math.round(s.debt * 100) / 100), hint: t("payHint") },
              { name: "method", label: t("payFields.method"), type: "select", defaultValue: "BANK_TRANSFER", options: METHODS.map((m) => ({ value: m, label: tm(m) })) },
              { name: "paidAt", label: t("payFields.paidAt"), type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10), max: new Date().toISOString().slice(0, 10) }, { name: "reference", label: t("payFields.reference") }]} /></section>)}
        <section className="card p-4 lg:col-span-2 lg:p-6"><h2 className="mb-2 font-semibold">{t("payments")}</h2>
          {s.payments.length === 0 ? <p className="text-sm text-ink-muted">{t("noPayments")}</p> : <ul className="divide-y divide-line text-sm">{s.payments.map((p) => <li key={p.id} className="flex justify-between py-2"><span>{dateFmt(p.paidAt, locale)} · {tm(p.method)}{p.reference && ` · ${p.reference}`}</span><span className="font-semibold text-clay">− {money(p.amount, locale)}</span></li>)}</ul>}</section>
        <section className="card p-4 lg:col-span-2 lg:p-6"><h2 className="mb-2 font-semibold">{t("purchases")}</h2>
          {s.expenses.length === 0 ? <p className="text-sm text-ink-muted">{t("noPurchases")}</p> : <ul className="divide-y divide-line text-sm">{s.expenses.map((e) => <li key={e.id} className="flex justify-between py-2"><span>{tc(e.category)}<span className="block text-xs text-ink-muted">{dateFmt(e.spentAt, locale)}</span></span><span className="font-semibold">{money(e.amount, locale)}{e.onCredit && <span className="ms-2 rounded bg-argan-soft px-1.5 py-0.5 text-xs font-medium text-gold-deep">{t("onCredit")}</span>}</span></li>)}</ul>}</section>
      </div>
    </>
  );
}
