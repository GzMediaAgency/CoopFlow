import { Download, Plus, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { MEMBER_STATUSES } from "@/schemas/member";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { listMembers } from "@/services/members";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";

type SP = { q?: string; status?: string; page?: string };

export default async function MembersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams, t = await getTranslations("members"), locale = await getLocale();
  const ctx = await requirePermission("members:read");
  const status = MEMBER_STATUSES.find((s) => s === sp.status);
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const { items, count, hasAny, page, pages } = await listMembers(ctx, { q, status, page: Number(sp.page) || 1 });
  const canWrite = ctx.permissions.has("members:write"), canExport = ctx.permissions.has("members:export");
  const exportQs = new URLSearchParams(Object.entries({ q, status }).filter(([, v]) => v) as [string, string][]).toString();
  const fullName = (m: { firstName: string; lastName: string }) => `${m.firstName} ${m.lastName}`;
  const Avatar = ({ m }: { m: { firstName: string; lastName: string } }) => (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-canopy-soft text-sm font-semibold text-canopy" aria-hidden>{m.firstName[0]}{m.lastName[0]}</span>
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex gap-2">
          {canExport && hasAny && <a href={`/api/members/export?${exportQs}`} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm"><Download size={16} aria-hidden />{t("export")}</a>}
          {canWrite && <Link href="/members/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("add")}</Link>}
        </div>
      </div>

      {!hasAny ? (
        <EmptyState icon={Users} title={t("empty.title")} text={t("empty.text")}>
          {canWrite && <Link href="/members/new" className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("empty.cta")}</Link>}
        </EmptyState>
      ) : (
        <>
          <form className="mb-4 flex flex-wrap gap-2" role="search">
            <input name="q" defaultValue={q} type="search" placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
            <select name="status" defaultValue={status ?? ""} aria-label={t("fields.status")} className="rounded-lg border border-line bg-white p-2.5 text-sm">
              <option value="">{t("allStatuses")}</option>
              {MEMBER_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
            <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>
            {(q || status) && <Link href="/members" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
          </form>

          {items.length === 0 ? (
            <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p>
          ) : (
            <>
              <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
              {/* Bureau : tableau */}
              <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
                <table className="w-full text-sm">
                  <thead className="bg-field text-start text-ink-muted"><tr>
                    {["member", "cin", "phone", "joinedAt", "status", "shares", "balance"].map((c) => <th key={c} scope="col" className="px-4 py-3 text-start font-medium">{t(`cols.${c}`)}</th>)}
                  </tr></thead>
                  <tbody>{items.map((m) => (
                    <tr key={m.id} className="border-t border-line hover:bg-field">
                      <td className="px-4 py-3"><Link href={`/members/${m.id}`} className="flex items-center gap-3 font-medium hover:text-canopy"><Avatar m={m} /><span>{fullName(m)}<span className="block text-xs font-normal text-ink-muted">{m.memberNumber}</span></span></Link></td>
                      <td className="px-4 py-3">{m.cin ?? "—"}</td>
                      <td className="px-4 py-3" dir="ltr">{m.phone ?? "—"}</td>
                      <td className="px-4 py-3">{dateFmt(m.joinedAt, locale)}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} label={t(`status.${m.status}`)} /></td>
                      <td className="px-4 py-3">{m.shares} · {money(m.sharesAmount, locale)}</td>
                      <td className={`px-4 py-3 font-medium ${m.balance > 0 ? "text-danger" : "text-canopy"}`}>{money(m.balance, locale)}</td>
                    </tr>))}</tbody>
                </table>
              </div>
              {/* Mobile : cartes */}
              <ul className="grid gap-3 md:hidden">{items.map((m) => (
                <li key={m.id}><Link href={`/members/${m.id}`} className="block rounded-xl border border-line bg-white p-4">
                  <div className="flex items-center gap-3"><Avatar m={m} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{fullName(m)}</p><p className="text-xs text-ink-muted">{m.memberNumber} · {m.phone ?? "—"}</p></div><StatusBadge status={m.status} label={t(`status.${m.status}`)} /></div>
                  <div className="mt-3 flex justify-between text-sm"><span className="text-ink-muted">{m.shares} · {money(m.sharesAmount, locale)}</span><span className={m.balance > 0 ? "font-medium text-danger" : "text-canopy"}>{money(m.balance, locale)}</span></div>
                </Link></li>))}</ul>
              <Pagination pathname="/members" query={{ q, status }} page={page} pages={pages} />
            </>
          )}
        </>
      )}
    </>
  );
}
