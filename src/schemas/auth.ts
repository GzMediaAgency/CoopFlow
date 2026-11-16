import { z } from "zod";
const text = z.string().trim().transform((v) => (v === "" ? undefined : v)).optional();
const password = z.string().min(8, "passwordShort").max(72, "passwordShort"); // 72 : limite de bcrypt
const match = (d: { password: string; confirmPassword: string }, ctx: z.RefinementCtx) => { if (d.password !== d.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "passwordMismatch" }); };

export const registerSchema = z.object({
  orgName: z.string().trim().min(2, "required").max(100, "tooLong"),
  fullName: z.string().trim().min(2, "required").max(100, "tooLong"),
  email: z.string().trim().toLowerCase().email("invalidEmail"),
  password, confirmPassword: z.string(),
}).superRefine(match);
export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email("invalidEmail") });
export const resetSchema = z.object({ password, confirmPassword: z.string() }).superRefine(match);

export const COOP_TYPES = ["AGRICOLE", "ARTISANALE", "FEMININE", "ALIMENTAIRE", "TERROIR", "PRODUCTION", "TRANSFORMATION", "SERVICES"] as const;
export const SECTORS = ["AGRICULTURE", "ARTISANAT", "AGROALIMENTAIRE", "TERROIR", "COSMETIQUE", "TEXTILE", "SERVICES", "AUTRE"] as const;
export const onboardingSchema = z.object({
  type: z.enum(COOP_TYPES), sector: z.enum(SECTORS),
  foundedAt: text.refine((v) => !v || (!Number.isNaN(Date.parse(v)) && Date.parse(v) <= Date.now()), "invalidDate"),
  address: text, city: text, region: text,
  phone: text.refine((v) => !v || /^\+?[0-9 .-]{6,20}$/.test(v), "invalidPhone"),
  ice: text.refine((v) => !v || /^\d{15}$/.test(v), "invalidIce"),
  taxId: text, registrationNumber: text, description: text,
});
