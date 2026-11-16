import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { ProductionForm } from "../production-form";
import { saveProduction } from "../actions";

export default async function NewProduction({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const t = await getTranslations("production"), sp = await searchParams;
  const ctx = await requirePermission("production:write");
  const [products, members] = await Promise.all([
    ctx.db.product.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true } }),
    ctx.db.member.findMany({ where: { deletedAt: null, status: "ACTIVE" }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  return (<><h1 className="mb-5 text-2xl font-bold">{t("add")}</h1>
    <ProductionForm action={saveProduction} today={new Date().toISOString().slice(0, 10)} defaultProductId={sp.product}
      products={products.map((p) => ({ id: p.id, label: p.name, unit: p.unit }))} members={members.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }))} /></>);
}
