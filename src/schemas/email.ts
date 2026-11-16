import { z } from "zod";
export const EMAIL_KINDS = ["INVOICE", "RECEIPT", "ORDER_CONFIRMATION", "REMINDER"] as const;
export const templateSchema = z.object({ subject: z.string().trim().min(1, "required").max(150, "tooLong"), body: z.string().trim().min(1, "required").max(3000, "tooLong") });
export const emailPrefsSchema = z.object({ autoOrder: z.enum(["0", "1"]), autoReminders: z.enum(["0", "1"]) });
