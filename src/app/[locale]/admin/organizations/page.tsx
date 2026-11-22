import { getLocale, getTranslations } from "next-intl/server";
import type { OrgStatus } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/auth/session";
import { dateFmt } from "@/lib/format";
import { listOrganizations } from "@/services/admin";
import { Link } from "@/i18n/routing";
import { DataList } from "@/components/ui/data-list";
import { Pagination } from "@/components/ui/pagination";
import { Pill } from "@/components/ui/pill";
import { AdminTabs } from "../admin-tabs";
import { extendTrialAction, setOrgStatusAction } from "../actions";

const STATUSES: OrgStatus[] = ["ACTIVE", "SUSPENDED", "CLOSED"];

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireSuperAdmin();
  const sp = await searchParams, t = await getTranslations("admin"), to = await getTranslations("orgStatus"), ts = await getTranslations("subStatus"), locale = await getLocale();
  const q = sp.q?.trim().slice(0, 80) || undefined, status = STATUSES.find((s) => s === sp.status);
  const { items, count, page, pages } = await listOrganizations({ q, status, page: Number(sp.page) || 1 });

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1><AdminTabs current="organizations" />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} type="search" placeholder={t("search")} aria-label={t("search")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
        <select name="status" defaultValue={status ?? ""} aria-label={t("cols.status")} className="rounded-lg border border-line bg-white p-2.5 text-sm"><option value="">{t("allStatuses")}</option>{STATUSES.map((s) => <option key={s} value={s}>{to(s)}</option>)}</select>
        <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>{(q || status) && <Link href="/admin/organizations" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
      </form>
      {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("none")}</p> : (
        <>
          <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
          <DataList columns={[t("cols.name"), t("cols.city"), t("cols.plan"), t("cols.subscription"), t("cols.users"), t("cols.status"), t("cols.created"), t("cols.actions")]}
            rows={items.map((o) => {
              const isTrial = o.subscription?.status === "TRIALING";
              const subText = o.subscription
                ? isTrial && o.subscription.trialEndsAt
                  ? `${ts("TRIALING")} (${dateFmt(o.subscription.trialEndsAt, locale)})`
                  : ts(o.subscription.status)
                : "—";

              const statusTone = o.status === "ACTIVE" ? "green" : o.status === "SUSPENDED" ? "clay" : "gray";

              const actionButtons = (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Bouton Prolonger l'essai (+30 jours) */}
                  <form action={extendTrialAction.bind(null, o.id, 30, "/admin/organizations")}>
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md border border-argan/70 bg-argan-soft px-2.5 py-1 text-xs font-semibold text-gold-deep hover:bg-argan hover:text-forest transition-colors shadow-2xs"
                      title={t("extendTrial")}
                    >
                      {t("extendTrial")}
                    </button>
                  </form>

                  {/* Actions de statut rapides */}
                  {o.status === "ACTIVE" ? (
                    <form action={setOrgStatusAction.bind(null, o.id, "SUSPENDED", "/admin/organizations")}>
                      <button
                        type="submit"
                        className="rounded-md border border-clay/50 bg-clay/10 px-2 py-1 text-xs font-medium text-clay hover:bg-clay hover:text-white transition-colors"
                        title={t("suspendAction")}
                      >
                        {t("suspendAction")}
                      </button>
                    </form>
                  ) : (
                    <form action={setOrgStatusAction.bind(null, o.id, "ACTIVE", "/admin/organizations")}>
                      <button
                        type="submit"
                        className="rounded-md border border-canopy/50 bg-canopy-soft px-2 py-1 text-xs font-medium text-canopy hover:bg-canopy hover:text-white transition-colors"
                        title={t("activate")}
                      >
                        {t("activate")}
                      </button>
                    </form>
                  )}

                  {o.status !== "CLOSED" && (
                    <form action={setOrgStatusAction.bind(null, o.id, "CLOSED", "/admin/organizations")}>
                      <button
                        type="submit"
                        className="rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-ink-muted hover:bg-red-50 hover:text-danger hover:border-danger/30 transition-colors"
                        title={t("close")}
                      >
                        {t("close")}
                      </button>
                    </form>
                  )}

                  <Link
                    href={`/admin/organizations/${o.id}`}
                    className="rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-ink-muted hover:text-canopy hover:border-canopy transition-colors"
                  >
                    {t("manage")} →
                  </Link>
                </div>
              );

              return {
                id: o.id,
                href: `/admin/organizations/${o.id}`,
                title: o.name,
                subtitle: `${o.city ?? "—"} · ${o.subscription?.plan.name ?? "—"}`,
                right: <Pill tone={statusTone}>{to(o.status)}</Pill>,
                cells: [
                  o.name,
                  o.city ?? "—",
                  o.subscription?.plan.name ?? "—",
                  subText,
                  o._count.users,
                  <Pill key="s" tone={statusTone}>{to(o.status)}</Pill>,
                  dateFmt(o.createdAt, locale),
                  actionButtons,
                ],
              };
            })} />
          <Pagination pathname="/admin/organizations" query={{ q, status }} page={page} pages={pages} />
        </>)}
    </>
  );
}
