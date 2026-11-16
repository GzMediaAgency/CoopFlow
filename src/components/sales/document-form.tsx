"use client";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { totals } from "@/lib/totals";
import { METHODS } from "@/schemas/payment";

type Tier = "RETAIL" | "PROFESSIONAL" | "RESELLER" | "MEMBER";
export type DocProduct = { id: string; name: string; unit: string; vatRate: number; available: number; prices: Record<Tier, number> };
export type DocCustomer = { id: string; name: string; tier: Tier };
type FormState = { errors?: Record<string, string[] | undefined>; error?: string };
type L = { productId: string; quantity: string; unitPrice: string; discount: string };
type Props = { action: (s: FormState, f: FormData) => Promise<FormState>; customers: DocCustomer[]; products: DocProduct[]; mode: "order" | "sale"; cancelHref: string; defaultCustomerId?: string };

/** Éditeur de lignes partagé par les commandes et les ventes : le prix suit le niveau du client, les totaux se calculent en direct. */
export function DocumentForm({ action, customers, products, mode, cancelHref, defaultCustomerId }: Props) {
  const t = useTranslations(), locale = useLocale();
  const [state, formAction, pending] = useActionState(action, {});
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [lines, setLines] = useState<L[]>([{ productId: "", quantity: "1", unitPrice: "0", discount: "0" }]);
  const [pay, setPay] = useState("");
  const money = (n: number) => new Intl.NumberFormat(locale === "ar" ? "ar-MA" : "fr-MA", { style: "currency", currency: "MAD" }).format(n);
  const box = "w-full rounded-lg border border-line bg-white p-2.5 text-sm";
  const tierOf = (id: string): Tier => customers.find((c) => c.id === id)?.tier ?? "RETAIL";
  const priceOf = (pid: string, tier: Tier) => products.find((p) => p.id === pid)?.prices[tier] ?? 0;
  const set = (i: number, patch: Partial<L>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const chosen = lines.filter((l) => l.productId);
  const tot = totals(chosen.map((l) => ({ quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0, discount: Number(l.discount) || 0, vatRate: products.find((p) => p.id === l.productId)?.vatRate ?? 0 })));
  const payload = JSON.stringify(chosen.map((l) => ({ productId: l.productId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), discount: Number(l.discount) || 0 })));
  const err = (k: string) => state.errors?.[k]?.[0];

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{t(`errors.${state.error}`)}</p>}
      <input type="hidden" name="lines" value={payload} />
      <section className="card grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
        <label className="grid gap-1 text-sm font-medium"><span>{t("docs.customer")} <span className="text-danger">*</span></span>
          <select name="customerId" required value={customerId} className={box}
            onChange={(e) => { const id = e.target.value; setCustomerId(id); setLines((ls) => ls.map((l) => (l.productId ? { ...l, unitPrice: String(priceOf(l.productId, tierOf(id))) } : l))); }}>
            <option value="" disabled>—</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {err("customerId") && <span role="alert" className="text-xs font-normal text-danger">{t(`validation.${err("customerId")}`)}</span>}</label>
        <label className="grid gap-1 text-sm font-medium"><span>{t("docs.notes")}</span><input name="notes" className={box} /></label>
      </section>

      <section className="card p-4 lg:p-6">
        <h2 className="mb-3 font-semibold">{t("docs.lines")}</h2>
        {err("lines") && <p role="alert" className="mb-3 rounded-lg bg-danger/10 p-2 text-sm text-danger">{t(`validation.${err("lines")}`)}</p>}
        <div className="grid gap-3">{lines.map((l, i) => {
          const p = products.find((x) => x.id === l.productId), over = p && Number(l.quantity) > p.available;
          return (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-field p-3 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
              <label className="col-span-2 grid gap-1 text-xs font-medium lg:col-span-1">{t("docs.product")}
                <select value={l.productId} className={box} onChange={(e) => set(i, { productId: e.target.value, unitPrice: String(priceOf(e.target.value, tierOf(customerId))) })}>
                  <option value="">—</option>{products.map((x) => <option key={x.id} value={x.id}>{x.name} · {t("docs.available")} {x.available} {t(`units.${x.unit}`)}</option>)}</select></label>
              <label className="grid gap-1 text-xs font-medium">{t("docs.qty")}<input type="number" min="0" step="any" inputMode="decimal" value={l.quantity} onChange={(e) => set(i, { quantity: e.target.value })} className={`${box} ${over ? "border-clay" : ""}`} /></label>
              <label className="grid gap-1 text-xs font-medium">{t("docs.price")}<input type="number" min="0" step="0.01" inputMode="decimal" value={l.unitPrice} onChange={(e) => set(i, { unitPrice: e.target.value })} className={box} /></label>
              <label className="grid gap-1 text-xs font-medium">{t("docs.discount")}<input type="number" min="0" step="0.01" inputMode="decimal" value={l.discount} onChange={(e) => set(i, { discount: e.target.value })} className={box} /></label>
              <button type="button" aria-label={t("docs.remove")} disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} className="justify-self-end rounded-lg p-2.5 text-clay hover:bg-clay/10 disabled:opacity-30"><Trash2 size={18} /></button>
              {over && <p className="col-span-2 text-xs text-clay lg:col-span-5">{t("docs.overStock")}</p>}
            </div>);
        })}</div>
        <button type="button" onClick={() => setLines((ls) => [...ls, { productId: "", quantity: "1", unitPrice: "0", discount: "0" }])} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"><Plus size={16} aria-hidden />{t("docs.addLine")}</button>

        <dl className="ms-auto mt-5 grid max-w-xs gap-1 text-sm">
          <div className="flex justify-between"><dt className="text-ink-muted">{t("docs.subtotal")}</dt><dd>{money(tot.subtotal)}</dd></div>
          {tot.discountTotal > 0 && <div className="flex justify-between"><dt className="text-ink-muted">{t("docs.discountTotal")}</dt><dd>− {money(tot.discountTotal)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-muted">{t("docs.vat")}</dt><dd>{money(tot.taxTotal)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>{t("docs.total")}</dt><dd className="text-canopy">{money(tot.total)}</dd></div>
        </dl>
      </section>

      {mode === "sale" && (
        <section className="card grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
          <h2 className="font-semibold sm:col-span-2">{t("docs.payNow")}</h2>
          <label className="grid gap-1 text-sm font-medium"><span>{t("docs.payAmount")}</span>
            <div className="flex gap-2"><input name="payAmount" type="number" min="0" step="0.01" inputMode="decimal" value={pay} onChange={(e) => setPay(e.target.value)} className={box} />
              <button type="button" onClick={() => setPay(String(tot.total))} className="whitespace-nowrap rounded-lg border border-line px-3 text-sm">{t("docs.payAll")}</button></div>
            {err("payAmount") && <span role="alert" className="text-xs font-normal text-danger">{t(`validation.${err("payAmount")}`)}</span>}</label>
          <label className="grid gap-1 text-sm font-medium"><span>{t("payments.fields.method")}</span>
            <select name="payMethod" defaultValue="CASH" className={box}>{METHODS.map((m) => <option key={m} value={m}>{t(`paymentMethod.${m}`)}</option>)}</select></label>
        </section>)}

      <div className="flex flex-wrap gap-3">
        {mode === "order" && <button name="status" value="DRAFT" disabled={pending} className="rounded-lg border border-line bg-white px-5 py-3 font-medium disabled:opacity-60">{t("docs.saveDraft")}</button>}
        <button name="status" value="NEW" disabled={pending} className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "…" : mode === "order" ? t("docs.createOrder") : t("docs.createSale")}</button>
        <Link href={cancelHref} className="rounded-lg border border-line px-5 py-3">{t("common.cancel")}</Link>
      </div>
    </form>
  );
}
