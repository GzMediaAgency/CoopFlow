import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({ locales: ["fr", "ar"], defaultLocale: "fr" }); // "en" à ajouter plus tard
export const RTL_LOCALES = ["ar"];
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
