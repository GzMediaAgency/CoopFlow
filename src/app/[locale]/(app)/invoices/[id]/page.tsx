import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { getInvoice } from "@/services/invoices";
import { Link } from "@/i18n/routing";
import { Pill, invoiceTone } from "@/components/ui/pill";
import { PrintButton } from "@/components/ui/print-button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { waConfigured } from "@/services/whatsapp";
import { sendInvoiceEmail, sendInvoiceWhatsApp, sendReceiptEmail, sendReminderEmail, sendReminderWhatsApp } from "../actions";

const KNOWN = ["waUnavailable", "waDisabled", "customerNoPhone", "waRateLimit", "waFailed", "emailUnavailable", "customerNoEmail", "emailRateLimit", "emailFailed", "reminderRecent", "invoiceNotPayable", "invoiceNotFound"];
const FLASH = ["invoice", "reminder", "receipt", "wa"];

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { id } = await params, sp = await searchParams, te = await getTranslations("errors"), c = await getTranslations("common"), t = await getTranslations("invoices"), ts = await getTranslations("invoices.status"), tm = await getTranslations("paymentMethod"), locale = await getLocale();
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("invoices:read");
  const inv = await getInvoice(ctx, id);
  if (!inv) notFound();
  const org = ctx.org, remaining = Number(inv.total) - Number(inv.amountPaid), open = ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status);
  const m = (v: unknown) => money(v, locale);
  const canEmail = ctx.permissions.has("invoices:write"), email = inv.customer.email;
  const wa = canEmail && waConfigured() && ctx.org.whatsappEnabled && !!inv.customer.phone;

  return (
    <>
      {sp.sent && FLASH.includes(sp.sent) && <p role="status" className="mb-4 rounded-lg bg-canopy-soft p-3 text-sm text-canopy print:hidden">{t(`flash.${sp.sent}`, { email: email ?? "" })}</p>}
      {sp.error && <p role="alert" className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger print:hidden">{te(KNOWN.includes(sp.error) ? sp.error : "generic")}</p>}
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <PrintButton label={t("print")} />
        {canEmail && inv.status !== "CANCELLED" && inv.status !== "DRAFT" && (email
          ? <ConfirmAction tone="primary" action={sendInvoiceEmail.bind(null, id)} label={t("sendEmail")} title={t("sendTitle")} message={t("sendMessage", { email })} confirmLabel={t("sendConfirm")} cancelLabel={c("cancel")} />
          : <Link href={`/customers/${inv.customerId}/edit`} className="rounded-lg border border-line bg-white px-4 py-2 text-sm text-ink-muted">{t("noEmail")}</Link>)}
        {canEmail && open && email && <ConfirmAction tone="primary" action={sendReminderEmail.bind(null, id)} label={t("sendReminder")} title={t("reminderTitle")} message={t("sendMessage", { email })} confirmLabel={t("sendConfirm")} cancelLabel={c("cancel")} />}
        {wa && inv.status !== "CANCELLED" && inv.status !== "DRAFT" && <ConfirmAction tone="primary" action={sendInvoiceWhatsApp.bind(null, id)} label={t("sendWhatsapp")} title={t("waTitle")} message={t("waMessage", { phone: inv.customer.phone ?? "" })} confirmLabel={t("sendConfirm")} cancelLabel={c("cancel")} />}
        {wa && open && <ConfirmAction tone="primary" action={sendReminderWhatsApp.bind(null, id)} label={t("sendWhatsappReminder")} title={t("waTitle")} message={t("waMessage", { phone: inv.customer.phone ?? "" })} confirmLabel={t("sendConfirm")} cancelLabel={c("cancel")} />}
        {open && ctx.permissions.has("payments:write") && <Link href={`/payments/new?invoice=${id}`} className="rounded-lg bg-canopy px-4 py-2 text-sm font-semibold text-white">{t("pay")}</Link>}
      </div>
      <article className="card max-w-4xl p-5 lg:p-10 print:max-w-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div className="text-sm">
            <p className="font-display text-xl font-bold text-forest">{org.name}</p>
            {(org.address || org.city) && <p>{[org.address, org.city].filter(Boolean).join(", ")}</p>}
            {org.phone && <p dir="ltr">{org.phone}</p>}{org.email && <p>{org.email}</p>}
            <p className="mt-1 text-ink-muted">{[org.ice && `${t("ice")} ${org.ice}`, org.taxId && `${t("taxId")} ${org.taxId}`].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="text-end"><p className="text-sm font-semibold tracking-widest text-gold-deep">{t("invoice")}</p><p className="font-display text-2xl font-bold">{inv.number}</p>
            <p className="text-sm text-ink-muted">{t("issueDate")} : {dateFmt(inv.issueDate, locale)}</p><p className="text-sm text-ink-muted">{t("dueDate")} : {dateFmt(inv.dueDate, locale)}</p>
            <div className="mt-2 print:hidden"><Pill tone={invoiceTone(inv.status)}>{ts(inv.status)}</Pill></div></div>
        </header>
        <section className="py-5 text-sm"><p className="text-ink-muted">{t("billedTo")}</p><p className="font-semibold">{inv.customer.name}</p>
          {inv.customer.company && <p>{inv.customer.company}</p>}{(inv.customer.address || inv.customer.city) && <p>{[inv.customer.address, inv.customer.city].filter(Boolean).join(", ")}</p>}{inv.customer.ice && <p>{t("ice")} {inv.customer.ice}</p>}</section>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-y border-line bg-field text-ink-muted"><tr>{["product", "qty", "price", "vat", "total"].map((k) => <th key={k} className="px-3 py-2 text-start font-medium">{t(`lines.${k}`)}</th>)}</tr></thead>
          <tbody>{inv.items.map((i) => (
            <tr key={i.id} className="border-b border-line"><td className="px-3 py-2.5">{i.description}</td><td className="px-3">{Number(i.quantity)}</td>
              <td className="px-3">{m(i.unitPrice)}{Number(i.discount) > 0 && <span className="block text-xs text-clay">− {m(i.discount)}</span>}</td><td className="px-3">{Number(i.vatRate)} %</td><td className="px-3 font-medium">{m(i.lineTotal)}</td></tr>))}</tbody></table></div>
        <dl className="ms-auto mt-5 grid max-w-xs gap-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-ink-muted">{t("subtotal")}</dt><dd>{m(inv.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-muted">{t("vatTotal")}</dt><dd>{m(inv.taxTotal)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>{t("ttc")}</dt><dd className="text-canopy">{m(inv.total)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-muted">{t("alreadyPaid")}</dt><dd>{m(inv.amountPaid)}</dd></div>
          <div className="flex justify-between font-semibold"><dt>{t("remaining")}</dt><dd className={remaining > 0 ? "text-clay" : "text-canopy"}>{m(remaining)}</dd></div></dl>
        {inv.payments.length > 0 && <section className="mt-6 text-sm"><h2 className="mb-1 font-semibold">{t("payments")}</h2>
          <ul className="divide-y divide-line">{inv.payments.map((p) => <li key={p.id} className="flex justify-between py-1.5"><span>{dateFmt(p.paidAt, locale)} · {tm(p.method)}{p.reference && ` · ${p.reference}`}</span><span className="flex items-center gap-3"><span className="font-medium text-canopy">{m(p.amount)}</span>{canEmail && email && <form className="print:hidden" action={sendReceiptEmail.bind(null, id, p.id)}><button className="text-xs text-canopy hover:underline">{t("sendReceipt")}</button></form>}</span></li>)}</ul></section>}
        {inv.paymentTerms && <p className="mt-6 border-t border-line pt-4 text-xs text-ink-muted">{t("terms")} : {inv.paymentTerms}</p>}
      </article>
    </>
  );
}
