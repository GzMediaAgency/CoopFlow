import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { getInventory } from "@/services/stock-ops";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { StatusBadge } from "@/components/ui/status-badge";
import { saveInventoryCounts, validateInventoryAction } from "../../actions";

export default async function InventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("stock"), c = await getTranslations("common"), tu = await getTranslations("units"), locale = await getLocale();
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("stock:read");
  const inv = await getInventory(ctx, id);
  if (!inv) notFound();
  const open = inv.status === "IN_PROGRESS" || inv.status === "DRAFT";
  const rows = inv.lines.map((l) => {
    const theo = Number(l.theoreticalQty), actual = l.actualQty === null ? null : Number(l.actualQty), diff = actual === null ? null : Math.round((actual - theo) * 1000) / 1000;
    return { l, theo, actual, diff, value: diff === null ? 0 : diff * Number(l.unitCost) };
  });
  const totalValue = rows.reduce((s, r) => s + r.value, 0), counted = rows.filter((r) => r.actual !== null).length;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm text-ink-muted">{dateFmt(inv.countedAt, locale)}</p><h1 className="text-2xl font-bold">{inv.reference}</h1>
          <div className="mt-2"><StatusBadge status={open ? "SUSPENDED" : "ACTIVE"} label={t(`inv.status.${inv.status}`)} /></div></div>
        {open && ctx.permissions.has("stock:validate") && <ConfirmAction action={validateInventoryAction.bind(null, id)} label={t("inv.validate")} title={t("inv.validateTitle")} message={t("inv.validateMessage", { counted, total: rows.length })} confirmLabel={t("inv.validateConfirm")} cancelLabel={c("cancel")} />}
      </div>
      {open && <p className="mb-3 rounded-lg bg-argan-soft p-3 text-sm text-gold-deep">{t("inv.saveFirst")}</p>}
      <form action={saveInventoryCounts.bind(null, id)}>
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-field text-ink-muted"><tr>{["product", "theoretical", "actual", "diff", "diffValue"].map((k) => <th key={k} scope="col" className="px-4 py-3 text-start font-medium">{t(`inv.cols.${k}`)}</th>)}</tr></thead>
            <tbody>{rows.map(({ l, theo, actual, diff, value }) => (
              <tr key={l.id} className="border-t border-line">
                <td className="px-4 py-2.5"><span className="font-medium">{l.product.name}</span><span className="block text-xs text-ink-muted">{l.product.sku} · {tu(l.product.unit)}</span></td>
                <td className="px-4 py-2.5">{theo}</td>
                <td className="px-4 py-2.5">{open ? <input name={`qty_${l.id}`} type="number" step="any" min="0" inputMode="decimal" defaultValue={actual ?? ""} aria-label={`${t("inv.cols.actual")} — ${l.product.name}`} className="w-28 rounded-lg border border-line p-2" /> : (actual ?? "—")}</td>
                <td className={`px-4 py-2.5 font-semibold ${diff ? (diff > 0 ? "text-canopy" : "text-clay") : "text-ink-muted"}`}>{diff === null ? "—" : diff > 0 ? `+${diff}` : diff}</td>
                <td className="px-4 py-2.5">{diff ? money(value, locale) : "—"}</td>
              </tr>))}</tbody>
            <tfoot><tr className="border-t border-line bg-field font-semibold"><td className="px-4 py-3" colSpan={4}>{t("inv.totalDiff")}</td><td className={`px-4 py-3 ${totalValue < 0 ? "text-clay" : ""}`}>{money(totalValue, locale)}</td></tr></tfoot>
          </table>
        </div>
        {open && ctx.permissions.has("stock:write") && <button className="mt-4 rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("inv.save")}</button>}
      </form>
    </>
  );
}
