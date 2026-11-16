import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { FLOW, getOrder } from "@/services/orders";
import { Link } from "@/i18n/routing";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Pill, orderTone, payTone } from "@/components/ui/pill";
import { waConfigured } from "@/services/whatsapp";
import { changeStatusAction, sendOrderEmail, sendOrderWhatsApp } from "../actions";

const KNOWN = ["waUnavailable", "waDisabled", "customerNoPhone", "waRateLimit", "waFailed", "emailUnavailable", "customerNoEmail", "emailRateLimit", "emailFailed", "insufficientStock", "invalidTransition", "orderNotFound", "numberTaken", "customerNotFound", "productNotFound", "invalidLines"];

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { id } = await params, { error, sent } = await searchParams;
  const t = await getTranslations("orders"), to = await getTranslations("orderStatus"), tp = await getTranslations("paymentState"), tu = await getTranslations("units"), te = await getTranslations("errors"), c = await getTranslations("common"), locale = await getLocale();
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("orders:read");
  const o = await getOrder(ctx, id);
  if (!o) notFound();
  const canWrite = ctx.permissions.has("orders:write"), next = FLOW[o.status].filter((s) => s !== "CANCELLED");
  const confirm = (s: OrderStatus) => s === "DELIVERED";

  return (
    <>
      {sent && <p role="status" className="mb-4 rounded-lg bg-canopy-soft p-3 text-sm text-canopy">{sent === "wa" ? t("waSent") : t("emailSent")}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{te(KNOWN.includes(error) ? error : "generic")}</p>}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm text-ink-muted">{dateFmt(o.orderedAt, locale)}</p><h1 className="text-2xl font-bold">{o.number}</h1>
          <div className="mt-2 flex gap-2"><Pill tone={orderTone(o.status)}>{to(o.status)}</Pill><Pill tone={payTone(o.paymentState)}>{tp(o.paymentState)}</Pill></div></div>
        {canWrite && FLOW[o.status].length > 0 && (
          <div className="flex flex-wrap gap-2">
            {next.map((s) => confirm(s)
              ? <ConfirmAction key={s} action={changeStatusAction.bind(null, id, s)} label={t(`to.${s}`)} title={t("deliverTitle")} message={t("deliverMessage")} confirmLabel={t("deliverConfirm")} cancelLabel={c("cancel")} tone="primary" />
              : <form key={s} action={changeStatusAction.bind(null, id, s)}><button className="rounded-lg bg-canopy px-4 py-2 text-sm font-semibold text-white">{t(`to.${s}`)}</button></form>)}
            <ConfirmAction action={changeStatusAction.bind(null, id, "CANCELLED")} label={t("to.CANCELLED")} title={t("cancelTitle")} message={t("cancelMessage")} confirmLabel={t("cancelConfirm")} cancelLabel={c("cancel")} />
          </div>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card overflow-x-auto p-4 lg:col-span-2 lg:p-6"><h2 className="mb-3 font-semibold">{t("lines")}</h2>
          <table className="w-full text-sm"><thead className="text-ink-muted"><tr>{["product", "qty", "price", "vat", "total"].map((k) => <th key={k} className="pb-2 text-start font-medium">{t(`cols.${k}`)}</th>)}</tr></thead>
            <tbody>{o.items.map((i) => (
              <tr key={i.id} className="border-t border-line"><td className="py-2.5">{i.product.name}</td><td>{Number(i.quantity)} {tu(i.product.unit)}</td>
                <td>{money(i.unitPrice, locale)}{Number(i.discount) > 0 && <span className="block text-xs text-clay">− {money(i.discount, locale)}</span>}</td><td>{Number(i.vatRate)} %</td><td className="font-medium">{money(i.lineTotal, locale)}</td></tr>))}</tbody></table>
          <dl className="ms-auto mt-4 grid max-w-xs gap-1 text-sm">
            <div className="flex justify-between"><dt className="text-ink-muted">{t("totals.subtotal")}</dt><dd>{money(o.subtotal, locale)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">{t("totals.vat")}</dt><dd>{money(o.taxTotal, locale)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>{t("totals.total")}</dt><dd className="text-canopy">{money(o.total, locale)}</dd></div></dl>
        </section>
        <section className="card p-4 lg:p-6"><h2 className="mb-2 font-semibold">{t("cols.customer")}</h2>
          <Link href={`/customers/${o.customerId}`} className="font-medium text-canopy hover:underline">{o.customer.name}</Link>{o.customer.phone && <p className="text-sm text-ink-muted" dir="ltr">{o.customer.phone}</p>}
          {canWrite && o.customer.email && !["DRAFT", "NEW", "CANCELLED"].includes(o.status) && <form action={sendOrderEmail.bind(null, id)} className="mt-3"><button className="rounded-lg border border-line px-3 py-2 text-sm">{t("sendConfirmation")}</button></form>}
          {canWrite && waConfigured() && ctx.org.whatsappEnabled && o.customer.phone && !["DRAFT", "NEW", "CANCELLED"].includes(o.status) && <form action={sendOrderWhatsApp.bind(null, id)} className="mt-2"><button className="rounded-lg border border-line px-3 py-2 text-sm">{t("sendWhatsapp")}</button></form>}
          {o.invoices.length > 0 && <div className="mt-4"><h2 className="mb-1 font-semibold">{t("invoice")}</h2>{o.invoices.map((i) => <Link key={i.id} href={`/invoices/${i.id}`} className="block text-canopy hover:underline">{i.number}</Link>)}</div>}
          {o.notes && <p className="mt-4 rounded-lg bg-field p-3 text-sm">{o.notes}</p>}</section>
      </div>
    </>
  );
}
