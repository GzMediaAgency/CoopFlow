"use client";
import { useActionState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { CUSTOMER_TYPES, PRICE_TIERS } from "@/schemas/customer";
import type { FormState } from "./actions";

type Props = { action: (s: FormState, f: FormData) => Promise<FormState>; defaults?: Partial<Record<string, string | null>>; cancelHref: string };

export function CustomerForm({ action, defaults = {}, cancelHref }: Props) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(action, {});
  const box = "w-full rounded-lg border border-line bg-white p-3 text-[15px]";
  const F = ({ name, children, required, span }: { name: string; children: ReactNode; required?: boolean; span?: boolean }) => {
    const err = state.errors?.[name]?.[0];
    return (<label className={`grid gap-1 text-sm font-medium ${span ? "sm:col-span-2" : ""}`}><span>{t(`customers.fields.${name}`)}{required && <span className="text-danger"> *</span>}</span>{children}
      {err && <span role="alert" className="text-xs font-normal text-danger">{t(`validation.${err}`)}</span>}</label>);
  };
  const inp = (name: string, type = "text", extra: object = {}) => <input name={name} type={type} defaultValue={defaults[name] ?? ""} className={box} {...extra} />;

  return (
    <form action={formAction} className="grid max-w-3xl gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:p-6" noValidate>
      {state.error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger sm:col-span-2">{t(`errors.${state.error}`)}</p>}
      <F name="name" required>{inp("name", "text", { required: true })}</F><F name="company">{inp("company")}</F>
      <F name="type"><select name="type" defaultValue={defaults.type ?? "INDIVIDUAL"} className={box}>{CUSTOMER_TYPES.map((x) => <option key={x} value={x}>{t(`customers.types.${x}`)}</option>)}</select></F>
      <F name="priceTier"><select name="priceTier" defaultValue={defaults.priceTier ?? ""} className={box}><option value="">{t("customers.autoTier")}</option>{PRICE_TIERS.map((x) => <option key={x} value={x}>{t(`customers.tiers.${x}`)}</option>)}</select></F>
      <F name="phone">{inp("phone", "tel", { inputMode: "tel" })}</F><F name="email">{inp("email", "email", { inputMode: "email" })}</F>
      <F name="address">{inp("address")}</F><F name="city">{inp("city")}</F>
      <F name="ice">{inp("ice", "text", { inputMode: "numeric", maxLength: 15 })}</F>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2"><span>{t("customers.fields.notes")}</span><textarea name="notes" rows={3} defaultValue={defaults.notes ?? ""} className={box} /></label>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button disabled={pending} className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "…" : t("common.save")}</button>
        <Link href={cancelHref} className="rounded-lg border border-line px-5 py-3">{t("common.cancel")}</Link>
      </div>
    </form>
  );
}
