import { z } from "zod";
import { METHODS, notFuture } from "./payment";
import { onboardingSchema } from "./auth";

const text = z.string().trim().transform((v) => (v === "" ? undefined : v)).optional();
const uuid = z.string().uuid("required");
const amount = z.coerce.number({ invalid_type_error: "invalidNumber" }).positive("invalidNumber");
const dateOk = (v?: string) => !v || !Number.isNaN(Date.parse(v));

// ----- cotisations -----
export const CONTRIBUTION_TYPES = ["SHARE", "MEMBERSHIP", "CONTRIBUTION", "OTHER"] as const;
export const contributionSchema = z.object({ memberId: uuid, type: z.enum(CONTRIBUTION_TYPES), amountDue: amount, dueDate: z.string().refine((v) => dateOk(v) && !!v, "invalidDate"), note: text });
export const contributionPaymentSchema = z.object({ amount, method: z.enum(METHODS).default("CASH"), paidAt: z.string().refine(notFuture, "invalidDate"), reference: text });

// ----- fournisseurs -----
export const supplierSchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"), company: text,
  ice: text.refine((v) => !v || /^\d{15}$/.test(v), "invalidIce"), taxId: text,
  phone: text.refine((v) => !v || /^\+?[0-9 .-]{6,20}$/.test(v), "invalidPhone"),
  email: text.refine((v) => !v || z.string().email().safeParse(v).success, "invalidEmail"), address: text, notes: text,
});

// ----- paramètres -----
export const orgSchema = onboardingSchema.extend({ name: z.string().trim().min(2, "required").max(100, "tooLong") });
export const billingSchema = z.object({
  invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z]{2,6}$/, "invalidPrefix"),
  orderPrefix: z.string().trim().toUpperCase().regex(/^[A-Z]{2,6}$/, "invalidPrefix"),
  defaultVatRate: z.coerce.number().refine((v) => [0, 7, 10, 14, 20].includes(v), "invalidNumber"),
});
export const inviteSchema = z.object({ fullName: z.string().trim().min(2, "required").max(100, "tooLong"), email: z.string().trim().toLowerCase().email("invalidEmail"), roleId: uuid });

// ----- documents -----
export const DOCUMENT_CATEGORIES = ["STATUTES", "MINUTES", "ADMINISTRATIVE", "CONTRACT", "INVOICE", "VOUCHER", "CERTIFICATE", "RECEIPT", "MEMBER_DOC", "FINANCIAL"] as const;
export const documentMetaSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES), name: text.refine((v) => !v || v.length <= 120, "tooLong"),
  expiresAt: text.refine((v) => dateOk(v), "invalidDate"),
});

// ----- super admin -----
export const PLAN_CODES = ["STARTER", "PROFESSIONAL", "BUSINESS"] as const;
export const SUB_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"] as const;
export const subscriptionSchema = z.object({ planCode: z.enum(PLAN_CODES), status: z.enum(SUB_STATUSES), periodEnd: text.refine((v) => dateOk(v), "invalidDate") });
export const planSchema = z.object({
  priceMonthly: z.coerce.number().min(0, "invalidNumber"),
  priceYearly: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0, "invalidNumber").optional()),
  maxUsers: z.coerce.number().int("invalidNumber").min(1, "invalidNumber"),
  maxMembers: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int("invalidNumber").min(1, "invalidNumber").optional()),
});
