import { getLocale, getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/ui/auth-card";
import { FieldsForm } from "@/components/ui/fields-form";
import { Link } from "@/i18n/routing";
import { register } from "../actions";

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  const locale = await getLocale();
  const isAr = locale === "ar";

  return (
    <AuthCard title={t("registerTitle")} subtitle={t("registerIntro")}>
      <FieldsForm narrow action={register} cancelHref="/login" submitLabel={t("register")} cancelLabel={t("haveAccount")} fields={[
        { name: "orgName", label: t("orgName"), required: true }, { name: "fullName", label: t("fullName"), required: true, autoComplete: "name" },
        { name: "email", label: t("email"), type: "email", required: true, autoComplete: "email" },
        { name: "password", label: t("password"), type: "password", required: true, autoComplete: "new-password", hint: t("passwordHint") },
        { name: "confirmPassword", label: t("confirmPassword"), type: "password", required: true, autoComplete: "new-password" } ]} />

      <p className="mt-4 text-center text-xs text-ink-muted leading-relaxed">
        {isAr ? (
          <>
            بإنشاء حساب التعاونية، فإنكم توافقون على{" "}
            <Link href="/terms" className="text-canopy underline font-medium hover:text-forest">شروط الاستخدام العامة</Link>
            {" "}و{" "}
            <Link href="/privacy" className="text-canopy underline font-medium hover:text-forest">سياسة الخصوصية وحماية المعطيات (CNDP)</Link>.
          </>
        ) : (
          <>
            En créant le compte de votre coopérative, vous acceptez nos{" "}
            <Link href="/terms" className="text-canopy underline font-medium hover:text-forest">Conditions Générales d'Utilisation</Link>
            {" "}et notre{" "}
            <Link href="/privacy" className="text-canopy underline font-medium hover:text-forest">Politique de Confidentialité (CNDP)</Link>.
          </>
        )}
      </p>
    </AuthCard>
  );
}
