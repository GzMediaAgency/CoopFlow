import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { documentFormData } from "@/services/catalog";
import { DocumentForm } from "@/components/sales/document-form";
import { saveOrder } from "../actions";

export default async function NewOrder() {
  const t = await getTranslations("orders");
  const ctx = await requirePermission("orders:write");
  const data = await documentFormData(ctx);
  return (<><h1 className="mb-5 text-2xl font-bold">{t("add")}</h1><DocumentForm action={saveOrder} mode="order" cancelHref="/orders" {...data} /></>);
}
