import { getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/lib/auth/session";
import { listPlans } from "@/services/admin";
import { FieldsForm } from "@/components/ui/fields-form";
import { AdminTabs } from "../admin-tabs";
import { updatePlanAction } from "../actions";

export default async function PlansPage() {
  await requireSuperAdmin();
  const t = await getTranslations("admin"), c = await getTranslations("common");
  const plans = await listPlans();
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1><AdminTabs current="plans" />
      <p className="mb-4 text-sm text-ink-muted">{t("plansHint")}</p>
      <div className="grid gap-6 lg:grid-cols-3">{plans.map((p) => (
        <section key={p.id}><h2 className="mb-2 flex items-center justify-between font-semibold"><span>{p.name}</span><span className="text-sm font-normal text-ink-muted">{t("subscribers", { count: p._count.subscriptions })}</span></h2>
          <FieldsForm narrow action={updatePlanAction.bind(null, p.code)} cancelHref="/admin/plans" submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
            { name: "priceMonthly", label: t("plan.priceMonthly"), type: "number", required: true, step: "0.01", defaultValue: String(Number(p.priceMonthly)) },
            { name: "priceYearly", label: t("plan.priceYearly"), type: "number", step: "0.01", defaultValue: p.priceYearly ? String(Number(p.priceYearly)) : "" },
            { name: "maxUsers", label: t("plan.maxUsers"), type: "number", required: true, step: "1", defaultValue: String(p.maxUsers) },
            { name: "maxMembers", label: t("plan.maxMembers"), type: "number", step: "1", defaultValue: p.maxMembers ? String(p.maxMembers) : "", hint: t("plan.unlimited") }]} /></section>))}</div>
    </>
  );
}
