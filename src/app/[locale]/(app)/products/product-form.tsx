"use client";
import { useActionState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { UNITS, VAT_RATES } from "@/schemas/product";
import type { FormState } from "./actions";

type V = Partial<Record<string, string | number | boolean | null>>;
type Props = { action: (s: FormState, f: FormData) => Promise<FormState>; defaults?: V; categories: string[]; cancelHref: string };

export function ProductForm({ action, defaults = {}, categories, cancelHref }: Props) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(action, {});
  const box = "w-full rounded-lg border border-line bg-white p-3 text-[15px]";

  const Field = ({ name, type = "text", required, step, hint }: { name: string; type?: string; required?: boolean; step?: string; hint?: string }) => {
    const err = state.errors?.[name]?.[0];
    return (
      <label className="grid gap-1 text-sm font-medium">
        <span>{t(`products.fields.${name}`)}{required && <span className="text-danger"> *</span>}</span>
        <input name={name} type={type} step={step} inputMode={type === "number" ? "decimal" : undefined} required={required} min={type === "number" ? 0 : undefined}
          defaultValue={String(defaults[name] ?? "")} list={name === "category" ? "cats" : undefined} aria-invalid={!!err} className={`${box} ${err ? "border-danger" : ""}`} />
        {hint && !err && <span className="text-xs font-normal text-ink-muted">{hint}</span>}
        {err && <span role="alert" className="text-xs font-normal text-danger">{t(`validation.${err}`)}</span>}
      </label>
    );
  };
  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <fieldset className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:p-6"><legend className="px-2 text-sm font-semibold text-canopy">{title}</legend>{children}</fieldset>
  );

  return (
    <form action={formAction} className="grid max-w-3xl gap-5" noValidate>
      {state.error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{t(`errors.${state.error}`)}</p>}
      <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <Section title={t("products.sections.identity")}>
        <Field name="name" required /><Field name="nameAr" />
        <Field name="sku" hint={t("products.skuHint")} /><Field name="category" />
        <label className="grid gap-1 text-sm font-medium sm:col-span-2"><span>{t("products.fields.description")}</span>
          <textarea name="description" rows={2} defaultValue={String(defaults.description ?? "")} className={box} /></label>
      </Section>
      <Section title={t("products.sections.prices")}>
        <Field name="purchasePrice" type="number" step="0.01" /><Field name="priceRetail" type="number" step="0.01" />
        <Field name="priceProfessional" type="number" step="0.01" /><Field name="priceReseller" type="number" step="0.01" />
        <Field name="priceMember" type="number" step="0.01" />
        <label className="grid gap-1 text-sm font-medium"><span>{t("products.fields.vatRate")}</span>
          <select name="vatRate" defaultValue={String(defaults.vatRate ?? 20)} className={box}>{VAT_RATES.map((r) => <option key={r} value={r}>{r} %</option>)}</select></label>
      </Section>
      <Section title={t("products.sections.stock")}>
        <label className="grid gap-1 text-sm font-medium"><span>{t("products.fields.unit")}</span>
          <select name="unit" defaultValue={String(defaults.unit ?? "UNIT")} className={box}>{UNITS.map((u) => <option key={u} value={u}>{t(`units.${u}`)}</option>)}</select></label>
        <Field name="stockMin" type="number" step="any" /><Field name="stockMax" type="number" step="any" />
        <Field name="shelfLifeDays" type="number" step="1" hint={t("products.shelfHint")} />
        <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2">
          <input type="checkbox" name="isActive" defaultChecked={defaults.isActive !== false} className="size-5 accent-[var(--color-canopy)]" />{t("products.fields.isActive")}</label>
      </Section>
      <div className="flex flex-wrap gap-3">
        <button disabled={pending} className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "…" : t("common.save")}</button>
        <Link href={cancelHref} className="rounded-lg border border-line bg-white px-5 py-3">{t("common.cancel")}</Link>
      </div>
    </form>
  );
}
