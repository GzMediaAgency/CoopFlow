import { getTranslations } from "next-intl/server";
import { Tabs } from "@/components/ui/tabs";

export async function StockTabs({ current }: { current: "overview" | "movements" | "inventories" }) {
  const t = await getTranslations("stock.tabs");
  return <Tabs current={current} items={[{ key: "overview", href: "/stock", label: t("overview") }, { key: "movements", href: "/stock/movements", label: t("movements") }, { key: "inventories", href: "/stock/inventories", label: t("inventories") }]} />;
}
