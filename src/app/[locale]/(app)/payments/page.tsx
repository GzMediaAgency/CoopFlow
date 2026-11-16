import { Plus, Wallet } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { PaymentMethod } from "@prisma/client";
import { METHODS } from "@/schemas/payment";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { listPayments } from "@/services/payments";
import { Link } from "@/i18n/routing";
import { DataList } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ q?: string; method?: string; page?: string }> }) {
  const sp = await searchParams, t = await getTranslations("payments"), tm = await getTranslations("paymentMethod"), locale = await getLocale();
  const ctx = await requirePermission("payments:read");
  const q = sp.q?.trim().slice(0, 80) || undefined, method = METHODS.find((m) => m === sp.method) as PaymentMethod | undefined;
  const { items, count, total, page, pages } = await listPayments(ctx, { q, method, page: Number(sp.page) || 1 });
  const canWrite = ctx.permissions.has("payments:write"), filtered = !!(q || method);
  const who = (p: (typeof items)[number]) => p.customer?.name ?? p.supplier?.name ?? (p.member ? `${p.member.firstName} ${p.member.lastName}` : "—");

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1>
        {canWrite && <Link href="/payments/new" className="inline-flex items-center gap-2 rounded-lg bg-canopy px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} aria-hidden />{t("add")}</Link>}</div>
      {count === 0 && !filtered ? <EmptyState icon={Wallet} title={t("empty.title")} text={t("empty.text")} /> : (
        <>
          <div className="card mb-4 p-4"><p className="text-sm text-ink-muted">{t("totalIn")}</p><p className="font-display text-2xl font-bold text-canopy">{money(total, locale)}</p></div>
          <form className="mb-4 flex flex-wrap gap-2" role="search">
            <input name="q" defaultValue={q} type="search" placeholder={t("search")} aria-label={t("search")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
            <select name="method" defaultValue={method ?? ""} aria-label={t("fields.method")} className="rounded-lg border border-line bg-white p-2.5 text-sm"><option value="">{t("allMethods")}</option>{METHODS.map((m) => <option key={m} value={m}>{tm(m)}</option>)}</select>
            <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>
            {filtered && <Link href="/payments" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
          </form>
          {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p> : (
            <>
              <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
              <DataList columns={[t("cols.date"), t("cols.from"), t("cols.invoice"), t("cols.method"), t("cols.amount")]}
                rows={items.map((p) => ({ id: p.id, href: p.invoice ? `/invoices/${p.invoice.id}` : undefined, title: who(p), subtitle: `${dateFmt(p.paidAt, locale)} · ${tm(p.method)}${p.invoice ? ` · ${p.invoice.number}` : ""}`, right: <span className={p.direction === "OUT" ? "text-clay" : "text-canopy"}>{p.direction === "OUT" ? "−" : "+"} {money(p.amount, locale)}</span>,
                  cells: [dateFmt(p.paidAt, locale), who(p), p.invoice?.number ?? "—", tm(p.method), <b key="a" className={p.direction === "OUT" ? "text-clay" : "text-canopy"}>{p.direction === "OUT" ? "−" : "+"} {money(p.amount, locale)}</b>] }))} />
              <Pagination pathname="/payments" query={{ q, method }} page={page} pages={pages} />
            </>)}
        </>)}
    </>
  );
}
