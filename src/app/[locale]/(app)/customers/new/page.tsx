import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { CustomerForm } from "../customer-form";
import { saveCustomer } from "../actions";

export default async function NewCustomer() {
  const t = await getTranslations("customers");
  await requirePermission("customers:write");
  return (<><h1 className="mb-5 text-2xl font-bold">{t("add")}</h1><CustomerForm action={saveCustomer.bind(null, null)} cancelHref="/customers" /></>);
}
