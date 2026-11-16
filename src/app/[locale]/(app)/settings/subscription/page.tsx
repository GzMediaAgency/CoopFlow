import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { subscriptionInfo, PLANS_CATALOG } from "@/services/settings";
import { SettingsTabs } from "../settings-tabs";
import { Link } from "@/i18n/routing";

export default async function SubscriptionSettings() {
  const t = await getTranslations("settings");
  const ts = await getTranslations("subStatus");
  const locale = await getLocale();
  const ctx = await requirePermission("settings:read");
  const { sub, users, members, currentPlanCode, isExpired } = await subscriptionInfo(ctx);

  const bar = (used: number, max: number | null) =>
    max ? (
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-field">
        <div
          className={`h-full ${used / max > 0.9 ? "bg-clay" : "bg-canopy"}`}
          style={{ width: `${Math.min(100, (used / max) * 100)}%` }}
        />
      </div>
    ) : null;

  // Si abonné : afficher le plan actuel et les plans suivants (supérieurs). Sinon : tous les plans.
  const currentRank = PLANS_CATALOG.find((p) => p.code === currentPlanCode)?.rank ?? 0;
  const visiblePlans = sub
    ? PLANS_CATALOG.filter((p) => p.rank >= currentRank)
    : PLANS_CATALOG;

  const isAr = locale === "ar";

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      <SettingsTabs current="subscription" />

      {/* Plan actuel — affiché seulement si abonné */}
      {sub && (
        <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
          {isExpired && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:col-span-2">
              {t("sub.expiredAlert")}
            </p>
          )}
          <section className="card p-5">
            <p className="text-sm text-ink-muted">{t("sub.plan")}</p>
            <p className="font-display text-2xl font-bold">{sub.plan.name}</p>
            <p className="text-sm text-ink-muted">
              {money(sub.plan.priceYearly ?? (Number(sub.plan.priceMonthly) * 12), locale)} / {t("sub.year")}
            </p>
            <p className="mt-3 text-sm">
              {ts(sub.status)}
              {sub.status === "TRIALING" && sub.trialEndsAt &&
                ` — ${t("sub.trialEnds", { date: dateFmt(sub.trialEndsAt, locale) })}`}
            </p>
          </section>
          <section className="card p-5">
            <p className="text-sm">
              {t("sub.users")} : <b>{users}</b> / {sub.plan.maxUsers}
            </p>
            {bar(users, sub.plan.maxUsers)}
            <p className="mt-4 text-sm">
              {t("sub.members")} : <b>{members}</b> / {sub.plan.maxMembers ?? "∞"}
            </p>
            {bar(members, sub.plan.maxMembers)}
          </section>
        </div>
      )}

      {/* Grille des plans */}
      <div className="mt-8 max-w-4xl">
        <h2 className="text-lg font-semibold">{t("sub.plansTitle")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("sub.plansSubtitle")}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePlans.map((plan) => {
            const isCurrent = plan.code === currentPlanCode;
            const isUpgrade = plan.rank > currentRank;
            const badge = isCurrent
              ? t("sub.currentBadge")
              : isUpgrade
              ? t("sub.upgradeBadge")
              : !sub
              ? t("sub.activateBadge")
              : t("sub.lowerBadge");

            return (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-xl border p-5 shadow-sm ${
                  isCurrent
                    ? "border-canopy bg-canopy/5 ring-2 ring-canopy"
                    : "border-line bg-white"
                }`}
              >
                {/* Badge plan (Recommandé, Complet…) */}
                {(isAr ? plan.badgeAr : plan.badge) && (
                  <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    {isAr ? plan.badgeAr : plan.badge}
                  </span>
                )}

                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {badge}
                </p>
                <p className="mt-1 text-xl font-bold text-ink">
                  {isAr ? plan.nameAr : plan.name}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-canopy">
                  {plan.priceYearly.toLocaleString(isAr ? "ar-MA" : "fr-MA")}{" "}
                  <span className="text-sm font-medium text-ink-muted">
                    {isAr ? "درهم / سنة" : "DH / an"}
                  </span>
                </p>
                <p className="text-xs text-ink-muted">
                  {isAr ? "اشتراك سنوي" : "Abonnement annuel"}
                </p>

                <div className="mt-3 flex gap-3 text-xs text-ink-muted">
                  <span>👤 {plan.maxUsers} {t("sub.users")}</span>
                  <span>
                    👥{" "}
                    {plan.maxMembers === null
                      ? t("sub.unlimited")
                      : plan.maxMembers}{" "}
                    {t("sub.members")}
                  </span>
                </div>

                <ul className="mt-4 space-y-1.5 text-xs text-ink-muted flex-1">
                  {(isAr ? plan.featuresAr : plan.features).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-0.5 text-canopy">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <Link
                    href="/settings/contact"
                    className="mt-5 block rounded-lg bg-canopy py-2 text-center text-sm font-semibold text-white transition hover:bg-canopy/90"
                  >
                    {badge}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bloc paiement CIH */}
      <div className="mt-8 max-w-2xl rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-ink">{t("sub.bankTitle")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("sub.bankDesc")}</p>
        <ul className="mt-3 space-y-1 text-sm">
          <li><span className="font-medium text-ink-muted">🏦 </span>{t("sub.bankName")}</li>
          <li><span className="font-medium text-ink-muted">🔢 </span>{t("sub.bankRib")}</li>
          <li><span className="font-medium text-ink-muted">📞 </span>{t("sub.bankPhone")}</li>
          <li><span className="font-medium text-ink-muted">✉️ </span>{t("sub.bankEmail")}</li>
        </ul>
        <Link
          href="/settings/contact"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-canopy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-canopy/90"
        >
          {t("sub.goToContact")}
        </Link>
      </div>
    </>
  );
}
