import { z } from "zod";
import { METHODS } from "./payment";

const text = z.string().trim().transform((v) => (v === "" ? undefined : v)).optional();
const line = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
});
// Les lignes arrivent en JSON (champ caché du formulaire) ; le serveur recharge produits, TVA et validité : rien n'est cru sur parole.
const lines = z.string().transform((s, ctx) => { try { return JSON.parse(s) as unknown; } catch { ctx.addIssue({ code: "custom", message: "invalidLines" }); return z.NEVER; } })
  .pipe(z.array(line).min(1, "noLines").max(100, "invalidLines"));
const optNum = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number({ invalid_type_error: "invalidNumber" }).min(0, "invalidNumber").optional());

export const orderSchema = z.object({ customerId: z.string().uuid("required"), lines, notes: text, status: z.enum(["DRAFT", "NEW"]).default("NEW") });
export const saleSchema = z.object({ customerId: z.string().uuid("required"), lines, notes: text, payAmount: optNum, payMethod: z.enum(METHODS).default("CASH") });
export type OrderInput = z.infer<typeof orderSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
