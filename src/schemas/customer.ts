import { z } from "zod";

const text = z.string().trim().transform((v) => (v === "" ? undefined : v)).optional();
export const CUSTOMER_TYPES = ["INDIVIDUAL", "COMPANY", "RESELLER", "RESTAURANT", "HOTEL", "EXPORTER", "WHOLESALER"] as const;
export const PRICE_TIERS = ["RETAIL", "PROFESSIONAL", "RESELLER", "MEMBER"] as const;

/** Niveau de prix proposé par défaut selon le type de client. */
export const defaultTier = (t: (typeof CUSTOMER_TYPES)[number]): (typeof PRICE_TIERS)[number] =>
  t === "INDIVIDUAL" ? "RETAIL" : ["COMPANY", "RESTAURANT", "HOTEL"].includes(t) ? "PROFESSIONAL" : "RESELLER";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  company: text,
  type: z.enum(CUSTOMER_TYPES).default("INDIVIDUAL"),
  priceTier: z.preprocess((v) => (v === "" ? undefined : v), z.enum(PRICE_TIERS).optional()), // vide = selon le type
  phone: text.refine((v) => !v || /^\+?[0-9 .-]{6,20}$/.test(v), "invalidPhone"), // numéros étrangers acceptés (exportateurs)
  email: text.refine((v) => !v || z.string().email().safeParse(v).success, "invalidEmail"),
  address: text,
  city: text,
  ice: text.refine((v) => !v || /^\d{15}$/.test(v), "invalidIce"),
  notes: text,
});
export type CustomerInput = z.infer<typeof customerSchema>;
