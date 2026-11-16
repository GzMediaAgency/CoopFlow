import { getLocale, getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/lib/auth/session";
import { dateFmt } from "@/lib/format";
import { listAllUsers } from "@/services/admin";
import { Link } from "@/i18n/routing";
import { Pill } from "@/components/ui/pill";
import { AdminTabs } from "../admin-tabs";
import { setUserStatusAction } from "../actions";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSuperAdmin();
  const sp = await searchParams, t = await getTranslations("admin"), locale = await getLocale();
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const users = await listAllUsers(q);
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1><AdminTabs current="users" />
      <form className="mb-4 flex gap-2" role="search"><input name="q" defaultValue={q} type="search" placeholder={t("searchUsers")} aria-label={t("searchUsers")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" /><button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button></form>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white">{users.map((u) => (
        <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div className="min-w-0"><p className="font-medium">{u.fullName}{u.isSuperAdmin && <span className="ms-2 rounded bg-argan px-1.5 py-0.5 text-[10px] font-semibold text-forest">{t("badge")}</span>}</p>
            <p className="text-xs text-ink-muted">{u.email} · {u.organization ? <Link href={`/admin/organizations/${u.organization.id}`} className="text-canopy hover:underline">{u.organization.name}</Link> : "—"} · {u.role?.name ?? "—"} · {dateFmt(u.createdAt, locale)}</p></div>
          <div className="flex items-center gap-2"><Pill tone={u.status === "ACTIVE" ? "green" : "gray"}>{u.status}</Pill>
            {!u.isSuperAdmin && <form action={setUserStatusAction.bind(null, u.id, u.status === "ACTIVE" ? "DISABLED" : "ACTIVE")}><button className="rounded-lg border border-line px-3 py-2 text-sm">{u.status === "ACTIVE" ? t("disable") : t("enable")}</button></form>}</div></li>))}</ul>
    </>
  );
}
