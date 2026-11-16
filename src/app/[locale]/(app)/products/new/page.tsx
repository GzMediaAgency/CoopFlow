import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { ProductForm } from "../product-form";
import { saveProduct } from "../actions";

export default async function NewProduct() {
  const t = await getTranslations("products");
  const ctx = await requirePermission("products:write");
  const cats = await ctx.db.category.findMany({ orderBy: { name: "asc" }, select: { name: true } });
  return (<><h1 className="mb-5 text-2xl font-bold">{t("add")}</h1>
    <ProductForm action={saveProduct.bind(null, null)} cancelHref="/products" categories={cats.map((c) => c.name)} /></>);
}
