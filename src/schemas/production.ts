import { z } from "zod";

const text = z.string().trim().transform((v) => (v === "" ? undefined : v)).optional();
const date = text.refine((v) => !v || !Number.isNaN(Date.parse(v)), "invalidDate");
const optNum = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number({ invalid_type_error: "invalidNumber" }).min(0, "invalidNumber").optional());
const optUuid = z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid("required").optional());

export const productionSchema = z.object({
  productId: z.string().uuid("required"),
  memberId: optUuid,
  groupName: text,
  plotOrUnit: text,
  quantity: z.coerce.number({ invalid_type_error: "invalidNumber" }).positive("invalidNumber"),
  producedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)) && Date.parse(v) <= Date.now() + 864e5, "invalidDate"), // pas de production dans le futur
  expiresAt: date,
  batchNumber: text.refine((v) => !v || /^[A-Za-z0-9._-]{3,40}$/.test(v), "invalidBatch"), // vide = généré
  quality: text,
  unitCost: optNum,
  comment: text,
});
export type ProductionInput = z.infer<typeof productionSchema>;
