"use client";
import { useActionState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { FormState } from "./actions";

type Opt = { id: string; label: string };
type Props = { action: (s: FormState, f: FormData) => Promise<FormState>; products: (Opt & { unit: string })[]; members: Opt[]; today: string; defaultProductId?: string };

export function ProductionForm({ action, products, members, today, defaultProductId }: Props) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(action, {});
  const box = "w-full rounded-lg border border-line bg-white p-3 text-[15px]";
  const F = ({ name, children, hint, required, span }: { name: string; children: ReactNode; hint?: string; required?: boolean; span?: boolean }) => {
    const err = state.errors?.[name]?.[0];
    return (
      <label className={`grid gap-1 text-sm font-medium ${span ? "sm:col-span-2" : ""}`}>
        <span>{t(`production.fields.${name}`)}{required && <span className="text-danger"> *</span>}</span>{children}
        {hint && !err && <span className="text-xs font-normal text-ink-muted">{hint}</span>}
        {err && <span role="alert" className="text-xs font-normal text-danger">{t(`validation.${err}`)}</span>}
      </label>
    );
  };
  const inp = (name: string, type = "text", extra: object = {}) => <input name={name} type={type} className={box} {...extra} />;

  return (
    <form action={formAction} className="grid max-w-3xl gap-5" noValidate>
      {state.error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{t(`errors.${state.error}`)}</p>}
      <fieldset className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:p-6">
        <legend className="px-2 text-sm font-semibold text-canopy">{t("production.sections.what")}</legend>
        <F name="productId" required>
          <select name="productId" defaultValue={defaultProductId ?? ""} required className={box}><option value="" disabled>—</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.label} ({t(`units.${p.unit}`)})</option>)}</select></F>
        <F name="quantity" required>{inp("quantity", "number", { step: "any", min: 0, inputMode: "decimal", required: true })}</F>
        <F name="producedAt" required>{inp("producedAt", "date", { defaultValue: today, max: today, required: true })}</F>
        <F name="quality">{inp("quality")}</F>
      </fieldset>
      <fieldset className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:p-6">
        <legend className="px-2 text-sm font-semibold text-canopy">{t("production.sections.who")}</legend>
        <F name="memberId"><select name="memberId" defaultValue="" className={box}><option value="">—</option>{members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></F>
        <F name="groupName">{inp("groupName")}</F>
        <F name="plotOrUnit" span>{inp("plotOrUnit")}</F>
      </fieldset>
      <fieldset className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:p-6">
        <legend className="px-2 text-sm font-semibold text-canopy">{t("production.sections.batch")}</legend>
        <F name="batchNumber" hint={t("production.hints.batch")}>{inp("batchNumber")}</F>
        <F name="expiresAt" hint={t("production.hints.expiry")}>{inp("expiresAt", "date")}</F>
        <F name="unitCost" hint={t("production.hints.cost")}>{inp("unitCost", "number", { step: "0.01", min: 0, inputMode: "decimal" })}</F>
        <F name="comment" span><textarea name="comment" rows={2} className={box} /></F>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <button disabled={pending} className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "…" : t("production.save")}</button>
        <Link href="/production" className="rounded-lg border border-line bg-white px-5 py-3">{t("common.cancel")}</Link>
      </div>
    </form>
  );
}
