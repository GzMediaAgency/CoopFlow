import { getTranslations } from "next-intl/server";
import { DOCUMENT_CATEGORIES } from "@/schemas/modules";
import { requirePermission } from "@/lib/auth/session";
import { FieldsForm } from "@/components/ui/fields-form";
import { uploadAction } from "../actions";

export default async function NewDocument() {
  const t = await getTranslations("documents"), tc = await getTranslations("documentCategory"), c = await getTranslations("common");
  await requirePermission("documents:write");
  return (<><h1 className="mb-5 text-2xl font-bold">{t("add")}</h1>
    <FieldsForm action={uploadAction} cancelHref="/documents" submitLabel={t("upload")} cancelLabel={c("cancel")} fields={[
      { name: "file", label: t("fields.file"), type: "file", required: true, span: true, accept: ".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.csv", hint: t("fileHint") },
      { name: "category", label: t("fields.category"), type: "select", defaultValue: "ADMINISTRATIVE", options: DOCUMENT_CATEGORIES.map((x) => ({ value: x, label: tc(x) })) },
      { name: "name", label: t("fields.name"), hint: t("nameHint") }, { name: "expiresAt", label: t("fields.expiresAt"), type: "date", hint: t("expiresHint") }]} /></>);
}
