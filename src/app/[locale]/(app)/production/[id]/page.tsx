import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { batchTrace, getProduction } from "@/services/production";
import { Link } from "@/i18n/routing";

export default async function ProductionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("production"), tm = await getTranslations("movementType"), tu = await getTranslations("units"), tb = await getTranslations("batchStatus"), locale = await getLocale();
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("production:read");
  const r = await getProduction(ctx, id);
  if (!r) notFound();
  const trace = r.batchId ? await batchTrace(ctx, r.batchId) : [];
  const u = tu(r.unit);
  const Row = ({ k, v }: { k: string; v: ReactNode }) => (<div className="flex justify-between gap-4 py-2"><dt className="text-ink-muted">{t(`fields.${k}`)}</dt><dd className="text-end font-medium">{v || "—"}</dd></div>);

  return (
    <>
      <p className="text-sm text-ink-muted">{r.batch?.batchNumber}</p>
      <h1 className="mb-5 text-2xl font-bold">{r.product.name} · {Number(r.quantity)} {u}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 lg:p-6"><h2 className="mb-2 font-semibold">{t("sections.what")}</h2><dl className="divide-y divide-line text-sm">
          <Row k="producedAt" v={dateFmt(r.producedAt, locale)} /><Row k="quality" v={r.quality} />
          <Row k="memberId" v={r.member && <Link href={`/members/${r.member.id}`} className="text-canopy hover:underline">{r.member.firstName} {r.member.lastName}</Link>} />
          <Row k="groupName" v={r.groupName} /><Row k="plotOrUnit" v={r.plotOrUnit} /><Row k="unitCost" v={r.unitCost && money(r.unitCost, locale)} /></dl></section>
        <section className="card p-4 lg:p-6"><h2 className="mb-2 font-semibold">{t("sections.batch")}</h2>{r.batch && <dl className="divide-y divide-line text-sm">
          <Row k="batchNumber" v={r.batch.batchNumber} /><Row k="expiresAt" v={r.batch.expiresAt && dateFmt(r.batch.expiresAt, locale)} />
          <Row k="remaining" v={`${Number(r.batch.remainingQty)} / ${Number(r.batch.initialQuantity)} ${u}`} /><Row k="status" v={tb(r.batch.status)} /></dl>}</section>
        <section className="card p-4 lg:col-span-2 lg:p-6"><h2 className="mb-2 font-semibold">{t("sections.trace")}</h2>
          <ol className="divide-y divide-line text-sm">{trace.map((m) => (
            <li key={m.id} className="flex justify-between gap-3 py-2"><span>{tm(m.type)}<span className="block text-xs text-ink-muted">{dateFmt(m.movedAt, locale)}{m.reference && ` · ${m.reference}`}</span></span>
              <span className={`font-semibold ${m.direction === "IN" ? "text-canopy" : "text-clay"}`}>{m.direction === "IN" ? "+" : "−"}{Number(m.quantity)} {u}</span></li>))}</ol></section>
      </div>
    </>
  );
}
