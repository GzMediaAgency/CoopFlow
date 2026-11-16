import { getTranslations } from "next-intl/server";
import { Tabs } from "@/components/ui/tabs";

export async function SettingsTabs({ current }: { current: "general" | "billing" | "email" | "whatsapp" | "users" | "activity" | "subscription" | "contact" }) {
  const t = await getTranslations("settings.tabs");
  const href = { general: "/settings", billing: "/settings/billing", email: "/settings/email", whatsapp: "/settings/whatsapp", users: "/settings/users", activity: "/settings/activity", subscription: "/settings/subscription", contact: "/settings/contact" } as const;
  return <Tabs current={current} items={(Object.keys(href) as (keyof typeof href)[]).map((k) => ({ key: k, href: href[k], label: t(k) }))} />;
}
