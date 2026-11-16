import { Plus, Truck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { money } from "@/lib/format";
import { requirePermission } from "@/lib/auth/session";
import { listSuppliersPaged } from "@/services/suppliers";
import { Link } from "@/i18n/routing";
import { DataList } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams, t = await getTranslations("suppliers"), locale = await getLocale();
  const ctx = await requirePermission("suppliers:read");
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const { items, count, hasAny, page, pages } = await listSuppliersPaged(ctx, { q, page: Number(sp.page) || 1 });
  const canWrite = ctx.permissions.has("suppliers:write");
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1>
        {canWrite && <Link href="/suppliers/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("add")}</Link>}</div>
      {!hasAny ? <EmptyState icon={Truck} title={t("empty.title")} text={t("empty.text")}>{canWrite && <Link href="/suppliers/new" className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("empty.cta")}</Link>}</EmptyState> : (
        <>
          <form className="mb-4 flex gap-2" role="search"><input name="q" defaultValue={q} type="search" placeholder={t("search")} aria-label={t("search")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
            <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>{q && <Link href="/suppliers" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}</form>
          {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p> : (
            <>
              <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
              <DataList columns={[t("fields.name"), t("fields.company"), t("fields.phone"), t("fields.email"), t("cols.debt")]}
                rows={items.map((s) => ({ id: s.id, href: `/suppliers/${s.id}`, title: s.name, subtitle: s.company ?? s.email ?? "", right: <span className={s.debt > 0.005 ? "text-clay" : ""}>{s.debt > 0.005 ? money(s.debt, locale) : ""}</span>, cells: [s.name, s.company ?? "—", <span key="p" dir="ltr">{s.phone ?? "—"}</span>, s.email ?? "—", <b key="d" className={s.debt > 0.005 ? "text-clay" : "text-canopy"}>{money(s.debt, locale)}</b>] }))} />
              <Pagination pathname="/suppliers" query={{ q }} page={page} pages={pages} />
            </>)}
        </>)}
    </>
  );
}
