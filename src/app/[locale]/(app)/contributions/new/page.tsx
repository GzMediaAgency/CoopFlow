import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { CONTRIBUTION_TYPES } from "@/schemas/modules";
import { FieldsForm } from "@/components/ui/fields-form";
import { saveContribution } from "../actions";

export default async function NewContribution({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const t = await getTranslations("contributions"), tt = await getTranslations("contributionType"), c = await getTranslations("common"), sp = await searchParams;
  const ctx = await requirePermission("contributions:write");
  const members = await ctx.db.member.findMany({ where: { deletedAt: null, status: { in: ["ACTIVE", "INACTIVE"] } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true } });
  return (<><h1 className="mb-5 text-2xl font-bold">{t("add")}</h1>
    <FieldsForm action={saveContribution} cancelHref="/contributions" submitLabel={c("save")} cancelLabel={c("cancel")} fields={[
      { name: "memberId", label: t("cols.member"), type: "select", required: true, defaultValue: members.find((m) => m.id === sp.member)?.id ?? members[0]?.id, options: members.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })) },
      { name: "type", label: t("cols.type"), type: "select", defaultValue: "MEMBERSHIP", options: CONTRIBUTION_TYPES.map((x) => ({ value: x, label: tt(x) })) },
      { name: "amountDue", label: t("fields.amountDue"), type: "number", required: true, step: "0.01" },
      { name: "dueDate", label: t("fields.dueDate"), type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
      { name: "note", label: t("fields.note"), type: "textarea" }]} /></>);
}
