import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/ui/auth-card";
import { FieldsForm } from "@/components/ui/fields-form";
import { Link } from "@/i18n/routing";
import { forgotPassword } from "../actions";

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const t = await getTranslations("auth"), sp = await searchParams;
  return (
    <AuthCard title={t("forgotTitle")} subtitle={sp.sent ? undefined : t("forgotIntro")}>
      {sp.sent ? <p role="status" className="rounded-lg bg-canopy-soft p-4 text-sm text-canopy">{t("forgotSent")}</p>
        : <FieldsForm narrow action={forgotPassword} cancelHref="/login" submitLabel={t("sendLink")} cancelLabel={t("backToLogin")} fields={[{ name: "email", label: t("email"), type: "email", required: true, autoComplete: "email" }]} />}
      {sp.sent && <Link href="/login" className="text-sm text-canopy hover:underline">{t("backToLogin")}</Link>}
    </AuthCard>
  );
}
