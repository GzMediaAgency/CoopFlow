import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { ENTITIES, IMPORT_META } from "@/lib/import/meta";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage() {
  const t = await getTranslations("importer");
  const ctx = await requirePermission("import:read");
  const entities = ENTITIES.filter((e) => ctx.permissions.has(IMPORT_META[e].permission)); // seulement ce que l'utilisateur a le droit de créer
  if (entities.length === 0) redirect("/");
  return (<><h1 className="mb-1 text-2xl font-bold">{t("title")}</h1><p className="mb-5 max-w-2xl text-sm text-ink-muted">{t("intro")}</p><ImportWizard entities={entities} /></>);
}
