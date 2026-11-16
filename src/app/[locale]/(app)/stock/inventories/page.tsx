import { ClipboardCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt } from "@/lib/format";
import { listInventories } from "@/services/stock-ops";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { StockTabs } from "../stock-tabs";
import { startInventory } from "../actions";

export default async function InventoriesPage() {
  const t = await getTranslations("stock"), locale = await getLocale();
  const ctx = await requirePermission("stock:read");
  const list = await listInventories(ctx);
  const canWrite = ctx.permissions.has("stock:write");
  const Start = ({ label }: { label: string }) => <form action={startInventory}><button className="rounded-lg bg-canopy px-5 py-2.5 text-sm font-semibold text-white">{label}</button></form>;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("title")}</h1>{canWrite && list.length > 0 && <Start label={t("inv.start")} />}</div>
      <StockTabs current="inventories" />
      {list.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t("inv.emptyTitle")} text={t("inv.emptyText")}>{canWrite && <Start label={t("inv.startFirst")} />}</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">{list.map((i) => (
          <li key={i.id}><Link href={`/stock/inventories/${i.id}`} className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-field">
            <div><p className="font-semibold">{i.reference}</p><p className="text-xs text-ink-muted">{dateFmt(i.countedAt, locale)} · {t("inv.lines", { count: i._count.lines })}</p></div>
            <StatusBadge status={i.status === "VALIDATED" ? "ACTIVE" : "SUSPENDED"} label={t(`inv.status.${i.status}`)} /></Link></li>))}</ul>)}
    </>
  );
}
