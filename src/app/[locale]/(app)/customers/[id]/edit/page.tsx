import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { getCustomer } from "@/services/customers";
import { CustomerForm } from "../../customer-form";
import { saveCustomer } from "../../actions";

export default async function EditCustomer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, t = await getTranslations("customers");
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requirePermission("customers:write");
  const c = await getCustomer(ctx, id);
  if (!c) notFound();
  return (<><h1 className="mb-5 text-2xl font-bold">{t("edit")} — {c.name}</h1>
    <CustomerForm action={saveCustomer.bind(null, id)} cancelHref={`/customers/${id}`} defaults={{ name: c.name, company: c.company, type: c.type, priceTier: c.priceTier, phone: c.phone, email: c.email, address: c.address, city: c.city, ice: c.ice, notes: c.notes }} /></>);
}
