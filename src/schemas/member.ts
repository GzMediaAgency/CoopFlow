import { z } from "zod";

// Les messages sont des CODES, traduits dans l'interface (validation.<code>) pour rester FR/AR.
const text = z.string().trim().transform((v) => (v === "" ? undefined : v)).optional();
const date = text.refine((v) => !v || !Number.isNaN(Date.parse(v)), "invalidDate");
const num = z.coerce.number({ invalid_type_error: "invalidNumber" }).min(0, "invalidNumber");

export const MEMBER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "LEFT"] as const;

export const memberSchema = z.object({
  firstName: z.string().trim().min(1, "required").max(80, "tooLong"),
  lastName: z.string().trim().min(1, "required").max(80, "tooLong"),
  cin: text.refine((v) => !v || /^[A-Za-z]{1,2}\d{5,8}$/.test(v), "invalidCin"),
  birthDate: date,
  phone: text.refine((v) => !v || /^(\+212|0)[5-7]\d{8}$/.test(v.replace(/[\s.-]/g, "")), "invalidPhone"),
  email: text.refine((v) => !v || z.string().email().safeParse(v).success, "invalidEmail"),
  address: text,
  city: text,
  joinedAt: date,
  role: text,
  groupName: text,
  status: z.enum(MEMBER_STATUSES).default("ACTIVE"),
  sharesCount: num.int("invalidNumber").default(0),
  shareValue: num.default(100),
  notes: text,
});
export type MemberInput = z.infer<typeof memberSchema>;
