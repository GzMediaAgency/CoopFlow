import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { getMember } from "@/services/members";
import { MemberForm } from "../../member-form";
import { saveMember } from "../../actions";

export default async function EditMember({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("members");
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("members:write");
  const m = await getMember(ctx, id);
  if (!m) notFound();
  const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");
  return (<><h1 className="mb-5 text-2xl font-bold">{t("edit")} — {m.firstName} {m.lastName}</h1>
    <MemberForm action={saveMember.bind(null, id)} cancelHref={`/members/${id}`}
      defaults={{ firstName: m.firstName, lastName: m.lastName, cin: m.cin, phone: m.phone, email: m.email, address: m.address, city: m.city, role: m.role, groupName: m.groupName, status: m.status, notes: m.notes, birthDate: d(m.birthDate), joinedAt: d(m.joinedAt) }} /></>);
}
