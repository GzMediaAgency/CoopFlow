import { getLocale, getTranslations } from "next-intl/server";
import { Building2, Database, Users, Wallet } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/session";
import { money } from "@/lib/format";
import { overview } from "@/services/admin";
import { AdminTabs } from "./admin-tabs";

export default async function AdminHome() {
  await requireSuperAdmin();
  const t = await getTranslations("admin"), ts = await getTranslations("subStatus"), locale = await getLocale();
  const o = await overview();
  const cards = [[t("kpi.orgs"), `${o.active} / ${o.orgs}`, Building2, "text-canopy bg-canopy/10"], [t("kpi.fresh"), String(o.fresh), Building2, "text-sky bg-sky/10"], [t("kpi.users"), String(o.users), Users, "text-gold-deep bg-argan/25"], [t("kpi.mrr"), money(o.mrr, locale), Wallet, "text-clay bg-clay/10"]] as const;
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1><AdminTabs current="overview" />
      <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([l, v, Icon, tint]) => <div key={l} className="card p-4"><span className={`grid size-9 place-items-center rounded-xl ${tint}`}><Icon size={18} aria-hidden /></span><dt className="mt-2 text-sm text-ink-muted">{l}</dt><dd className="font-display text-xl font-bold">{v}</dd></div>)}</dl>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:p-6"><h2 className="mb-2 font-semibold">{t("subs")}</h2>{o.subs.length === 0 ? <p className="text-sm text-ink-muted">{t("none")}</p> :
          <ul className="divide-y divide-line text-sm">{o.subs.map((s) => <li key={s.status} className="flex justify-between py-2"><span>{ts(s.status)}</span><b>{s._count}</b></li>)}</ul>}</section>
        <section className="card p-4 lg:p-6"><h2 className="mb-2 font-semibold">{t("byPlan")}</h2>{o.byPlan.length === 0 ? <p className="text-sm text-ink-muted">{t("none")}</p> :
          <ul className="divide-y divide-line text-sm">{o.byPlan.map(([p, n]) => <li key={p} className="flex justify-between py-2"><span>{p}</span><b>{n}</b></li>)}</ul>}</section>
        <section className="card p-4 lg:p-6"><h2 className="mb-2 flex items-center gap-2 font-semibold"><Database size={16} aria-hidden />{t("usage")}</h2>
          <ul className="divide-y divide-line text-sm"><li className="flex justify-between py-2"><span>{t("kpi.members")}</span><b>{o.members}</b></li><li className="flex justify-between py-2"><span>{t("kpi.sales")}</span><b>{o.sales}</b></li></ul></section>
      </div>
    </>
  );
}
