import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { IMPORT_META, MAX_ROWS, type ImportEntity } from "@/lib/import/meta";
import { isoDate, mapEnum, numStr } from "@/lib/import/normalize";
import { customerSchema } from "@/schemas/customer";
import { memberSchema } from "@/schemas/member";
import { productSchema } from "@/schemas/product";
import { supplierSchema } from "@/schemas/modules";
import { applyMovement } from "./stock";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export type RawRow = { line: number; values: Record<string, string> };
export type RowError = { line: number; field?: string; code: string };
export type ValidateResult = { total: number; valid: number; errors: RowError[]; truncated: boolean };
type Valid = { line: number; data: any };

const KNOWN = new Set(["required", "tooLong", "invalidCin", "invalidDate", "invalidPhone", "invalidEmail", "invalidNumber", "invalidSku", "invalidIce", "duplicateInFile", "duplicateExisting", "unknownSku", "invalid"]);
const STATUS = { actif: "ACTIVE", inactif: "INACTIVE", suspendu: "SUSPENDED", sorti: "LEFT" };
const TYPE = { particulier: "INDIVIDUAL", entreprise: "COMPANY", revendeur: "RESELLER", restaurant: "RESTAURANT", hotel: "HOTEL", exportateur: "EXPORTER", grossiste: "WHOLESALER" };
const UNIT = { unite: "UNIT", piece: "UNIT", kg: "KG", kilo: "KG", g: "G", gramme: "G", litre: "LITER", l: "LITER", caisse: "CRATE", tonne: "TON", metre: "METER", m: "METER", carton: "CARTON", autre: "OTHER" };
const NUMERIC = ["purchasePrice", "priceRetail", "priceProfessional", "priceReseller", "priceMember", "vatRate", "stockMin", "stockMax", "shelfLifeDays", "quantity"];

/** Nettoie une ligne : seuls les champs connus passent, formats français convertis (dates, virgules, libellés). */
function prepare(entity: ImportEntity, values: Record<string, string>) {
  const allowed = new Set(IMPORT_META[entity].fields.map((f) => f.key)), out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) if (allowed.has(k)) out[k] = String(v ?? "").trim().slice(0, 500);
  for (const k of ["birthDate", "joinedAt"]) if (out[k]) out[k] = isoDate(out[k]);
  for (const k of NUMERIC) if (out[k]) out[k] = numStr(out[k]);
  if (out.status) out.status = mapEnum(STATUS, out.status);
  if (out.type) out.type = mapEnum(TYPE, out.type);
  if (out.unit) out.unit = mapEnum(UNIT, out.unit);
  for (const k of ["status", "type", "unit", "vatRate"]) if (out[k] === "") delete out[k]; // vide = valeur par défaut
  if (entity === "products") out.isActive = "true";
  return out;
}

function check(schema: z.ZodTypeAny, line: number, v: unknown, errors: RowError[]) {
  const r = schema.safeParse(v);
  if (r.success) return r.data;
  const fe = r.error.flatten().fieldErrors as Record<string, string[] | undefined>, entries = Object.entries(fe);
  for (const [field, codes] of entries) errors.push({ line, field, code: KNOWN.has(codes?.[0] ?? "") ? codes![0]! : "invalid" });
  if (!entries.length) errors.push({ line, code: "invalid" });
  return null;
}

export async function validateRows(ctx: Ctx, entity: ImportEntity, rows: RawRow[]) {
  if (rows.length === 0) throw new DomainError("emptyImport");
  if (rows.length > MAX_ROWS) throw new DomainError("tooManyRows");
  const errors: RowError[] = [], valid: Valid[] = [];

  if (entity === "stock") {
    const skus = rows.map((r) => (r.values.sku ?? "").trim());
    const products = await ctx.db.product.findMany({ where: { sku: { in: skus }, deletedAt: null }, select: { id: true, sku: true } });
    const bySku = new Map(products.map((p) => [p.sku.toLowerCase(), p.id])), seen = new Set<string>();
    for (const r of rows) {
      const p = prepare(entity, r.values), n = Number(p.quantity), key = (p.sku ?? "").toLowerCase();
      if (!p.sku) errors.push({ line: r.line, field: "sku", code: "required" });
      else if (!bySku.has(key)) errors.push({ line: r.line, field: "sku", code: "unknownSku" });
      else if (seen.has(key)) errors.push({ line: r.line, field: "sku", code: "duplicateInFile" });
      else if (!(n > 0) || !Number.isFinite(n)) errors.push({ line: r.line, field: "quantity", code: "invalidNumber" });
      else { seen.add(key); valid.push({ line: r.line, data: { productId: bySku.get(key)!, quantity: n } }); }
    }
    return { valid, errors };
  }

  const schema = { members: memberSchema, products: productSchema, customers: customerSchema, suppliers: supplierSchema }[entity];
  for (const r of rows) { const d = check(schema, r.line, prepare(entity, r.values), errors); if (d) valid.push({ line: r.line, data: d }); }

  // doublons : dans le fichier ET déjà présents en base (CIN des membres, référence des produits)
  const dupKey = entity === "members" ? "cin" : entity === "products" ? "sku" : null;
  if (dupKey) {
    const vals = valid.map((v) => String(v.data[dupKey] ?? "").toLowerCase()).filter(Boolean);
    const existing = new Set<string>(entity === "members"
      ? (await ctx.db.member.findMany({ where: { cin: { in: vals, mode: "insensitive" }, deletedAt: null }, select: { cin: true } })).map((m) => m.cin!.toLowerCase())
      : (await ctx.db.product.findMany({ where: { sku: { in: vals, mode: "insensitive" } }, select: { sku: true } })).map((p) => p.sku.toLowerCase()));
    const seen = new Set<string>(), keep: Valid[] = [];
    for (const v of valid) {
      const k = String(v.data[dupKey] ?? "").toLowerCase();
      if (k && seen.has(k)) errors.push({ line: v.line, field: dupKey, code: "duplicateInFile" });
      else if (k && existing.has(k)) errors.push({ line: v.line, field: dupKey, code: "duplicateExisting" });
      else { if (k) seen.add(k); keep.push(v); }
    }
    return { valid: keep, errors };
  }
  return { valid, errors };
}

