import { FolderOpen, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { DOCUMENT_CATEGORIES } from "@/schemas/modules";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt } from "@/lib/format";
import { listDocuments } from "@/services/documents";
import { Link } from "@/i18n/routing";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { DataList } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Pill } from "@/components/ui/pill";
import { removeDocument } from "./actions";

const size = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1)} Mo`);

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; page?: string }> }) {
  const sp = await searchParams, t = await getTranslations("documents"), tc = await getTranslations("documentCategory"), c = await getTranslations("common"), locale = await getLocale();
  const ctx = await requirePermission("documents:read");
  const q = sp.q?.trim().slice(0, 80) || undefined, category = DOCUMENT_CATEGORIES.find((x) => x === sp.category);
  const { items, count, hasAny, page, pages } = await listDocuments(ctx, { q, category, page: Number(sp.page) || 1 });
  const canWrite = ctx.permissions.has("documents:write"), canDelete = ctx.permissions.has("documents:delete");
  const expiry = (d: Date | null) => {
    if (!d) return "—";
    const days = Math.ceil((d.getTime() - Date.now()) / 864e5);
    return days < 0 ? <Pill tone="clay">{t("expired")}</Pill> : days <= 30 ? <Pill tone="gold">{t("expiresIn", { days })}</Pill> : dateFmt(d, locale);
  };
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1>
        {canWrite && <Link href="/documents/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("add")}</Link>}</div>
      {!hasAny ? <EmptyState icon={FolderOpen} title={t("empty.title")} text={t("empty.text")}>{canWrite && <Link href="/documents/new" className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("empty.cta")}</Link>}</EmptyState> : (
        <>
          <form className="mb-4 flex flex-wrap gap-2" role="search">
            <input name="q" defaultValue={q} type="search" placeholder={t("search")} aria-label={t("search")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
            <select name="category" defaultValue={category ?? ""} aria-label={t("fields.category")} className="rounded-lg border border-line bg-white p-2.5 text-sm"><option value="">{t("allCategories")}</option>{DOCUMENT_CATEGORIES.map((x) => <option key={x} value={x}>{tc(x)}</option>)}</select>
            <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>
            {(q || category) && <Link href="/documents" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
          </form>
          {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p> : (
            <>
              <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
              <DataList columns={[t("cols.name"), t("cols.category"), t("cols.size"), t("cols.expires"), t("cols.actions")]}
                rows={items.map((d) => { const actions = (
                  <span className="flex flex-wrap items-center gap-2 text-sm font-normal">
                    <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-canopy hover:underline">{t("open")}</a>
                    <a href={`/api/documents/${d.id}?download=1`} className="text-canopy hover:underline">{t("download")}</a>
                    {canDelete && <ConfirmAction action={removeDocument.bind(null, d.id)} label={t("delete.label")} title={t("delete.title")} message={t("delete.message")} confirmLabel={t("delete.confirm")} cancelLabel={c("cancel")} />}</span>);
                  return { id: d.id, title: d.name, subtitle: `${tc(d.category)} · ${size(d.sizeBytes)}`, right: actions, cells: [<span key="n" className="font-medium">{d.name}</span>, tc(d.category), size(d.sizeBytes), expiry(d.expiresAt), actions] }; })} />
              <Pagination pathname="/documents" query={{ q, category }} page={page} pages={pages} />
            </>)}
        </>)}
    </>
  );
}
