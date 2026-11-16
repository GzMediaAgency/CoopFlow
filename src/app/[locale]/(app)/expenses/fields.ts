import { EXPENSE_CATEGORIES } from "@/schemas/expense";
import { METHODS } from "@/schemas/payment";
import type { Field } from "@/components/ui/fields-form";

type T = (k: string) => string;
export function expenseFields(t: T, tc: T, tm: T, suppliers: { id: string; name: string }[], d: Partial<Record<string, string>> = {}): Field[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { name: "category", label: t("fields.category"), type: "select", required: true, defaultValue: d.category ?? "RAW_MATERIALS", options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: tc(c) })) },
    { name: "amount", label: t("fields.amount"), type: "number", required: true, step: "0.01", defaultValue: d.amount },
    { name: "spentAt", label: t("fields.spentAt"), type: "date", required: true, defaultValue: d.spentAt ?? today, max: today },
    { name: "supplierId", label: t("fields.supplierId"), type: "select", defaultValue: d.supplierId ?? "", options: [{ value: "", label: "—" }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))] },
    { name: "method", label: t("fields.method"), type: "select", defaultValue: d.method ?? "CASH", options: METHODS.map((m) => ({ value: m, label: tm(m) })) },
    { name: "onCredit", label: t("fields.onCredit"), type: "select", defaultValue: d.onCredit ?? "0", hint: t("creditHint"), options: [{ value: "0", label: t("paid.cash") }, { value: "1", label: t("paid.credit") }] },
    { name: "note", label: t("fields.note"), type: "textarea", defaultValue: d.note },
  ];
}
