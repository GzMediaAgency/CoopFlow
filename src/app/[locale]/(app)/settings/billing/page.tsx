import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { FieldsForm } from "@/components/ui/fields-form";
import { SettingsTabs } from "../settings-tabs";
import { saveBilling } from "../actions";

export default async function BillingSettings() {
  const t = await getTranslations("settings"), c = await getTranslations("common");
  const { org } = await requirePermission("settings:write");
  return (<><h1 className="mb-4 text-2xl font-bold">{t("title")}</h1><SettingsTabs current="billing" />
    <FieldsForm action={saveBilling} cancelHref="/" submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
      { name: "invoicePrefix", label: t("billing.invoicePrefix"), required: true, defaultValue: org.invoicePrefix, hint: t("billing.prefixHint") },
      { name: "orderPrefix", label: t("billing.orderPrefix"), required: true, defaultValue: org.orderPrefix },
      { name: "defaultVatRate", label: t("billing.vat"), type: "select", defaultValue: String(Number(org.defaultVatRate)), options: [0, 7, 10, 14, 20].map((v) => ({ value: String(v), label: `${v} %` })) }]} />
    <p className="mt-3 max-w-2xl text-sm text-ink-muted">{t("billing.note")}</p></>);
}
