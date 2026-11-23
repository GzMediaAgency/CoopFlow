import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt } from "@/lib/format";
import { listRoles, listUsers, subscriptionInfo } from "@/services/settings";
import { FieldsForm } from "@/components/ui/fields-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Pill } from "@/components/ui/pill";
import { SettingsTabs } from "../settings-tabs";
import { changeRole, changeStatus, deleteUserAction, inviteUserAction } from "../actions";

const KNOWN = ["lastAdmin", "selfAction", "roleNotFound", "userNotFound", "generic"];

export default async function UsersSettings({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const t = await getTranslations("settings"), te = await getTranslations("errors"), c = await getTranslations("common"), locale = await getLocale();
  const ctx = await requirePermission("settings:write");
  const [users, roles, { sub, users: used }] = await Promise.all([listUsers(ctx), listRoles(ctx), subscriptionInfo(ctx)]);
  const full = !!sub && used >= sub.plan.maxUsers;
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1><SettingsTabs current="users" />
      {error && <p role="alert" className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{te(KNOWN.includes(error) ? error : "generic")}</p>}
      <p className="mb-3 text-sm text-ink-muted">{t("users.count", { used, max: sub?.plan.maxUsers ?? "∞" })}</p>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white">{users.map((u) => (
        <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div className="min-w-0"><p className="font-medium">{u.fullName}{u.id === ctx.user.id && <span className="text-ink-muted"> ({t("users.you")})</span>}</p><p className="text-xs text-ink-muted">{u.email} · {dateFmt(u.createdAt, locale)}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={u.status === "ACTIVE" ? "green" : "gray"}>{t(`users.status.${u.status}`)}</Pill>
            <form action={changeRole.bind(null, u.id)} className="flex gap-1">
              <select name="roleId" defaultValue={u.roleId ?? ""} aria-label={t("users.role")} className="rounded-lg border border-line bg-white p-2 text-sm">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              <button className="rounded-lg border border-line px-3 text-sm">OK</button></form>
            {u.id !== ctx.user.id && (
              <>
                <form action={changeStatus.bind(null, u.id, u.status === "ACTIVE" ? "DISABLED" : "ACTIVE")}>
                  <button className="rounded-lg border border-line px-3 py-2 text-sm">
                    {u.status === "ACTIVE" ? t("users.disable") : t("users.enable")}
                  </button>
                </form>
                <ConfirmAction
                  action={deleteUserAction.bind(null, u.id)}
                  label={t("users.delete")}
                  title={t("users.deleteTitle")}
                  message={t("users.deleteMessage", { name: u.fullName })}
                  confirmLabel={t("users.delete")}
                  cancelLabel={c("cancel")}
                  tone="danger"
                />
              </>
            )}
          </div></li>))}</ul>
      <h2 className="mb-3 mt-8 font-semibold">{t("users.invite")}</h2>
      {full ? <p className="rounded-lg bg-argan-soft p-4 text-sm text-gold-deep">{t("users.limit")}</p> :
        <FieldsForm action={inviteUserAction} cancelHref="/settings/users" submitLabel={t("users.send")} cancelLabel={c("cancel")} fields={[
          { name: "fullName", label: t("users.fullName"), required: true }, { name: "email", label: t("users.email"), type: "email", required: true },
          { name: "roleId", label: t("users.role"), type: "select", required: true, defaultValue: roles.find((r) => r.code === "MANAGER")?.id, options: roles.map((r) => ({ value: r.id, label: r.name })) }]} />}
    </>
  );
}
