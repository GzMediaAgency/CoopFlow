import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/ui/auth-card";
import { FieldsForm } from "@/components/ui/fields-form";
import { register } from "../actions";

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("registerTitle")} subtitle={t("registerIntro")}>
      <FieldsForm narrow action={register} cancelHref="/login" submitLabel={t("register")} cancelLabel={t("haveAccount")} fields={[
        { name: "orgName", label: t("orgName"), required: true }, { name: "fullName", label: t("fullName"), required: true, autoComplete: "name" },
        { name: "email", label: t("email"), type: "email", required: true, autoComplete: "email" },
        { name: "password", label: t("password"), type: "password", required: true, autoComplete: "new-password", hint: t("passwordHint") },
        { name: "confirmPassword", label: t("confirmPassword"), type: "password", required: true, autoComplete: "new-password" } ]} />
    </AuthCard>
  );
}
