import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { asWa, waConfigured, waPlanAllows } from "@/services/whatsapp";
import { FieldsForm } from "@/components/ui/fields-form";
import { Pill } from "@/components/ui/pill";
import { SettingsTabs } from "../settings-tabs";
import { saveWhatsappPrefs } from "../whatsapp-actions";

// Modèles à créer et faire approuver dans Meta (catégorie « Utility »). L'ordre des variables {{n}} doit être respecté.
const TPL = {
  ORDER: { env: "WHATSAPP_TPL_ORDER", fr: "Bonjour {{1}}, votre commande {{2}} est confirmée. — {{3}}", ar: "مرحبا {{1}}، تم تأكيد طلبيتكم {{2}}. — {{3}}" },
  INVOICE: { env: "WHATSAPP_TPL_INVOICE", fr: "Bonjour {{1}}, votre facture {{2}} d’un montant de {{3}} est disponible. — {{4}}", ar: "مرحبا {{1}}، فاتورتكم {{2}} بمبلغ {{3}} جاهزة. — {{4}}" },
  REMINDER: { env: "WHATSAPP_TPL_REMINDER", fr: "Bonjour {{1}}, rappel : il reste {{3}} à payer sur la facture {{2}}. — {{4}}", ar: "مرحبا {{1}}، تذكير: المتبقي للأداء {{3}} عن الفاتورة {{2}}. — {{4}}" },
} as const;

export default async function WhatsappSettings() {
  const t = await getTranslations("settings"), tk = await getTranslations("whatsappKind"), c = await getTranslations("common"), locale = await getLocale();
  const ctx = await requirePermission("settings:write");
  const m = asWa(ctx), platform = waConfigured(), plan = await waPlanAllows(ctx.org.id);
  const logs = await m.db.whatsappLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-MA", { dateStyle: "short", timeStyle: "short" });
  const Row = ({ ok, on, off }: { ok: boolean; on: string; off: string }) => <li className={`flex items-center gap-2 text-sm ${ok ? "text-canopy" : "text-gold-deep"}`}><span aria-hidden>{ok ? "✔" : "•"}</span>{ok ? on : off}</li>;

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1><SettingsTabs current="whatsapp" />
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">{t("whatsapp.intro")}</p>
      <ul className="mb-6 grid max-w-2xl gap-1.5 rounded-xl border border-line bg-white p-4">
        <Row ok={platform} on={t("whatsapp.platformOn")} off={t("whatsapp.platformOff")} />
        <Row ok={plan} on={t("whatsapp.planOn")} off={t("whatsapp.planOff")} />
        <Row ok={ctx.org.whatsappEnabled} on={t("whatsapp.enabledOn")} off={t("whatsapp.enabledOff")} />
      </ul>
      <FieldsForm action={saveWhatsappPrefs} cancelHref="/settings/whatsapp" submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
        { name: "enabled", label: t("whatsapp.toggle"), type: "select", defaultValue: ctx.org.whatsappEnabled ? "1" : "0", options: [{ value: "0", label: t("email.auto.off") }, { value: "1", label: t("email.auto.on") }], hint: t("whatsapp.toggleHint") }]} />

      <h2 className="mb-1 mt-10 font-semibold">{t("whatsapp.tplTitle")}</h2><p className="mb-3 max-w-2xl text-sm text-ink-muted">{t("whatsapp.tplHelp")}</p>
      <div className="grid max-w-3xl gap-3">{(Object.keys(TPL) as (keyof typeof TPL)[]).map((k) => (
        <div key={k} className="card p-4"><p className="mb-1 text-sm font-medium">{tk(k)} <code className="text-xs text-ink-muted">{TPL[k].env}</code></p><pre dir={locale === "ar" ? "rtl" : "ltr"} className="whitespace-pre-wrap rounded-lg bg-field p-3 text-sm">{TPL[k][locale === "ar" ? "ar" : "fr"]}</pre></div>))}</div>

      <h2 className="mb-2 mt-10 font-semibold">{t("whatsapp.logs.title")}</h2>
      {logs.length === 0 ? <p className="text-sm text-ink-muted">{t("whatsapp.logs.none")}</p> :
        <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">{logs.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 p-3"><span><b>{tk(l.kind)}</b> · <span dir="ltr">+{l.toPhone}</span></span>
            <span className="flex items-center gap-2 text-xs text-ink-muted">{when.format(l.createdAt)}<Pill tone={l.status === "SENT" ? "green" : "clay"}>{t(`email.logs.${l.status}`)}</Pill></span></li>))}</ul>}
    </>
  );
}
