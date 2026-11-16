import type { SystemRole } from "@prisma/client";

export const MODULES = ["dashboard","members","production","products","stock","orders","customers","suppliers","sales","invoices","payments","expenses","contributions","reports","documents","settings","import"] as const;
export type Module = (typeof MODULES)[number];
export type Action = "read" | "write" | "delete" | "validate" | "export";
export type PermissionCode = `${Module}:${Action}`;

const all = (mods: readonly Module[], acts: Action[]) => mods.flatMap((m) => acts.map((a) => `${m}:${a}` as PermissionCode));
const OPS: Module[] = ["production", "products", "stock", "orders", "customers", "sales"];
const FIN: Module[] = ["invoices", "payments", "expenses", "contributions"];

// Valeurs par défaut des rôles système ; les rôles personnalisés lisent la table role_permissions.
export const DEFAULT_PERMISSIONS: Record<SystemRole, PermissionCode[]> = {
  ADMIN: all(MODULES, ["read", "write", "delete", "validate", "export"]),
  PRESIDENT: [...all(MODULES.filter((m) => m !== "settings"), ["read", "export"]), ...all(["members", ...OPS, ...FIN], ["write", "validate"])],
  MANAGER: [...all(["dashboard", "members", ...OPS, "suppliers", "documents"], ["read", "write"]), "reports:read", "import:read"],
  ACCOUNTANT: [...all([...FIN, "reports", "dashboard"], ["read", "export"]), ...all(FIN, ["write", "validate"])],
  STOCK_MANAGER: [...all(["products", "stock", "production", "dashboard"], ["read", "write"]), "stock:validate", "import:read"],
  AGENT: ["dashboard:read", "orders:read", "orders:write", "customers:read", "sales:read", "sales:write"],
  CUSTOM: [],
};
