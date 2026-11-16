import type { EmailKind } from "@prisma/client";
import { z } from "zod";
import type { requireUser } from "@/lib/auth/session";
import type { TenantDb } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";
import { dateFmt, money } from "@/lib/format";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
/** Expéditeur : une coopérative (depuis une session) ou la tâche planifiée (sans utilisateur). */
export type Mailer = { db: TenantDb; org: { id: string; name: string; email: string | null; defaultLocale: string }; userId: string | null };
export const asMailer = (c: Ctx): Mailer => ({ db: c.db, org: c.org, userId: c.user.id });
const loc = (m: Mailer) => (m.org.defaultLocale === "ar" ? "ar" : "fr");

// ---------- modèles par défaut ----------
type Tpl = { subject: string; body: string };
export const DEFAULTS: Record<"fr" | "ar", Record<EmailKind, Tpl>> = {
  fr: {
    INVOICE: { subject: "Facture {{number}} — {{org}}", body: "Bonjour {{customer}},\n\nVeuillez trouver ci-dessous votre facture {{number}} d’un montant de {{total}}, à régler avant le {{due}}.\n\nMerci de votre confiance.\n{{org}}" },
    RECEIPT: { subject: "Reçu de paiement — facture {{number}}", body: "Bonjour {{customer}},\n\nNous avons bien reçu votre paiement de {{amount}} le {{date}} pour la facture {{number}}. Reste à payer : {{remaining}}.\n\nMerci,\n{{org}}" },
    ORDER_CONFIRMATION: { subject: "Commande {{number}} confirmée — {{org}}", body: "Bonjour {{customer}},\n\nVotre commande {{number}} d’un montant de {{total}} est confirmée. Nous vous préviendrons dès qu’elle sera prête.\n\nMerci,\n{{org}}" },
    REMINDER: { subject: "Rappel : facture {{number}} en attente de paiement", body: "Bonjour {{customer}},\n\nNotre facture {{number}} de {{total}} était à régler avant le {{due}}. Il reste {{remaining}} à payer. Si vous avez déjà payé, merci d’ignorer ce message.\n\n{{org}}" },
    TEST: { subject: "E-mail de test — {{org}}", body: "Ceci est un e-mail de test envoyé depuis CoopFlow.\nSi vous le recevez, l’envoi d’e-mails fonctionne.\n\n{{org}}" },
  },
  ar: {
    INVOICE: { subject: "فاتورة {{number}} — {{org}}", body: "مرحبا {{customer}}،\n\nتجدون أسفله فاتورتكم {{number}} بمبلغ {{total}}، المرجو أداؤها قبل {{due}}.\n\nشكرا على ثقتكم.\n{{org}}" },
    RECEIPT: { subject: "وصل أداء — الفاتورة {{number}}", body: "مرحبا {{customer}}،\n\nتوصلنا بأدائكم بمبلغ {{amount}} بتاريخ {{date}} عن الفاتورة {{number}}. المتبقي للأداء: {{remaining}}.\n\nشكرا،\n{{org}}" },
    ORDER_CONFIRMATION: { subject: "تأكيد الطلبية {{number}} — {{org}}", body: "مرحبا {{customer}}،\n\nتم تأكيد طلبيتكم {{number}} بمبلغ {{total}}. سنخبركم فور جاهزيتها.\n\nشكرا،\n{{org}}" },
    REMINDER: { subject: "تذكير: الفاتورة {{number}} في انتظار الأداء", body: "مرحبا {{customer}}،\n\nكانت فاتورتنا {{number}} بمبلغ {{total}} مستحقة قبل {{due}}. المتبقي للأداء {{remaining}}. إذا سبق أن أديتم، المرجو تجاهل هذه الرسالة.\n\n{{org}}" },
    TEST: { subject: "رسالة تجريبية — {{org}}", body: "هذه رسالة تجريبية مرسلة من CoopFlow.\nإذا وصلتكم فإن إرسال البريد يعمل.\n\n{{org}}" },
  },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fill = (t: string, vars: Record<string, string>, html: boolean) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] === undefined ? "" : html ? esc(vars[k]) : vars[k]));

export async function getTemplate(m: Mailer, kind: EmailKind): Promise<Tpl & { custom: boolean }> {
  const row = kind === "TEST" ? null : await m.db.emailTemplate.findFirst({ where: { kind } });
  return row ? { subject: row.subject, body: row.body, custom: true } : { ...DEFAULTS[loc(m)][kind], custom: false };
}
export async function saveTemplate(m: Mailer, kind: EmailKind, t: Tpl) {
  const row = await m.db.emailTemplate.findFirst({ where: { kind } });
  if (row) await m.db.emailTemplate.update({ where: { id: row.id }, data: t });
  else await m.db.emailTemplate.create({ data: { organizationId: m.org.id, kind, ...t } });
}
export const resetTemplate = (m: Mailer, kind: EmailKind) => m.db.emailTemplate.deleteMany({ where: { kind } });
export const recentLogs = (m: Mailer) => m.db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
export const emailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

