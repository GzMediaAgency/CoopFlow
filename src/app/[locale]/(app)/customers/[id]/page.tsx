import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MessageCircle, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { getCustomer } from "@/services/customers";
import { Link } from "@/i18n/routing";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { archive } from "../actions";

/** Numéro marocain 06… → format international pour wa.me (lien simple, sans l'API WhatsApp Business). */
const waNumber = (p: string) => { const d = p.replace(/[^\d+]/g, ""); return d.startsWith("+") ? d.slice(1) : d.startsWith("00") ? d.slice(2) : d.startsWith("0") ? `212${d.slice(1)}` : d; };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("customers"), c = await getTranslations("common"), to = await getTranslations("orderStatus"), locale = await getLocale();
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("customers:read");
  const cu = await getCustomer(ctx, id);
  if (!cu) notFound();
  const Row = ({ k, v }: { k: string; v: ReactNode }) => (<div className="flex justify-between gap-4 py-2"><dt className="text-ink-muted">{t(`fields.${k}`)}</dt><dd className="text-end font-medium">{v || "—"}</dd></div>);
  const Card = ({ title, children }: { title: string; children: ReactNode }) => (<section className="card p-4 lg:p-6"><h2 className="mb-2 font-semibold">{title}</h2>{children}</section>);
  const none = <p className="text-sm text-ink-muted">{t("noData")}</p>;
  const wa = cu.phone ? `https://wa.me/${waNumber(cu.phone)}?text=${encodeURIComponent(t("waText", { name: cu.name }))}` : null;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm text-ink-muted">{t(`types.${cu.type}`)}</p><h1 className="text-2xl font-bold">{cu.name}</h1>{cu.company && <p className="text-ink-muted">{cu.company}</p>}</div>
        <div className="flex flex-wrap gap-2">
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm"><MessageCircle size={15} aria-hidden />{t("whatsapp")}</a>}
          {ctx.permissions.has("customers:write") && <Link href={`/customers/${id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm"><Pencil size={15} aria-hidden />{t("edit")}</Link>}
          {ctx.permissions.has("customers:delete") && <ConfirmAction action={archive.bind(null, id)} label={t("archive.label")} title={t("archive.title")} message={t("archive.message")} confirmLabel={t("archive.confirm")} cancelLabel={c("cancel")} />}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("sections.info")}><dl className="divide-y divide-line text-sm">
          <Row k="phone" v={cu.phone && <span dir="ltr">{cu.phone}</span>} /><Row k="email" v={cu.email} /><Row k="address" v={[cu.address, cu.city].filter(Boolean).join(", ")} />
          <Row k="ice" v={cu.ice} /><Row k="priceTier" v={t(`tiers.${cu.priceTier}`)} /></dl>{cu.notes && <p className="mt-3 rounded-lg bg-field p-3 text-sm">{cu.notes}</p>}</Card>
        <Card title={t("sections.balance")}><p className={`font-display text-3xl font-bold ${cu.balance > 0 ? "text-clay" : "text-canopy"}`}>{money(cu.balance, locale)}</p><p className="text-sm text-ink-muted">{t("balanceHint")}</p></Card>
        <Card title={t("sections.orders")}>{cu.orders.length === 0 ? none : <ul className="divide-y divide-line text-sm">{cu.orders.map((o) => (
          <li key={o.id} className="flex justify-between gap-3 py-2"><span className="font-medium">{o.number}<span className="block text-xs font-normal text-ink-muted">{dateFmt(o.orderedAt, locale)} · {to(o.status)}</span></span><span className="font-semibold">{money(o.total, locale)}</span></li>))}</ul>}</Card>
        <Card title={t("sections.invoices")}>{cu.invoices.length === 0 ? none : <ul className="divide-y divide-line text-sm">{cu.invoices.map((i) => (
          <li key={i.id} className="flex justify-between gap-3 py-2"><span className="font-medium">{i.number}<span className="block text-xs font-normal text-ink-muted">{dateFmt(i.issueDate, locale)}</span></span>
            <span className="text-end font-semibold">{money(i.total, locale)}<span className="block text-xs font-normal text-ink-muted">{money(i.amountPaid, locale)} {t("paid")}</span></span></li>))}</ul>}</Card>
        <Card title={t("sections.payments")}>{cu.payments.length === 0 ? none : <ul className="divide-y divide-line text-sm">{cu.payments.map((p) => (
          <li key={p.id} className="flex justify-between gap-3 py-2"><span>{dateFmt(p.paidAt, locale)}{p.reference && <span className="text-xs text-ink-muted"> · {p.reference}</span>}</span><span className="font-semibold text-canopy">+ {money(p.amount, locale)}</span></li>))}</ul>}</Card>
      </div>
    </>
  );
}
