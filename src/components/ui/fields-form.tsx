"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };
export type Field = {
  name: string; label: string; type?: "text" | "number" | "date" | "textarea" | "select" | "email" | "password" | "file"; options?: { value: string; label: string }[];
  required?: boolean; step?: string; defaultValue?: string; hint?: string; span?: boolean; max?: string; autoComplete?: string; accept?: string; rows?: number;
};
type Props = { narrow?: boolean; action: (s: FormState, f: FormData) => Promise<FormState>; fields: Field[]; cancelHref: string; submitLabel: string; cancelLabel: string };

/** Formulaire générique (champs simples) : erreurs traduites, accessibilité, aucun état métier côté client. */
export function FieldsForm({ action, fields, cancelHref, submitLabel, cancelLabel, narrow }: Props) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(action, {});
  const box = "w-full rounded-lg border border-line bg-white p-3 text-[15px]";
  return (
    <form action={formAction} className={`grid gap-4 rounded-xl border border-line bg-white p-4 lg:p-6 ${narrow ? "max-w-md" : "max-w-2xl sm:grid-cols-2"}`} noValidate>
      {state.error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger sm:col-span-2">{t(`errors.${state.error}`)}</p>}
      {fields.map((f) => {
        const err = state.errors?.[f.name]?.[0];
        const base = { name: f.name, required: f.required, "aria-invalid": !!err, className: `${box} ${err ? "border-danger" : ""}` };
        const dv = { defaultValue: f.defaultValue ?? "" };
        return (
          <label key={f.name} className={`grid gap-1 text-sm font-medium ${f.span || f.type === "textarea" ? "sm:col-span-2" : ""}`}>
            <span>{f.label}{f.required && <span className="text-danger"> *</span>}</span>
            {f.type === "select" ? <select {...base} {...dv}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              : f.type === "textarea" ? <textarea {...base} {...dv} rows={f.rows ?? 3} />
              : f.type === "file" ? <input {...base} type="file" accept={f.accept} />
              : <input {...base} {...dv} type={f.type ?? "text"} autoComplete={f.autoComplete} step={f.step} max={f.max} min={f.type === "number" ? 0 : undefined} inputMode={f.type === "number" ? "decimal" : undefined} />}
            {f.hint && !err && <span className="text-xs font-normal text-ink-muted">{f.hint}</span>}
            {err && <span role="alert" className="text-xs font-normal text-danger">{t(`validation.${err}`)}</span>}
          </label>
        );
      })}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button disabled={pending} className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "…" : submitLabel}</button>
        <Link href={cancelHref} className="rounded-lg border border-line px-5 py-3">{cancelLabel}</Link>
      </div>
    </form>
  );
}
