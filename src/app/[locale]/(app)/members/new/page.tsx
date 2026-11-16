import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { MemberForm } from "../member-form";
import { saveMember } from "../actions";

export default async function NewMember() {
  const t = await getTranslations("members");
  await requirePermission("members:write");
  return (<><h1 className="mb-5 text-2xl font-bold">{t("add")}</h1>
    <MemberForm action={saveMember.bind(null, null)} cancelHref="/members" showShares defaults={{ shareValue: 100, sharesCount: 1, joinedAt: new Date().toISOString().slice(0, 10) }} /></>);
}
