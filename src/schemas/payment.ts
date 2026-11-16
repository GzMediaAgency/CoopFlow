import { z } from "zod";
const text = z.string().trim().transform((v) => (v === "" ? undefined : v)).optional();
export const METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"] as const;
export const notFuture = (v: string) => !Number.isNaN(Date.parse(v)) && Date.parse(v) <= Date.now() + 864e5;

export const paymentSchema = z.object({
  invoiceId: z.string().uuid("required"),
  amount: z.coerce.number({ invalid_type_error: "invalidNumber" }).positive("invalidNumber"),
  method: z.enum(METHODS).default("CASH"),
  paidAt: z.string().refine(notFuture, "invalidDate"),
  reference: text,
  note: text,
});
export type PaymentInput = z.infer<typeof paymentSchema>;
