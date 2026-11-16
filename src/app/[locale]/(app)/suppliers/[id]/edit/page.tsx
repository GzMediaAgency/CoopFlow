import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { getSupplier } from "@/services/suppliers";
import { FieldsForm } from "@/components/ui/fields-form";
import { supplierFields } from "../../fields";
import { saveSupplier } from "../../actions";

export default async function EditSupplier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("suppliers"), c = await getTranslations("common");
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("suppliers:write");
  const s = await getSupplier(ctx, id);
  if (!s) notFound();
  return (<><h1 className="mb-5 text-2xl font-bold">{t("edit")} — {s.name}</h1><FieldsForm action={saveSupplier.bind(null, id)} cancelHref={`/suppliers/${id}`} submitLabel={c("save")} cancelLabel={c("cancel")} fields={supplierFields(t, { name: s.name, company: s.company, phone: s.phone, email: s.email, ice: s.ice, taxId: s.taxId, address: s.address, notes: s.notes })} /></>);
}