// ---------- mise en page ----------
function layout(m: Mailer, bodyHtml: string, blockHtml: string) {
  const rtl = loc(m) === "ar";
  return `<!doctype html><html dir="${rtl ? "rtl" : "ltr"}"><body style="margin:0;background:#fefaef;font-family:Arial,Helvetica,sans-serif;color:#17302b">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #ece5d2">
<tr><td style="background:#123f38;color:#fff;padding:18px 24px;font-size:18px;font-weight:bold">${esc(m.org.name)}</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.6">${bodyHtml}${blockHtml}</td></tr>
<tr><td style="padding:12px 24px;font-size:12px;color:#66706b;border-top:1px solid #ece5d2">${rtl ? "أُرسلت عبر CoopFlow" : "Envoyé via CoopFlow"}</td></tr></table></td></tr></table></body></html>`;
}

type InvLine = { description: string; quantity: unknown; unitPrice: unknown; vatRate: unknown; lineTotal: unknown };
function linesBlock(m: Mailer, items: InvLine[], totals?: { subtotal: unknown; taxTotal: unknown; total: unknown }) {
  const l = loc(m), H = l === "ar" ? ["البيان", "الكمية", "الثمن", "المجموع"] : ["Désignation", "Qté", "P.U. HT", "Total HT"];
  const td = "padding:8px;border-bottom:1px solid #ece5d2;font-size:14px";
  const row = (i: InvLine) => `<tr><td style="${td}">${esc(i.description)}</td><td style="${td}">${Number(i.quantity)}</td><td style="${td}">${money(i.unitPrice, l)}</td><td style="${td}">${money(i.lineTotal, l)}</td></tr>`;
  const T = l === "ar" ? ["المجموع دون ضريبة", "الضريبة", "المجموع بالضريبة"] : ["Total HT", "TVA", "Total TTC"];
  const tot = totals ? `<tr><td colspan="3" style="padding:8px;text-align:end">${T[0]}</td><td style="padding:8px">${money(totals.subtotal, l)}</td></tr><tr><td colspan="3" style="padding:8px;text-align:end">${T[1]}</td><td style="padding:8px">${money(totals.taxTotal, l)}</td></tr><tr><td colspan="3" style="padding:8px;text-align:end;font-weight:bold">${T[2]}</td><td style="padding:8px;font-weight:bold">${money(totals.total, l)}</td></tr>` : "";
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse"><tr style="background:#fefaef">${H.map((h) => `<th style="padding:8px;text-align:start;font-size:13px">${h}</th>`).join("")}</tr>${items.map(row).join("")}${tot}</table>`;
}

