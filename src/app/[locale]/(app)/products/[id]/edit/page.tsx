import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { getProduct } from "@/services/products";
import { ProductForm } from "../../product-form";
import { saveProduct } from "../../actions";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("products");
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("products:write");
  const [p, cats] = await Promise.all([getProduct(ctx, id), ctx.db.category.findMany({ orderBy: { name: "asc" }, select: { name: true } })]);
  if (!p) notFound();
  const n = (v: unknown) => (v == null ? "" : Number(v));
  return (<><h1 className="mb-5 text-2xl font-bold">{t("edit")} — {p.name}</h1>
    <ProductForm action={saveProduct.bind(null, id)} cancelHref={`/products/${id}`} categories={cats.map((c) => c.name)}
      defaults={{ name: p.name, nameAr: p.nameAr, sku: p.sku, category: p.category?.name, description: p.description, unit: p.unit, vatRate: Number(p.vatRate), isActive: p.isActive,
        purchasePrice: n(p.purchasePrice), priceRetail: n(p.priceRetail), priceProfessional: n(p.priceProfessional), priceReseller: n(p.priceReseller), priceMember: n(p.priceMember),
        stockMin: n(p.stockMin), stockMax: n(p.stockMax), shelfLifeDays: n(p.shelfLifeDays) }} /></>);
}
