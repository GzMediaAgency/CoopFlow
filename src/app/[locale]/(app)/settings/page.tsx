import { getTranslations } from "next-intl/server";
import { COOP_TYPES, SECTORS } from "@/schemas/auth";
import { requirePermission } from "@/lib/auth/session";
import { FieldsForm } from "@/components/ui/fields-form";
import { SettingsTabs } from "./settings-tabs";
import { saveOrg } from "./actions";

export default async function SettingsPage() {
  const t = await getTranslations("settings"), to = await getTranslations("onboarding.fields"), tc = await getTranslations("coopType"), ts = await getTranslations("sector"), c = await getTranslations("common");
  const { org } = await requirePermission("settings:write");
  const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");
  return (<><h1 className="mb-4 text-2xl font-bold">{t("title")}</h1><SettingsTabs current="general" />
    <FieldsForm action={saveOrg} cancelHref="/" submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
      { name: "name", label: t("orgName"), required: true, defaultValue: org.name, span: true },
      { name: "type", label: to("type"), type: "select", defaultValue: org.type, options: COOP_TYPES.map((x) => ({ value: x, label: tc(x) })) },
      { name: "sector", label: to("sector"), type: "select", defaultValue: org.sector, options: SECTORS.map((x) => ({ value: x, label: ts(x) })) },
      { name: "foundedAt", label: to("foundedAt"), type: "date", defaultValue: d(org.foundedAt) }, { name: "phone", label: to("phone"), defaultValue: org.phone ?? "" },
      { name: "address", label: to("address"), defaultValue: org.address ?? "", span: true }, { name: "city", label: to("city"), defaultValue: org.city ?? "" }, { name: "region", label: to("region"), defaultValue: org.region ?? "" },
      { name: "ice", label: to("ice"), defaultValue: org.ice ?? "" }, { name: "taxId", label: to("taxId"), defaultValue: org.taxId ?? "" },
      { name: "registrationNumber", label: to("registrationNumber"), defaultValue: org.registrationNumber ?? "", span: true }, { name: "description", label: to("description"), type: "textarea", defaultValue: org.description ?? "" }]} /></>);
}
