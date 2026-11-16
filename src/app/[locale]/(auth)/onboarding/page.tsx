import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/ui/auth-card";
import { FieldsForm } from "@/components/ui/fields-form";
import { requireUser } from "@/lib/auth/session";
import { COOP_TYPES, SECTORS } from "@/schemas/auth";
import { saveOnboarding } from "../actions";

export default async function OnboardingPage() {
  const t = await getTranslations("onboarding"), tc = await getTranslations("coopType"), ts = await getTranslations("sector"), c = await getTranslations("common");
  const { org } = await requireUser();
  const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");
  return (
    <AuthCard title={t("title")} subtitle={t("intro")}>
      <FieldsForm action={saveOnboarding} cancelHref="/" submitLabel={c("save")} cancelLabel={t("later")} fields={[
        { name: "type", label: t("fields.type"), type: "select", required: true, defaultValue: org.type, options: COOP_TYPES.map((x) => ({ value: x, label: tc(x) })) },
        { name: "sector", label: t("fields.sector"), type: "select", required: true, defaultValue: org.sector, options: SECTORS.map((x) => ({ value: x, label: ts(x) })) },
        { name: "foundedAt", label: t("fields.foundedAt"), type: "date", defaultValue: d(org.foundedAt) },
        { name: "phone", label: t("fields.phone"), defaultValue: org.phone ?? "" },
        { name: "address", label: t("fields.address"), defaultValue: org.address ?? "", span: true },
        { name: "city", label: t("fields.city"), defaultValue: org.city ?? "" }, { name: "region", label: t("fields.region"), defaultValue: org.region ?? "" },
        { name: "ice", label: t("fields.ice"), defaultValue: org.ice ?? "" }, { name: "taxId", label: t("fields.taxId"), defaultValue: org.taxId ?? "" },
        { name: "registrationNumber", label: t("fields.registrationNumber"), defaultValue: org.registrationNumber ?? "", span: true },
        { name: "description", label: t("fields.description"), type: "textarea", defaultValue: org.description ?? "" } ]} />
    </AuthCard>
  );
}
