import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { getMember } from "@/services/members";
import { Link } from "@/i18n/routing";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { StatusBadge } from "@/components/ui/status-badge";
import { archive } from "../actions";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("members"), c = await getTranslations("common"), locale = await getLocale();
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("members:read");
  const m = await getMember(ctx, id);
  if (!m) notFound();

  const shares = m.shares.reduce((s, x) => s + x.sharesCount, 0);
  const sharesAmount = m.shares.reduce((s, x) => s + x.sharesCount * Number(x.shareValue), 0);
  const due = m.contributions.reduce((s, x) => s + Number(x.amountDue), 0);
  const paid = m.contributions.reduce((s, x) => s + Number(x.amountPaid), 0);
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (<div className="flex justify-between gap-4 py-2"><dt className="text-ink-muted">{t(`fields.${k}`)}</dt><dd className="text-end font-medium">{v || "—"}</dd></div>);
  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (<section className="rounded-xl border border-line bg-white p-4 lg:p-6"><h2 className="mb-2 font-semibold text-canopy">{title}</h2>{children}</section>);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm text-ink-muted">{m.memberNumber}</p>
          <h1 className="text-2xl font-bold">{m.firstName} {m.lastName}</h1>
          <div className="mt-2"><StatusBadge status={m.status} label={t(`status.${m.status}`)} /></div></div>
        <div className="flex flex-wrap gap-2">
          {ctx.permissions.has("members:write") && <Link href={`/members/${id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm"><Pencil size={15} aria-hidden />{t("edit")}</Link>}
          {ctx.permissions.has("members:delete") && <ConfirmAction action={archive.bind(null, id)} label={t("archive.label")} title={t("archive.title")} message={t("archive.message")} confirmLabel={t("archive.confirm")} cancelLabel={c("cancel")} />}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("sections.personal")}><dl className="divide-y divide-line text-sm">
          <Row k="cin" v={m.cin} /><Row k="birthDate" v={m.birthDate && dateFmt(m.birthDate, locale)} />
          <Row k="phone" v={m.phone && <span dir="ltr">{m.phone}</span>} /><Row k="email" v={m.email} />
          <Row k="address" v={[m.address, m.city].filter(Boolean).join(", ")} /></dl></Card>
        <Card title={t("sections.coop")}><dl className="divide-y divide-line text-sm">
          <Row k="joinedAt" v={dateFmt(m.joinedAt, locale)} /><Row k="role" v={m.role} /><Row k="groupName" v={m.groupName} />
          <Row k="sharesCount" v={`${shares} · ${money(sharesAmount, locale)}`} /></dl></Card>
        <Card title={t("sections.contributions")}>
          <p className="mb-2 text-sm text-ink-muted">{t("profile.paidOf", { paid: money(paid, locale), due: money(due, locale) })}</p>
          <p className={`text-2xl font-bold ${due > paid ? "text-danger" : "text-canopy"}`}>{money(due - paid, locale)} <span className="text-sm font-normal text-ink-muted">{t("profile.remaining")}</span></p></Card>
        <Card title={t("sections.production")}>
          {m.productionRecords.length === 0 ? <p className="text-sm text-ink-muted">{t("profile.noProduction")}</p> :
            <ul className="divide-y divide-line text-sm">{m.productionRecords.map((r) => (
              <li key={r.id} className="flex justify-between py-2"><span>{r.product.name}</span><span className="text-ink-muted">{Number(r.quantity)} · {dateFmt(r.producedAt, locale)}</span></li>))}</ul>}</Card>
      </div>
      {m.notes && <p className="mt-4 rounded-xl border border-line bg-white p-4 text-sm">{m.notes}</p>}
    </>
  );
}
