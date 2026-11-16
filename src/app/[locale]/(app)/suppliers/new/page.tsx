import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { FieldsForm } from "@/components/ui/fields-form";
import { supplierFields } from "../fields";
import { saveSupplier } from "../actions";

export default async function NewSupplier() {
  const t = await getTranslations("suppliers"), c = await getTranslations("common");
  await requirePermission("suppliers:write");
  return (<><h1 className="mb-5 text-2xl font-bold">{t("add")}</h1><FieldsForm action={saveSupplier.bind(null, null)} cancelHref="/suppliers" submitLabel={c("save")} cancelLabel={c("cancel")} fields={supplierFields(t)} /></>);
}
