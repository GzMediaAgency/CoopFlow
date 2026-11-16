import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/ui/auth-card";
import { logout } from "@/lib/auth/logout";

export default async function Suspended() {
  const t = await getTranslations("suspended");
  return (
    <AuthCard title={t("title")}><p className="rounded-lg bg-argan-soft p-4 text-sm text-gold-deep">{t("text")}</p>
      <form action={logout}><button className="rounded-lg border border-line bg-white px-5 py-3 text-sm font-medium">{t("logout")}</button></form></AuthCard>
  );
}
