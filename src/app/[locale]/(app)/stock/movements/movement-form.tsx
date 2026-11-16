"use client";
import { useActionState, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { IN_TYPES, MANUAL_TYPES } from "@/schemas/stock";
import type { FormState } from "../actions";

type Props = { action: (s: FormState, f: FormData) => Promise<FormState>; products: { id: string; name: string; unit: string }[]; batches: { id: string; productId: string; label: string }[]; today: string };

export function MovementForm({ action, products, batches, today }: Props) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(action, {});
  const [productId, setProductId] = useState(""), [type, setType] = useState("");
  const box = "w-full rounded-lg border border-line bg-white p-3 text-[15px]";
  const isOut = type !== "" && !(IN_TYPES as readonly string[]).includes(type);
  const F = ({ name, children, hint }: { name: string; children: ReactNode; hint?: string }) => {
    const err = state.errors?.[name]?.[0];
    return (<label className="grid gap-1 text-sm font-medium"><span>{t(`stock.fields.${name}`)}</span>{children}
      {hint && !err && <span className="text-xs font-normal text-ink-muted">{hint}</span>}
      {err && <span role="alert" className="text-xs font-normal text-danger">{t(`validation.${err}`)}</span>}</label>);
  };
  const pb = batches.filter((b) => b.productId === productId);

  return (
    <form action={formAction} className="grid max-w-2xl gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:p-6" noValidate>
      {state.error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger sm:col-span-2">{t(`errors.${state.error}`)}</p>}
      <F name="type"><select name="type" required value={type} onChange={(e) => setType(e.target.value)} className={box}><option value="" disabled>—</option>
        {MANUAL_TYPES.map((x) => <option key={x} value={x}>{t(`movementType.${x}`)} ({(IN_TYPES as readonly string[]).includes(x) ? "+" : "−"})</option>)}</select></F>
      <F name="productId"><select name="productId" required value={productId} onChange={(e) => setProductId(e.target.value)} className={box}><option value="" disabled>—</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({t(`units.${p.unit}`)})</option>)}</select></F>
      <F name="quantity"><input name="quantity" type="number" step="any" min="0" inputMode="decimal" required className={box} /></F>
      <F name="movedAt"><input name="movedAt" type="date" defaultValue={today} max={today} required className={box} /></F>
      {isOut && <F name="batchId" hint={t("stock.hints.batch")}><select name="batchId" defaultValue="" className={box}><option value="">{t("stock.autoBatch")}</option>{pb.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select></F>}
      <F name="reference"><input name="reference" className={box} /></F>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2"><span>{t("stock.fields.comment")}</span><textarea name="comment" rows={2} className={box} /></label>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button disabled={pending} className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "…" : t("common.save")}</button>
        <Link href="/stock/movements" className="rounded-lg border border-line px-5 py-3">{t("common.cancel")}</Link>
      </div>
    </form>
  );
}
