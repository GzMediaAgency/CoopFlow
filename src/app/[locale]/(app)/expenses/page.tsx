import { Plus, Receipt } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { EXPENSE_CATEGORIES } from "@/schemas/expense";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { listExpenses } from "@/services/expenses";
import { Link } from "@/i18n/routing";
import { DataList } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Pill } from "@/components/ui/pill";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
  const sp = await searchParams, t = await getTranslations("expenses"), tc = await getTranslations("expenseCategory"), tm = await getTranslations("paymentMethod"), locale = await getLocale();
  const ctx = await requirePermission("expenses:read");
  const category = EXPENSE_CATEGORIES.find((c) => c === sp.category);
  const { items, count, total, page, pages } = await listExpenses(ctx, { category, page: Number(sp.page) || 1 });
  const canWrite = ctx.permissions.has("expenses:write");

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1>
        {canWrite && <Link href="/expenses/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("add")}</Link>}</div>
      {count === 0 && !category ? <EmptyState icon={Receipt} title={t("empty.title")} text={t("empty.text")}>{canWrite && <Link href="/expenses/new" className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("empty.cta")}</Link>}</EmptyState> : (
        <>
          <div className="card mb-4 p-4"><p className="text-sm text-ink-muted">{t("total")}</p><p className="font-display text-2xl font-bold text-clay">{money(total, locale)}</p></div>
          <form className="mb-4 flex gap-2"><select name="category" defaultValue={category ?? ""} aria-label={t("fields.category")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm"><option value="">{t("allCategories")}</option>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{tc(c)}</option>)}</select>
            <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>{category && <Link href="/expenses" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}</form>
          {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p> : (
            <>
              <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
              <DataList columns={[t("cols.date"), t("cols.category"), t("cols.supplier"), t("cols.method"), t("cols.amount")]}
                rows={items.map((e) => ({ id: e.id, href: canWrite ? `/expenses/${e.id}/edit` : undefined, title: tc(e.category), subtitle: `${dateFmt(e.spentAt, locale)}${e.supplier ? ` · ${e.supplier.name}` : ""}`, right: money(e.amount, locale),
                  cells: [dateFmt(e.spentAt, locale), tc(e.category), e.supplier?.name ?? "—", e.onCredit ? <Pill key="c" tone="gold">{t("credit")}</Pill> : tm(e.method), <b key="a">{money(e.amount, locale)}</b>] }))} />
              <Pagination pathname="/expenses" query={{ category }} page={page} pages={pages} />
            </>)}
        </>)}
    </>
  );
}