// ---------- envoi ----------
async function deliver(m: Mailer, to: string, subject: string, html: string, text: string) {
  const addr = /<([^>]+)>/.exec(process.env.EMAIL_FROM!)?.[1] ?? process.env.EMAIL_FROM!;
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", signal: ctrl.signal, headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${m.org.name.replace(/[<>",]/g, "")} via CoopFlow <${addr}>`, to: [to], subject, html, text, reply_to: m.org.email ?? undefined }) });
    return r.ok ? { ok: true as const } : { ok: false as const, error: `HTTP ${r.status}` };
  } catch { return { ok: false as const, error: "network" }; } finally { clearTimeout(timer); }
}

async function sendTemplated(m: Mailer, kind: EmailKind, o: { to: string; vars: Record<string, string>; block?: string; ids?: { invoiceId?: string; orderId?: string; paymentId?: string } }) {
  if (!emailConfigured()) throw new DomainError("emailUnavailable");
  if (!z.string().email().safeParse(o.to).success) throw new DomainError("customerNoEmail");
  // garde-fou anti-abus : pas plus de 60 e-mails par heure et par coopérative
  if ((await m.db.emailLog.count({ where: { createdAt: { gte: new Date(Date.now() - 3600e3) } } })) >= 60) throw new DomainError("emailRateLimit");
  const tpl = await getTemplate(m, kind), vars = { org: m.org.name, ...o.vars };
  const subject = fill(tpl.subject, vars, false).replace(/[\r\n]+/g, " ").slice(0, 200); // pas de saut de ligne : pas d'injection d'en-têtes
  const bodyHtml = fill(esc(tpl.body), Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, esc(v)])), false).replace(/\n/g, "<br>");
  const res = await deliver(m, o.to, subject, layout(m, bodyHtml, o.block ?? ""), fill(tpl.body, vars, false));
  await m.db.emailLog.create({ data: { organizationId: m.org.id, kind, status: res.ok ? "SENT" : "FAILED", toEmail: o.to, subject, error: res.ok ? null : res.error, createdById: m.userId, ...o.ids } });
  if (!res.ok) throw new DomainError("emailFailed");
}

const invVars = (m: Mailer, inv: { number: string; total: unknown; amountPaid: unknown; dueDate: Date | null; customer: { name: string } }) => ({
  customer: inv.customer.name, number: inv.number, total: money(inv.total, loc(m)), remaining: money(Number(inv.total) - Number(inv.amountPaid), loc(m)), due: dateFmt(inv.dueDate, loc(m)), amount: "", date: "" });

async function loadInvoice(m: Mailer, id: string) {
  const inv = await m.db.invoice.findFirst({ where: { id, deletedAt: null }, include: { customer: true, items: true } });
  if (!inv) throw new DomainError("invoiceNotFound");
  if (!inv.customer.email) throw new DomainError("customerNoEmail"); // destinataire = e-mail enregistré du client, jamais une adresse libre
  return inv as typeof inv & { customer: { email: string } };
}

export async function emailInvoice(m: Mailer, id: string) {
  const inv = await loadInvoice(m, id);
  if (inv.status === "CANCELLED" || inv.status === "DRAFT") throw new DomainError("invoiceNotPayable");
  await sendTemplated(m, "INVOICE", { to: inv.customer.email, vars: invVars(m, inv), block: linesBlock(m, inv.items, inv), ids: { invoiceId: id } });
}

export async function emailReminder(m: Mailer, id: string) {
  const inv = await loadInvoice(m, id);
  if (!["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status)) throw new DomainError("invoiceNotPayable");
  if (await m.db.emailLog.count({ where: { invoiceId: id, kind: "REMINDER", status: "SENT", createdAt: { gte: new Date(Date.now() - 3 * 864e5) } } })) throw new DomainError("reminderRecent");
  await sendTemplated(m, "REMINDER", { to: inv.customer.email, vars: invVars(m, inv), block: linesBlock(m, inv.items, inv), ids: { invoiceId: id } });
}

export async function emailReceipt(m: Mailer, invoiceId: string, paymentId: string) {
  const pay = await m.db.payment.findFirst({ where: { id: paymentId, invoiceId, status: "COMPLETED", direction: "IN" } });
  if (!pay) throw new DomainError("invoiceNotFound");
  const inv = await loadInvoice(m, invoiceId);
  await sendTemplated(m, "RECEIPT", { to: inv.customer.email, vars: { ...invVars(m, inv), amount: money(pay.amount, loc(m)), date: dateFmt(pay.paidAt, loc(m)) }, ids: { invoiceId, paymentId } });
}

export async function emailOrderConfirmation(m: Mailer, orderId: string) {
  const o = await m.db.order.findFirst({ where: { id: orderId, deletedAt: null }, include: { customer: true, items: true } });
  if (!o) throw new DomainError("orderNotFound");
  if (!o.customer.email) throw new DomainError("customerNoEmail");
  if (["DRAFT", "NEW", "CANCELLED"].includes(o.status)) throw new DomainError("invalidTransition");
  await sendTemplated(m, "ORDER_CONFIRMATION", { to: o.customer.email, vars: { customer: o.customer.name, number: o.number, total: money(o.total, loc(m)), remaining: "", due: "", amount: "", date: "" },
    block: linesBlock(m, o.items.map((i) => ({ ...i, description: i.description ?? "" })), o), ids: { orderId } });
}

/** Relance toutes les factures en retard (max 50 par passage, jamais deux fois en 3 jours pour la même facture). */
export async function sendReminders(m: Mailer) {
  const due = await m.db.invoice.findMany({ where: { status: "OVERDUE", deletedAt: null, customer: { email: { not: null } } }, orderBy: { dueDate: "asc" }, take: 50, select: { id: true } });
  let sent = 0, skipped = 0;
  for (const { id } of due) {
    try { await emailReminder(m, id); sent++; }
    catch (e) {
      if (e instanceof DomainError && ["emailUnavailable", "emailRateLimit"].includes(e.code)) { if (sent === 0) throw e; break; } // on s'arrête, on garde ce qui est parti
      skipped++;
    }
  }
  return { sent, skipped };
}

export async function sendTest(m: Mailer, to: string) {
  await sendTemplated(m, "TEST", { to, vars: {} });
}
