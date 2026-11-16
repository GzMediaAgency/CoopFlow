import { getLocale, getTranslations } from "next-intl/server";
import { METHODS } from "@/schemas/payment";
import { requirePermission } from "@/lib/auth/session";
import { money } from "@/lib/format";
import { openInvoices } from "@/services/payments";
import { FieldsForm } from "@/components/ui/fields-form";
import { Link } from "@/i18n/routing";
import { savePayment } from "../actions";

export default async function NewPayment({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const sp = await searchParams, t = await getTranslations("payments"), tm = await getTranslations("paymentMethod"), c = await getTranslations("common"), locale = await getLocale();
  const ctx = await requirePermission("payments:write");
  const invoices = await openInvoices(ctx);
  const left = (i: (typeof invoices)[number]) => Number(i.total) - Number(i.amountPaid);
  const selected = invoices.find((i) => i.id === sp.invoice);
  if (invoices.length === 0) return (<><h1 className="mb-5 text-2xl font-bold">{t("add")}</h1><p className="rounded-xl border border-line bg-white p-8 text-center text-ink-muted">{t("noOpen")}</p><Link href="/payments" className="mt-4 inline-block text-canopy">{c("cancel")}</Link></>);
  const today = new Date().toISOString().slice(0, 10);
  return (<><h1 className="mb-5 text-2xl font-bold">{t("add")}</h1>
    <FieldsForm action={savePayment} cancelHref={selected ? `/invoices/${selected.id}` : "/payments"} submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
      { name: "invoiceId", label: t("fields.invoiceId"), type: "select", required: true, defaultValue: selected?.id ?? invoices[0]!.id, span: true,
        options: invoices.map((i) => ({ value: i.id, label: `${i.number} — ${i.customer.name} — ${t("left")} ${money(left(i), locale)}` })) },
      { name: "amount", label: t("fields.amount"), type: "number", required: true, step: "0.01", defaultValue: String(selected ? left(selected) : ""), hint: t("amountHint") },
      { name: "method", label: t("fields.method"), type: "select", defaultValue: "CASH", options: METHODS.map((m) => ({ value: m, label: tm(m) })) },
      { name: "paidAt", label: t("fields.paidAt"), type: "date", required: true, defaultValue: today, max: today },
      { name: "reference", label: t("fields.reference") }, { name: "note", label: t("fields.note"), type: "textarea" } ]} /></>);
}
