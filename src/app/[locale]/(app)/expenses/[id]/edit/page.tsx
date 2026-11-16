import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { getExpense, listSuppliers } from "@/services/expenses";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { FieldsForm } from "@/components/ui/fields-form";
import { expenseFields } from "../../fields";
import { archive, saveExpense } from "../../actions";

export default async function EditExpense({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("expenses"), tc = await getTranslations("expenseCategory"), tm = await getTranslations("paymentMethod"), c = await getTranslations("common");
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("expenses:write");
  const e = await getExpense(ctx, id);
  if (!e) notFound();
  return (<><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{t("edit")}</h1>
      {ctx.permissions.has("expenses:delete") && <ConfirmAction action={archive.bind(null, id)} label={t("archive.label")} title={t("archive.title")} message={t("archive.message")} confirmLabel={t("archive.confirm")} cancelLabel={c("cancel")} />}</div>
    <FieldsForm action={saveExpense.bind(null, id)} cancelHref="/expenses" submitLabel={c("save")} cancelLabel={c("cancel")}
      fields={expenseFields(t, tc, tm, await listSuppliers(ctx), { category: e.category, amount: String(Number(e.amount)), spentAt: e.spentAt.toISOString().slice(0, 10), supplierId: e.supplierId ?? "", method: e.method, onCredit: e.onCredit ? "1" : "0", note: e.note ?? "" })} /></>);
}
