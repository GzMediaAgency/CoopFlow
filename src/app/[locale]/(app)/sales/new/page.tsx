import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { documentFormData } from "@/services/catalog";
import { DocumentForm } from "@/components/sales/document-form";
import { saveSale } from "../actions";

export default async function NewSale() {
  const t = await getTranslations("sales");
  const ctx = await requirePermission("sales:write");
  const data = await documentFormData(ctx);
  return (<><h1 className="mb-1 text-2xl font-bold">{t("add")}</h1><p className="mb-5 text-sm text-ink-muted">{t("hint")}</p><DocumentForm action={saveSale} mode="sale" cancelHref="/sales" {...data} /></>);
}
