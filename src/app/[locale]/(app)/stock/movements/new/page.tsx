import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { MovementForm } from "../movement-form";
import { saveMovement } from "../../actions";

export default async function NewMovement() {
  const t = await getTranslations("stock");
  const ctx = await requirePermission("stock:write");
  const [products, batches] = await Promise.all([
    ctx.db.product.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true } }),
    ctx.db.productionBatch.findMany({ where: { remainingQty: { gt: 0 } }, orderBy: { producedAt: "asc" }, select: { id: true, productId: true, batchNumber: true, remainingQty: true } }),
  ]);
  return (<><h1 className="mb-5 text-2xl font-bold">{t("newMovement")}</h1>
    <MovementForm action={saveMovement} today={new Date().toISOString().slice(0, 10)} products={products}
      batches={batches.map((b) => ({ id: b.id, productId: b.productId, label: `${b.batchNumber} (${Number(b.remainingQty)})` }))} /></>);
}
