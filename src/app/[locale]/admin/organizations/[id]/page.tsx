import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { PLAN_CODES, SUB_STATUSES } from "@/schemas/modules";
import { requireSuperAdmin } from "@/lib/auth/session";
import { dateFmt } from "@/lib/format";
import { getOrganization } from "@/services/admin";
import { Link } from "@/i18n/routing";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { FieldsForm } from "@/components/ui/fields-form";
import { Pill } from "@/components/ui/pill";
import { changeSubscriptionAction, setOrgStatusAction } from "../../actions";

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params, t = await getTranslations("admin"), to = await getTranslations("orgStatus"), ts = await getTranslations("subStatus"), c = await getTranslations("common"), locale = await getLocale();
  if (!z.string().uuid().safeParse(id).success) notFound();
  const o = await getOrganization(id);
  if (!o) notFound();
  const sub = o.subscription, suspended = o.status === "SUSPENDED";
  const stats = Object.entries(o._count);
  return (
    <>
      <Link href="/admin/organizations" className="text-sm text-canopy hover:underline">← {t("tabs.organizations")}</Link>
      <div className="mb-5 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{o.name}</h1><p className="text-sm text-ink-muted">{[o.city, o.email, dateFmt(o.createdAt, locale)].filter(Boolean).join(" · ")}</p><div className="mt-2"><Pill tone={suspended ? "clay" : "green"}>{to(o.status)}</Pill></div></div>
        <ConfirmAction action={setOrgStatusAction.bind(null, id, suspended ? "ACTIVE" : "SUSPENDED")} label={suspended ? t("reactivate.label") : t("suspend.label")} title={suspended ? t("reactivate.title") : t("suspend.title")} message={suspended ? t("reactivate.message") : t("suspend.message")} confirmLabel={t("confirm")} cancelLabel={c("cancel")} tone={suspended ? "primary" : "danger"} />
      </div>
      <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">{stats.map(([k, v]) => <div key={k} className="card p-3"><dt className="text-xs text-ink-muted">{t(`stats.${k}`)}</dt><dd className="font-display text-lg font-bold">{v}</dd></div>)}</dl>
      <div className="grid gap-6 lg:grid-cols-2">
        <section><h2 className="mb-3 font-semibold">{t("subscription")}</h2>
          <FieldsForm action={changeSubscriptionAction.bind(null, id)} cancelHref={`/admin/organizations/${id}`} submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
            { name: "planCode", label: t("cols.plan"), type: "select", defaultValue: PLAN_CODES.find((p) => p === o.subscription?.plan.code) ?? "STARTER", options: PLAN_CODES.map((p) => ({ value: p, label: p })) },
            { name: "status", label: t("cols.subscription"), type: "select", defaultValue: sub?.status ?? "TRIALING", options: SUB_STATUSES.map((s) => ({ value: s, label: ts(s) })) },
            { name: "periodEnd", label: t("periodEnd"), type: "date", span: true, defaultValue: (sub?.currentPeriodEnd ?? sub?.trialEndsAt)?.toISOString().slice(0, 10) ?? "" }]} /></section>
        <section><h2 className="mb-3 font-semibold">{t("orgUsers")}</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">{o.users.map((u) => <li key={u.id} className="flex items-center justify-between gap-3 p-3"><span>{u.fullName}<span className="block text-xs text-ink-muted">{u.email} · {u.role?.name ?? "—"}</span></span><Pill tone={u.status === "ACTIVE" ? "green" : "gray"}>{u.status}</Pill></li>)}</ul></section>
      </div>
    </>
  );
}
