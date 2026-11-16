import { LayoutDashboard, Users, Sprout, Package, Boxes, ClipboardList, UserRound, Truck, ShoppingCart, FileText, Wallet, Receipt, HandCoins, BarChart3, FolderOpen, Settings, Upload, type LucideIcon } from "lucide-react";
import type { Module } from "@/lib/auth/permissions";

export type Group = "overview" | "activity" | "commerce" | "finance" | "admin";
export const GROUPS: Group[] = ["overview", "activity", "commerce", "finance", "admin"];
// ready=false : module pas encore construit → affiché « Bientôt » au lieu d'une page introuvable
export const NAV: { key: Module; href: string; icon: LucideIcon; group: Group; ready: boolean }[] = [
  { key: "dashboard", href: "/", icon: LayoutDashboard, group: "overview", ready: true },
  { key: "members", href: "/members", icon: Users, group: "activity", ready: true },
  { key: "production", href: "/production", icon: Sprout, group: "activity", ready: true },
  { key: "products", href: "/products", icon: Package, group: "activity", ready: true },
  { key: "stock", href: "/stock", icon: Boxes, group: "activity", ready: true },
  { key: "orders", href: "/orders", icon: ClipboardList, group: "commerce", ready: true },
  { key: "customers", href: "/customers", icon: UserRound, group: "commerce", ready: true },
  { key: "suppliers", href: "/suppliers", icon: Truck, group: "commerce", ready: true },
  { key: "sales", href: "/sales", icon: ShoppingCart, group: "commerce", ready: true },
  { key: "invoices", href: "/invoices", icon: FileText, group: "finance", ready: true },
  { key: "payments", href: "/payments", icon: Wallet, group: "finance", ready: true },
  { key: "expenses", href: "/expenses", icon: Receipt, group: "finance", ready: true },
  { key: "contributions", href: "/contributions", icon: HandCoins, group: "finance", ready: true },
  { key: "reports", href: "/reports", icon: BarChart3, group: "admin", ready: true },
  { key: "documents", href: "/documents", icon: FolderOpen, group: "admin", ready: true },
  { key: "import", href: "/import", icon: Upload, group: "admin", ready: true },
  { key: "settings", href: "/settings", icon: Settings, group: "admin", ready: true },
];
export const MOBILE_TABS = ["dashboard", "members"] as const; // + Menu
