import { getLocale, getTranslations } from "next-intl/server";
import type { InvoiceStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { listInvoices } from "@/services/invoices";
import { Link } from "@/i18n/routing";
import { DataList } from "@/components/ui/data-list";
import { Pagination } from "@/components/ui/pagination";
import { Pill, invoiceTone } from "@/components/ui/pill";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { sendAllReminders } from "./actions";

const STATUSES: InvoiceStatus[] = ["ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; reminders?: string; error?: string }> }) {
  const sp = await searchParams, t = await getTranslations("invoices"), ts = await getTranslations("invoices.status"), locale = await getLocale();
  const ctx = await requirePermission("invoices:read");
  const q = sp.q?.trim().slice(0, 80) || undefined, status = STATUSES.find((s) => s === sp.status);
  const { items, count, billed, paid, page, pages } = await listInvoices(ctx, { q, status, page: Number(sp.page) || 1 });
  const stats = [[t("summary.billed"), billed, ""], [t("summary.paid"), paid, "text-canopy"], [t("summary.remaining"), billed - paid, "text-clay"]] as const;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1>
        {ctx.permissions.has("invoices:write") && <ConfirmAction tone="primary" action={sendAllReminders} label={t("remindAll")} title={t("remindAllTitle")} message={t("remindAllMessage")} confirmLabel={t("sendConfirm")} cancelLabel={(await getTranslations("common"))("cancel")} />}</div>
      {sp.reminders !== undefined && <p role="status" className="mb-4 rounded-lg bg-canopy-soft p-3 text-sm text-canopy">{t("remindersSent", { count: Number(sp.reminders) || 0 })}</p>}
      {sp.error && <p role="alert" className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{(await getTranslations("errors"))(["emailUnavailable", "emailRateLimit", "emailFailed"].includes(sp.error) ? sp.error : "generic")}</p>}
      <p className="mb-4 rounded-lg bg-field p-3 text-sm text-ink-muted">{t("hint")}</p>
      <dl className="mb-5 grid grid-cols-3 gap-3">{stats.map(([l, v, c]) => <div key={l} className="card p-3 lg:p-4"><dt className="text-xs text-ink-muted lg:text-sm">{l}</dt><dd className={`font-display text-base font-bold lg:text-xl ${c}`}>{money(v, locale)}</dd></div>)}</dl>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} type="search" placeholder={t("search")} aria-label={t("search")} className="min-w-0 flex-1 rounded-lg border border-line bg-white p-2.5 text-sm" />
        <select name="status" defaultValue={status ?? ""} aria-label={t("cols.status")} className="rounded-lg border border-line bg-white p-2.5 text-sm"><option value="">{t("allStatuses")}</option>{STATUSES.map((s) => <option key={s} value={s}>{ts(s)}</option>)}</select>
        <button className="rounded-lg bg-canopy px-4 py-2.5 text-sm font-medium text-white">OK</button>
        {(q || status) && <Link href="/invoices" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm">{t("reset")}</Link>}
      </form>
      {items.length === 0 ? <p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noResults")}</p> : (
        <>
          <p className="mb-2 text-sm text-ink-muted">{t("count", { count })}</p>
          <DataList columns={[t("cols.number"), t("cols.customer"), t("cols.date"), t("cols.due"), t("cols.status"), t("cols.total"), t("cols.paid")]}
            rows={items.map((i) => ({ id: i.id, href: `/invoices/${i.id}`, title: i.number, subtitle: `${i.customer.name} · ${dateFmt(i.issueDate, locale)}`,
              right: <><span className="block">{money(i.total, locale)}</span><Pill tone={invoiceTone(i.status)}>{ts(i.status)}</Pill></>,
              cells: [i.number, i.customer.name, dateFmt(i.issueDate, locale), dateFmt(i.dueDate, locale), <Pill key="s" tone={invoiceTone(i.status)}>{ts(i.status)}</Pill>, <b key="t">{money(i.total, locale)}</b>, money(i.amountPaid, locale)] }))} />
          <Pagination pathname="/invoices" query={{ q, status }} page={page} pages={pages} />
        </>)}
    </>
  );
}
