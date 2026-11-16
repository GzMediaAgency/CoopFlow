import { z } from "zod";

const text = z.string().trim().transform((v) => (v === "" ? undefined : v)).optional();
const num = z.coerce.number({ invalid_type_error: "invalidNumber" }).min(0, "invalidNumber");
const optNum = z.preprocess((v) => (v === "" || v == null ? undefined : v), num.optional());

export const UNITS = ["UNIT", "KG", "G", "LITER", "CRATE", "TON", "METER", "CARTON", "OTHER"] as const;
export const VAT_RATES = [0, 7, 10, 14, 20] as const; // taux de TVA marocains, configurables par produit

export const productSchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  nameAr: text,
  sku: text.refine((v) => !v || /^[A-Za-z0-9._-]{2,30}$/.test(v), "invalidSku"), // vide = généré automatiquement
  category: text, // nom : la catégorie est créée si elle n'existe pas
  description: text,
  unit: z.enum(UNITS).default("UNIT"),
  purchasePrice: num.default(0),
  priceRetail: num.default(0),
  priceProfessional: optNum,
  priceReseller: optNum,
  priceMember: optNum,
  vatRate: z.coerce.number().refine((v) => (VAT_RATES as readonly number[]).includes(v), "invalidNumber").default(20),
  stockMin: num.default(0),
  stockMax: optNum,
  shelfLifeDays: optNum.refine((v) => v === undefined || Number.isInteger(v), "invalidNumber"),
  isActive: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});
export type ProductInput = z.infer<typeof productSchema>;
