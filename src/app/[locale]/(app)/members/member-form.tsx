"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { FormState } from "./actions";
import { MEMBER_STATUSES } from "@/schemas/member";

type V = Partial<Record<string, string | number | null>>;
type Props = { action: (s: FormState, f: FormData) => Promise<FormState>; defaults?: V; cancelHref: string; showShares?: boolean };

export function MemberForm({ action, defaults = {}, cancelHref, showShares }: Props) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(action, {});
  const input = "w-full rounded-lg border border-line bg-white p-3 text-[15px]";

  const Field = ({ name, type = "text", required, mode }: { name: string; type?: string; required?: boolean; mode?: "tel" | "numeric" | "email" }) => {
    const err = state.errors?.[name]?.[0];
    return (
      <label className="grid gap-1 text-sm font-medium">
        <span>{t(`members.fields.${name}`)}{required && <span className="text-danger"> *</span>}</span>
        <input name={name} type={type} inputMode={mode} required={required} defaultValue={defaults[name] ?? ""} aria-invalid={!!err}
          aria-describedby={err ? `${name}-err` : undefined} className={`${input} ${err ? "border-danger" : ""}`} />
        {err && <span id={`${name}-err`} role="alert" className="text-xs font-normal text-danger">{t(`validation.${err}`)}</span>}
      </label>
    );
  };
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <fieldset className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:p-6">
      <legend className="px-2 text-sm font-semibold text-canopy">{title}</legend>{children}
    </fieldset>
  );

  return (
    <form action={formAction} className="grid max-w-3xl gap-5" noValidate>
      {state.error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{t(`errors.${state.error}`)}</p>}
      <Section title={t("members.sections.personal")}>
        <Field name="firstName" required /><Field name="lastName" required />
        <Field name="cin" /><Field name="birthDate" type="date" />
        <Field name="phone" type="tel" mode="tel" /><Field name="email" type="email" mode="email" />
        <Field name="address" /><Field name="city" />
      </Section>
      <Section title={t("members.sections.coop")}>
        <Field name="joinedAt" type="date" /><Field name="role" /><Field name="groupName" />
        <label className="grid gap-1 text-sm font-medium"><span>{t("members.fields.status")}</span>
          <select name="status" defaultValue={String(defaults.status ?? "ACTIVE")} className={input}>
            {MEMBER_STATUSES.map((s) => <option key={s} value={s}>{t(`members.status.${s}`)}</option>)}
          </select>
        </label>
        {showShares && <><Field name="sharesCount" type="number" mode="numeric" /><Field name="shareValue" type="number" mode="numeric" /></>}
        <label className="grid gap-1 text-sm font-medium sm:col-span-2"><span>{t("members.fields.notes")}</span>
          <textarea name="notes" rows={3} defaultValue={String(defaults.notes ?? "")} className={input} /></label>
      </Section>
      <div className="flex flex-wrap gap-3">
        <button disabled={pending} className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "…" : t("common.save")}</button>
        <Link href={cancelHref} className="rounded-lg border border-line bg-white px-5 py-3">{t("common.cancel")}</Link>
      </div>
    </form>
  );
}
