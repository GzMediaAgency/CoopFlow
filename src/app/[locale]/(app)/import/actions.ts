"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { ENTITIES, IMPORT_META, type ImportEntity } from "@/lib/import/meta";
import { commitImport, previewImport, type RawRow, type ValidateResult } from "@/services/import";

type Fail = { error: string };

async function guard(entity: string, rows: unknown) {
  if (!(ENTITIES as string[]).includes(entity)) throw new DomainError("invalidImport");
  const ctx = await requirePermission(IMPORT_META[entity as ImportEntity].permission); // droit d'écriture sur le module visé
  if (!Array.isArray(rows)) throw new DomainError("invalidImport");
  const clean: RawRow[] = rows.slice(0, 5000).map((r) => ({ line: Number(r?.line) || 0, values: Object.fromEntries(Object.entries(r?.values ?? {}).slice(0, 40).map(([k, v]) => [k, String(v ?? "")])) }));
  return { ctx, entity: entity as ImportEntity, rows: clean };
}

export async function validateImportAction(entity: string, rows: unknown): Promise<ValidateResult | Fail> {
  try { const g = await guard(entity, rows); return await previewImport(g.ctx, g.entity, g.rows); }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[import] validate failed", e); return { error: "generic" }; }
}

export async function commitImportAction(entity: string, rows: unknown, skipErrors: boolean): Promise<{ imported: number; skipped: number } | Fail> {
  try { const g = await guard(entity, rows); const r = await commitImport(g.ctx, g.entity, g.rows, skipErrors === true); revalidatePath("/[locale]", "layout"); return r; }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[import] commit failed", e); return { error: "generic" }; }
}
