import { Download } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { AUDIT_ACTIONS, listAudit, parseAuditFilters } from "@/services/settings";
import { Link } from "@/i18n/routing";
import { Pagination } from "@/components/ui/pagination";
import { SettingsTabs } from "../settings-tabs";

export default async function ActivitySettings({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams, t = await getTranslations("settings"), ta = await getTranslations("auditAction"), locale = await getLocale();
  const ctx = await requirePermission("settings:read");
  const f = parseAuditFilters(sp);
  const { items, count, users, entities, page, pages } = await listAudit(ctx, f, Number(sp.page) || 1);
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-MA", { dateStyle: "short", timeStyle: "medium" });
  const q = Object.fromEntries(Object.entries({ user: f.userId, action: f.action, entity: f.entity, from: f.from, to: f.to }).filter(([, v]) => v)) as Record<string, string>;
  const filtered = Object.keys(q).length > 0, box = "rounded-lg border border-line bg-white p-2.5 text-sm";

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1><SettingsTabs current="activity" />
      <form className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-6" role="search">
        <select name="user" defaultValue={f.userId ?? ""} aria-label={t("audit.user")} className={box}><option value="">{t("audit.allUsers")}</option>{users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select>
        <select name="action" defaultValue={f.action ?? ""} aria-label={t("audit.action")} className={box}><option value="">{t("audit.allActions")}</option>{AUDIT_ACTIONS.map((a) => <option key={a} value={a}>{ta(a)}</option>)}</select>
        <select name="entity" defaultValue={f.entity ?? ""} aria-label={t("audit.entity")} className={box}><option value="">{t("audit.allEntities")}</option>{entities.map((e) => <option key={e} value={e}>{e}</option>)}</select>
        <input type="date" name="from" defaultValue={f.from} aria-label={t("audit.from")} className={box} /><input type="date" name="to" defaultValue={f.to} aria-label={t("audit.to")} className={box} />
        <div className="flex gap-2"><button className="flex-1 rounded-lg bg-canopy px-3 py-2.5 text-sm font-medium text-white">OK</button>{filtered && <Link href="/settings/activity" className="rounded-lg border border-line bg-white px-3 py-2.5 text-sm">{t("audit.reset")}</Link>}</div>
      </form>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-ink-muted">{t("activity.count", { count })}</p>
        {ctx.permissions.has("settings:export") && count > 0 && <a href={`/api/audit/export?${new URLSearchParams(q)}`} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm"><Download size={15} aria-hidden />{t("audit.export")}</a>}</div>
      {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("activity.none")}</p> :
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">{items.map((l) => (
          <li key={l.id} className="p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span><b>{l.user?.fullName ?? "—"}</b> · {ta(l.action)} · <span className="text-ink-muted">{l.entityType}</span></span><span className="text-xs text-ink-muted">{when.format(l.createdAt)}</span></div>
            {l.changes != null && <details className="mt-1"><summary className="cursor-pointer text-xs text-canopy">{t("audit.details")}</summary><pre dir="ltr" className="mt-1 max-h-40 overflow-auto rounded-lg bg-field p-2 text-xs">{JSON.stringify(l.changes, null, 2)}</pre></details>}</li>))}</ul>}
      <Pagination pathname="/settings/activity" query={q} page={page} pages={pages} />
    </>
  );
}
