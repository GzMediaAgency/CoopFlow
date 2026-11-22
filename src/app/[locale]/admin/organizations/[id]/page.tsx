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
import { changeSubscriptionAction, extendTrialAction, setOrgStatusAction } from "../../actions";
import { Clock, ShieldAlert, CheckCircle, Ban } from "lucide-react";

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params, t = await getTranslations("admin"), to = await getTranslations("orgStatus"), ts = await getTranslations("subStatus"), c = await getTranslations("common"), locale = await getLocale();
  if (!z.string().uuid().safeParse(id).success) notFound();
  const o = await getOrganization(id);
  if (!o) notFound();
  const sub = o.subscription;
  const stats = Object.entries(o._count);

  const statusTone = o.status === "ACTIVE" ? "green" : o.status === "SUSPENDED" ? "clay" : "gray";

  const daysRemaining = sub?.trialEndsAt
    ? Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / 864e5)
    : null;
  const isTrialActive = sub?.status === "TRIALING" && daysRemaining !== null && daysRemaining > 0;

  return (
    <>
      <Link href="/admin/organizations" className="text-sm text-canopy hover:underline">← {t("tabs.organizations")}</Link>

      {/* En-tête avec les 3 commandes de statut */}
      <div className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-ink">{o.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">{[o.city, o.email, dateFmt(o.createdAt, locale)].filter(Boolean).join(" · ")}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <Pill tone={statusTone}>{to(o.status)}</Pill>
            {sub && <span className="text-xs text-ink-muted">· {sub.plan.name} ({ts(sub.status)})</span>}
          </div>
        </div>

        {/* Commandes Activer / Suspendre / Désactiver */}
        <div className="flex items-center gap-2 flex-wrap">
          {o.status !== "ACTIVE" && (
            <ConfirmAction
              action={setOrgStatusAction.bind(null, id, "ACTIVE", `/admin/organizations/${id}`)}
              label={t("activate")}
              title={t("activateTitle")}
              message={t("activateMessage")}
              confirmLabel={t("confirm")}
              cancelLabel={c("cancel")}
              tone="primary"
            />
          )}

          {o.status !== "SUSPENDED" && (
            <ConfirmAction
              action={setOrgStatusAction.bind(null, id, "SUSPENDED", `/admin/organizations/${id}`)}
              label={t("suspend.label")}
              title={t("suspend.title")}
              message={t("suspend.message")}
              confirmLabel={t("confirm")}
              cancelLabel={c("cancel")}
              tone="danger"
            />
          )}

          {o.status !== "CLOSED" && (
            <ConfirmAction
              action={setOrgStatusAction.bind(null, id, "CLOSED", `/admin/organizations/${id}`)}
              label={t("close")}
              title={t("closeTitle")}
              message={t("closeMessage")}
              confirmLabel={t("confirm")}
              cancelLabel={c("cancel")}
              tone="danger"
            />
          )}
        </div>
      </div>

      {/* Carte spéciale : Gestion rapide de la période d'essai */}
      <section className="mb-6 rounded-xl border border-argan/60 bg-argan-soft/40 p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-argan text-forest shrink-0 mt-0.5">
              <Clock size={20} aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold text-forest text-base">{t("trialInfo")}</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                {sub?.trialEndsAt
                  ? isTrialActive
                    ? `${t("trialDaysLeft", { days: daysRemaining })} (fin le ${dateFmt(sub.trialEndsAt, locale)})`
                    : `${t("trialExpired")} (expiré le ${dateFmt(sub.trialEndsAt, locale)})`
                  : t("sub.none")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <form action={extendTrialAction.bind(null, id, 30, `/admin/organizations/${id}`)}>
              <button
                type="submit"
                className="rounded-lg bg-forest px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-forest-2 transition-colors"
              >
                {t("extend30")}
              </button>
            </form>
            <form action={extendTrialAction.bind(null, id, 15, `/admin/organizations/${id}`)}>
              <button
                type="submit"
                className="rounded-lg border border-forest/30 bg-white px-3 py-2 text-xs font-semibold text-forest shadow-xs hover:bg-forest/5 transition-colors"
              >
                {t("extend15")}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Statistiques */}
      <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">{stats.map(([k, v]) => <div key={k} className="card p-3"><dt className="text-xs text-ink-muted">{t(`stats.${k}`)}</dt><dd className="font-display text-lg font-bold">{v}</dd></div>)}</dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><h2 className="mb-3 font-semibold">{t("subscription")}</h2>
          <FieldsForm action={changeSubscriptionAction.bind(null, id)} cancelHref={`/admin/organizations/${id}`} submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
            { name: "planCode", label: t("cols.plan"), type: "select", defaultValue: PLAN_CODES.find((p) => p === o.subscription?.plan.code) ?? "STARTER", options: PLAN_CODES.map((p) => ({ value: p, label: p })) },
            { name: "status", label: t("cols.subscription"), type: "select", defaultValue: sub?.status ?? "TRIALING", options: SUB_STATUSES.map((s) => ({ value: s, label: ts(s) })) },
            { name: "periodEnd", label: t("periodEnd"), type: "date", span: true, defaultValue: (sub?.currentPeriodEnd ?? sub?.trialEndsAt)?.toISOString().slice(0, 10) ?? "" }]} /></section>
        <section className="card p-5"><h2 className="mb-3 font-semibold">{t("orgUsers")}</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">{o.users.map((u) => <li key={u.id} className="flex items-center justify-between gap-3 p-3"><span>{u.fullName}<span className="block text-xs text-ink-muted">{u.email} · {u.role?.name ?? "—"}</span></span><Pill tone={u.status === "ACTIVE" ? "green" : "gray"}>{u.status}</Pill></li>)}</ul></section>
      </div>
    </>
  );
}