export async function previewImport(ctx: Ctx, entity: ImportEntity, rows: RawRow[]): Promise<ValidateResult> {
  const { valid, errors } = await validateRows(ctx, entity, rows);
  errors.sort((a, b) => a.line - b.line);
  return { total: rows.length, valid: valid.length, errors: errors.slice(0, 100), truncated: errors.length > 100 };
}

/** Importe : revalide TOUT côté serveur (le navigateur n'est jamais cru), puis écrit en une seule transaction. */
export async function commitImport(ctx: Ctx, entity: ImportEntity, rows: RawRow[], skipErrors: boolean) {
  const { valid, errors } = await validateRows(ctx, entity, rows);
  if (errors.length > 0 && !skipErrors) throw new DomainError("importHasErrors");
  if (valid.length === 0) throw new DomainError("nothingToImport");
  const org = ctx.org.id, n = valid.length;

  await ctx.db.$transaction(async (tx) => {
    if (entity === "members") {
      const base = await tx.member.count(); // archivés inclus : un numéro de membre ne se réutilise jamais
      const members = valid.map((v, i) => ({ id: randomUUID(), organizationId: org, memberNumber: `M-${String(base + i + 1).padStart(3, "0")}`, d: v.data }));
      await tx.member.createMany({ data: members.map(({ id, organizationId, memberNumber, d }) => ({ id, organizationId, memberNumber, firstName: d.firstName, lastName: d.lastName, cin: d.cin ?? null,
        phone: d.phone?.replace(/[\s.-]/g, "") ?? null, email: d.email ?? null, address: d.address ?? null, city: d.city ?? null, role: d.role ?? null, groupName: d.groupName ?? null, notes: d.notes ?? null,
        status: d.status, birthDate: d.birthDate ? new Date(d.birthDate) : null, joinedAt: d.joinedAt ? new Date(d.joinedAt) : new Date() })) });
      const shares = members.filter((m) => m.d.sharesCount > 0);
      if (shares.length) await tx.memberShare.createMany({ data: shares.map((m) => ({ organizationId: org, memberId: m.id, sharesCount: m.d.sharesCount, shareValue: m.d.shareValue })) });
    } else if (entity === "products") {
      const cats = new Map((await tx.category.findMany()).map((c) => [c.name.toLowerCase(), c.id]));
      for (const name of new Set(valid.map((v) => v.data.category as string | undefined).filter((c): c is string => !!c)))
        if (!cats.has(name.toLowerCase())) cats.set(name.toLowerCase(), (await tx.category.create({ data: { organizationId: org, name } })).id);
      let auto = await tx.product.count();
      const products = valid.map((v) => ({ id: randomUUID(), d: v.data, sku: (v.data.sku as string | undefined) ?? `P-${String(++auto).padStart(3, "0")}` }));
      await tx.product.createMany({ data: products.map(({ id, d, sku }) => ({ id, organizationId: org, sku, name: d.name, nameAr: d.nameAr ?? null, description: d.description ?? null, unit: d.unit,
        categoryId: d.category ? cats.get(d.category.toLowerCase()) : null, purchasePrice: d.purchasePrice, priceRetail: d.priceRetail, priceProfessional: d.priceProfessional ?? null,
        priceReseller: d.priceReseller ?? null, priceMember: d.priceMember ?? null, vatRate: d.vatRate, stockMin: d.stockMin, stockMax: d.stockMax ?? null, shelfLifeDays: d.shelfLifeDays ?? null, isActive: true })) });
      await tx.inventory.createMany({ data: products.map((p) => ({ organizationId: org, productId: p.id })) });
    } else if (entity === "customers") {
      const { defaultTier } = await import("@/schemas/customer");
      await tx.customer.createMany({ data: valid.map(({ data: d }) => ({ organizationId: org, name: d.name, company: d.company ?? null, type: d.type, priceTier: d.priceTier ?? defaultTier(d.type),
        phone: d.phone ?? null, email: d.email ?? null, address: d.address ?? null, city: d.city ?? null, ice: d.ice ?? null, notes: d.notes ?? null })) });
    } else if (entity === "suppliers") {
      await tx.supplier.createMany({ data: valid.map(({ data: d }) => ({ organizationId: org, name: d.name, company: d.company ?? null, ice: d.ice ?? null, taxId: d.taxId ?? null,
        phone: d.phone ?? null, email: d.email ?? null, address: d.address ?? null, notes: d.notes ?? null })) });
    } else {
      for (const v of valid) await applyMovement(tx, { organizationId: org, userId: ctx.user.id, productId: v.data.productId, direction: "IN", type: "ADJUSTMENT", quantity: v.data.quantity, reference: "Import stock initial", comment: "Import" });
    }
  }, { timeout: 30000 });

  await audit(ctx, "CREATE", `import_${entity}`, undefined, { imported: n, skipped: rows.length - n });
  return { imported: n, skipped: rows.length - n };
}
