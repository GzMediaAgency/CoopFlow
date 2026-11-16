import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { METHODS } from "@/schemas/payment";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { contributionPayments, getContribution, statusOf } from "@/services/contributions";
import { Link } from "@/i18n/routing";
import { FieldsForm } from "@/components/ui/fields-form";
import { Pill, type Tone } from "@/components/ui/pill";
import { payContributionAction } from "../actions";

const TONE: Record<string, Tone> = { PAID: "green", LATE: "clay", PENDING: "gold" };

export default async function ContributionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("contributions"), ts = await getTranslations("contributions.status"), tt = await getTranslations("contributionType"), tm = await getTranslations("paymentMethod"), c = await getTranslations("common"), locale = await getLocale();
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("contributions:read");
  const co = await getContribution(ctx, id);
  if (!co) notFound();
  const pays = await contributionPayments(ctx, id), s = statusOf(co), remaining = Number(co.amountDue) - Number(co.amountPaid), today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <p className="text-sm text-ink-muted">{tt(co.type)}</p>
      <h1 className="text-2xl font-bold">{co.member.firstName} {co.member.lastName}</h1>
      <div className="mb-5 mt-2"><Pill tone={TONE[s]!}>{ts(s)}</Pill></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 lg:p-6"><dl className="divide-y divide-line text-sm">
          {[[t("cols.member"), <Link key="m" href={`/members/${co.member.id}`} className="text-canopy hover:underline">{co.member.firstName} {co.member.lastName}</Link>], [t("fields.dueDate"), dateFmt(co.dueDate, locale)], [t("cols.amount"), money(co.amountDue, locale)], [t("cols.paid"), money(co.amountPaid, locale)], [t("kpi.remaining"), money(remaining, locale)]]
            .map(([k, v], i) => <div key={i} className="flex justify-between gap-4 py-2"><dt className="text-ink-muted">{k}</dt><dd className="text-end font-medium">{v}</dd></div>)}</dl>
          {co.note && <p className="mt-3 rounded-lg bg-field p-3 text-sm">{co.note}</p>}</section>
        <section className="card p-4 lg:p-6"><h2 className="mb-2 font-semibold">{t("payments")}</h2>
          {pays.length === 0 ? <p className="text-sm text-ink-muted">{t("noPayments")}</p> : <ul className="divide-y divide-line text-sm">{pays.map((p) => <li key={p.id} className="flex justify-between py-2"><span>{dateFmt(p.paidAt, locale)} · {tm(p.method)}</span><span className="font-semibold text-canopy">+ {money(p.amount, locale)}</span></li>)}</ul>}</section>
      </div>
      {remaining > 0.005 && ctx.permissions.has("contributions:write") && (
        <section className="mt-6"><h2 className="mb-3 font-semibold">{t("record")}</h2>
          <FieldsForm action={payContributionAction.bind(null, id)} cancelHref="/contributions" submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
            { name: "amount", label: t("fields.payAmount"), type: "number", required: true, step: "0.01", defaultValue: String(remaining), hint: t("amountHint") },
            { name: "method", label: t("fields.method"), type: "select", defaultValue: "CASH", options: METHODS.map((m) => ({ value: m, label: tm(m) })) },
            { name: "paidAt", label: t("fields.paidAt"), type: "date", required: true, defaultValue: today, max: today }, { name: "reference", label: t("fields.reference") }]} /></section>)}
    </>
  );
}
