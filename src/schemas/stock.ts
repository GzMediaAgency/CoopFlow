import { z } from "zod";

const text = z.string().trim().transform((v) => (v === "" ? undefined : v)).optional();
export const IN_TYPES = ["PURCHASE", "CUSTOMER_RETURN"] as const;
export const OUT_TYPES = ["LOSS", "INTERNAL_USE", "SUPPLIER_RETURN"] as const;
export const MANUAL_TYPES = [...IN_TYPES, ...OUT_TYPES] as const; // production, vente et inventaire créent leurs mouvements eux-mêmes

export const movementSchema = z.object({
  productId: z.string().uuid("required"),
  type: z.enum(MANUAL_TYPES, { errorMap: () => ({ message: "required" }) }),
  quantity: z.coerce.number({ invalid_type_error: "invalidNumber" }).positive("invalidNumber"),
  movedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)) && Date.parse(v) <= Date.now() + 864e5, "invalidDate"),
  batchId: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
  reference: text,
  comment: text,
});
export type MovementInput = z.infer<typeof movementSchema>;
