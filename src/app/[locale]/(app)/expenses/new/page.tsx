import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { listSuppliers } from "@/services/expenses";
import { FieldsForm } from "@/components/ui/fields-form";
import { expenseFields } from "../fields";
import { saveExpense } from "../actions";

export default async function NewExpense() {
  const t = await getTranslations("expenses"), tc = await getTranslations("expenseCategory"), tm = await getTranslations("paymentMethod"), c = await getTranslations("common");
  const ctx = await requirePermission("expenses:write");
  return (<><h1 className="mb-5 text-2xl font-bold">{t("add")}</h1>
    <FieldsForm action={saveExpense.bind(null, null)} cancelHref="/expenses" submitLabel={c("save")} cancelLabel={c("cancel")} fields={expenseFields(t, tc, tm, await listSuppliers(ctx))} /></>);
}
