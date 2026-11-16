"use server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { asWa, waInvoice, waReminder } from "@/services/whatsapp";
import { asMailer, emailInvoice, emailReceipt, emailReminder, sendReminders } from "@/services/email";

async function run(id: string, flash: string, fn: () => Promise<unknown>) {
  let error = "";
  try { await fn(); } catch (e) { error = e instanceof DomainError ? e.code : "generic"; if (!(e instanceof DomainError)) console.error("[email] failed", e); }
  redirect({ href: error ? `/invoices/${id}?error=${error}` : `/invoices/${id}?sent=${flash}`, locale: await getLocale() });
}

export async function sendInvoiceEmail(id: string) { const ctx = await requirePermission("invoices:write"); await run(id, "invoice", () => emailInvoice(asMailer(ctx), id)); }
export async function sendReminderEmail(id: string) { const ctx = await requirePermission("invoices:write"); await run(id, "reminder", () => emailReminder(asMailer(ctx), id)); }
export async function sendReceiptEmail(invoiceId: string, paymentId: string) { const ctx = await requirePermission("invoices:write"); await run(invoiceId, "receipt", () => emailReceipt(asMailer(ctx), invoiceId, paymentId)); }

export async function sendAllReminders() {
  const ctx = await requirePermission("invoices:write");
  let href = "/invoices";
  try { const r = await sendReminders(asMailer(ctx)); href = `/invoices?reminders=${r.sent}`; }
  catch (e) { href = `/invoices?error=${e instanceof DomainError ? e.code : "generic"}`; if (!(e instanceof DomainError)) console.error("[email] bulk failed", e); }
  redirect({ href, locale: await getLocale() });
}

export async function sendInvoiceWhatsApp(id: string) { const ctx = await requirePermission("invoices:write"); await run(id, "wa", () => waInvoice(asWa(ctx), id)); }
export async function sendReminderWhatsApp(id: string) { const ctx = await requirePermission("invoices:write"); await run(id, "wa", () => waReminder(asWa(ctx), id)); }
