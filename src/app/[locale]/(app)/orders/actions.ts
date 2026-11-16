"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { OrderStatus } from "@prisma/client";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { orderSchema } from "@/schemas/sales";
import { changeStatus, createOrder, FLOW } from "@/services/orders";
import { asMailer, emailOrderConfirmation } from "@/services/email";
import { asWa, waOrder } from "@/services/whatsapp";

export type FormState = { errors?: Record<string, string[] | undefined>; error?: string };
const refresh = () => revalidatePath("/[locale]", "layout");

export async function saveOrder(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await requirePermission("orders:write");
  const parsed = orderSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  let id: string;
  try { id = (await createOrder(ctx, parsed.data)).id; }
  catch (e) { if (e instanceof DomainError) return { error: e.code }; console.error("[orders] create failed", e); return { error: "generic" }; }
  refresh();
  redirect({ href: `/orders/${id}`, locale: await getLocale() });
  return {}; // inatteignable : redirect() interrompt l'exécution
}

export async function changeStatusAction(id: string, to: OrderStatus) {
  const ctx = await requirePermission("orders:write");
  if (!Object.keys(FLOW).includes(to)) return;
  if (to === "DELIVERED") await requirePermission("sales:write"); // livrer crée la vente et la facture
  let error = "";
  try { await changeStatus(ctx, id, to); }
  catch (e) { error = e instanceof DomainError ? e.code : "generic"; if (!(e instanceof DomainError)) console.error("[orders] status failed", e); }
  refresh();
  redirect({ href: error ? `/orders/${id}?error=${error}` : `/orders/${id}`, locale: await getLocale() });
}

export async function sendOrderEmail(id: string) {
  const ctx = await requirePermission("orders:write");
  let error = "";
  try { await emailOrderConfirmation(asMailer(ctx), id); }
  catch (e) { error = e instanceof DomainError ? e.code : "generic"; if (!(e instanceof DomainError)) console.error("[orders] email failed", e); }
  redirect({ href: error ? `/orders/${id}?error=${error}` : `/orders/${id}?sent=1`, locale: await getLocale() });
}

export async function sendOrderWhatsApp(id: string) {
  const ctx = await requirePermission("orders:write");
  let error = "";
  try { await waOrder(asWa(ctx), id); }
  catch (e) { error = e instanceof DomainError ? e.code : "generic"; if (!(e instanceof DomainError)) console.error("[orders] whatsapp failed", e); }
  redirect({ href: error ? `/orders/${id}?error=${error}` : `/orders/${id}?sent=wa`, locale: await getLocale() });
}
