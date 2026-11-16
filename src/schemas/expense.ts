import { z } from "zod";
import { METHODS, notFuture } from "./payment";
const text = z.string().trim().transform((v) => (v === "" ? undefined : v)).optional();
export const EXPENSE_CATEGORIES = ["RAW_MATERIALS", "TRANSPORT", "PACKAGING", "SALARIES", "ELECTRICITY", "WATER", "MARKETING", "MAINTENANCE", "ADMINISTRATION", "SUPPLIES", "OTHER"] as const;

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: "required" }) }),
  amount: z.coerce.number({ invalid_type_error: "invalidNumber" }).positive("invalidNumber"),
  spentAt: z.string().refine(notFuture, "invalidDate"),
  supplierId: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
  method: z.enum(METHODS).default("CASH"),
  note: text,
  onCredit: z.enum(["0", "1"]).default("0"),
}).superRefine((d, ctx) => { if (d.onCredit === "1" && !d.supplierId) ctx.addIssue({ code: "custom", path: ["supplierId"], message: "required" }); }); // une dette suppose un fournisseur
export type ExpenseInput = z.infer<typeof expenseSchema>;
