import type { Field } from "@/components/ui/fields-form";
type T = (k: string) => string;
export const supplierFields = (t: T, d: Partial<Record<string, string | null>> = {}): Field[] => [
  { name: "name", label: t("fields.name"), required: true, defaultValue: d.name ?? "" }, { name: "company", label: t("fields.company"), defaultValue: d.company ?? "" },
  { name: "phone", label: t("fields.phone"), defaultValue: d.phone ?? "" }, { name: "email", label: t("fields.email"), type: "email", defaultValue: d.email ?? "" },
  { name: "ice", label: t("fields.ice"), defaultValue: d.ice ?? "" }, { name: "taxId", label: t("fields.taxId"), defaultValue: d.taxId ?? "" },
  { name: "address", label: t("fields.address"), span: true, defaultValue: d.address ?? "" }, { name: "notes", label: t("fields.notes"), type: "textarea", defaultValue: d.notes ?? "" },
];
