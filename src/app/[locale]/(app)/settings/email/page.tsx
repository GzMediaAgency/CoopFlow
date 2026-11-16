import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { EMAIL_KINDS } from "@/schemas/email";
import { asMailer, emailConfigured, getTemplate, recentLogs } from "@/services/email";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { FieldsForm } from "@/components/ui/fields-form";
import { Pill } from "@/components/ui/pill";
import { SettingsTabs } from "../settings-tabs";
import { resetTemplateAction, savePrefs, saveTemplateAction, sendTestAction } from "../email-actions";

const VARS = ["customer", "number", "total", "remaining", "due", "amount", "date", "org"];
const KNOWN = ["emailUnavailable", "emailRateLimit", "emailFailed", "customerNoEmail"];

export default async function EmailSettings({ searchParams }: { searchParams: Promise<{ test?: string; error?: string }> }) {
  const sp = await searchParams, t = await getTranslations("settings"), te = await getTranslations("errors"), tk = await getTranslations("emailKind"), c = await getTranslations("common"), locale = await getLocale();
  const ctx = await requirePermission("settings:write");
  const m = asMailer(ctx), on = emailConfigured();
  const [templates, logs] = await Promise.all([Promise.all(EMAIL_KINDS.map(async (k) => [k, await getTemplate(m, k)] as const)), recentLogs(m)]);
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-MA", { dateStyle: "short", timeStyle: "short" });
  const yesNo = [{ value: "0", label: t("email.auto.off") }, { value: "1", label: t("email.auto.on") }];

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1><SettingsTabs current="email" />
      {sp.test && <p role="status" className="mb-4 rounded-lg bg-canopy-soft p-3 text-sm text-canopy">{t("email.testOk", { email: ctx.user.email })}</p>}
      {sp.error && <p role="alert" className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{te(KNOWN.includes(sp.error) ? sp.error : "generic")}</p>}

      <section className={`mb-6 max-w-2xl rounded-xl border p-4 ${on ? "border-canopy/30 bg-canopy-soft" : "border-argan/60 bg-argan-soft"}`}>
        <p className={`font-semibold ${on ? "text-canopy" : "text-gold-deep"}`}>{on ? t("email.status.on") : t("email.status.off")}</p>
        {!on && <p className="mt-1 text-sm text-gold-deep">{t("email.offHelp")}</p>}
        {on && <div className="mt-3"><ConfirmAction tone="primary" action={sendTestAction} label={t("email.testButton")} title={t("email.testTitle")} message={t("email.testMessage", { email: ctx.user.email })} confirmLabel={t("email.testConfirm")} cancelLabel={c("cancel")} /></div>}
      </section>

      <h2 className="mb-2 font-semibold">{t("email.auto.title")}</h2><p className="mb-3 max-w-2xl text-sm text-ink-muted">{t("email.auto.hint")}</p>
      <FieldsForm action={savePrefs} cancelHref="/settings/email" submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
        { name: "autoOrder", label: t("email.auto.order"), type: "select", defaultValue: ctx.org.emailAutoOrder ? "1" : "0", options: yesNo },
        { name: "autoReminders", label: t("email.auto.reminders"), type: "select", defaultValue: ctx.org.emailAutoReminders ? "1" : "0", options: yesNo }]} />

      <h2 className="mb-1 mt-10 font-semibold">{t("email.tpl.title")}</h2>
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">{t("email.tpl.vars")} <code className="text-xs">{VARS.map((v) => `{{${v}}}`).join("  ")}</code></p>
      <div className="grid gap-8">{templates.map(([k, tpl]) => (
        <section key={k}><div className="mb-2 flex flex-wrap items-center gap-3"><h3 className="font-medium">{tk(k)}</h3><Pill tone={tpl.custom ? "green" : "gray"}>{tpl.custom ? t("email.tpl.custom") : t("email.tpl.default")}</Pill>
          {tpl.custom && <ConfirmAction action={resetTemplateAction.bind(null, k)} label={t("email.tpl.reset")} title={t("email.tpl.resetTitle")} message={t("email.tpl.resetMessage")} confirmLabel={t("email.tpl.resetConfirm")} cancelLabel={c("cancel")} />}</div>
          <FieldsForm action={saveTemplateAction.bind(null, k)} cancelHref="/settings/email" submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
            { name: "subject", label: t("email.tpl.subject"), required: true, span: true, defaultValue: tpl.subject },
            { name: "body", label: t("email.tpl.body"), type: "textarea", required: true, rows: 8, defaultValue: tpl.body }]} /></section>))}</div>

      <h2 className="mb-2 mt-10 font-semibold">{t("email.logs.title")}</h2>
      {logs.length === 0 ? <p className="text-sm text-ink-muted">{t("email.logs.none")}</p> :
        <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">{logs.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 p-3"><span className="min-w-0"><b>{tk(l.kind)}</b> · {l.toEmail}<span className="block truncate text-xs text-ink-muted">{l.subject}</span></span>
            <span className="flex items-center gap-2 text-xs text-ink-muted">{when.format(l.createdAt)}<Pill tone={l.status === "SENT" ? "green" : "clay"}>{t(`email.logs.${l.status}`)}</Pill></span></li>))}</ul>}
    </>
  );
}
