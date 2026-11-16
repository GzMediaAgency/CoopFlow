import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/ui/auth-card";
import { FieldsForm } from "@/components/ui/fields-form";
import { Link } from "@/i18n/routing";
import { supabaseServer } from "@/lib/supabase/server";
import { resetPassword } from "../actions";

export default async function ResetPage() {
  const t = await getTranslations("auth");
  const { data } = await (await supabaseServer()).auth.getUser(); // la session de récupération vient du lien reçu par e-mail
  return (
    <AuthCard title={t("resetTitle")}>
      {!data.user ? <><p role="alert" className="rounded-lg bg-danger/10 p-4 text-sm text-danger">{t("resetExpired")}</p><Link href="/forgot-password" className="text-sm text-canopy hover:underline">{t("forgotTitle")}</Link></>
        : <FieldsForm narrow action={resetPassword} cancelHref="/login" submitLabel={t("savePassword")} cancelLabel={t("backToLogin")} fields={[
          { name: "password", label: t("newPassword"), type: "password", required: true, autoComplete: "new-password", hint: t("passwordHint") },
          { name: "confirmPassword", label: t("confirmPassword"), type: "password", required: true, autoComplete: "new-password" }]} />}
    </AuthCard>
  );
}
