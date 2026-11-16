import { getTranslations } from "next-intl/server";
import { Tabs } from "@/components/ui/tabs";

export async function AdminTabs({ current }: { current: "overview" | "organizations" | "plans" | "users" }) {
  const t = await getTranslations("admin.tabs");
  const href = { overview: "/admin", organizations: "/admin/organizations", plans: "/admin/plans", users: "/admin/users" } as const;
  return <Tabs current={current} items={(Object.keys(href) as (keyof typeof href)[]).map((k) => ({ key: k, href: href[k], label: t(k) }))} />;
}
