import type { WhatsappKind } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";
import { money } from "@/lib/format";
import { toWaNumber } from "@/lib/whatsapp";
import type { Mailer } from "./email";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export type WaSender = Mailer & { org: Mailer["org"] & { whatsappEnabled: boolean } };
export const asWa = (c: Ctx): WaSender => ({ db: c.db, org: c.org, userId: c.user.id });

const TPL_ENV = { ORDER: "WHATSAPP_TPL_ORDER", INVOICE: "WHATSAPP_TPL_INVOICE", REMINDER: "WHATSAPP_TPL_REMINDER" } as const;
/** Le module n'existe que si la plateforme a configuré l'API Meta et les 3 modèles de message approuvés. */
export const waConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TPL_ORDER && process.env.WHATSAPP_TPL_INVOICE && process.env.WHATSAPP_TPL_REMINDER);

export async function waPlanAllows(orgId: string) {
  const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId }, include: { plan: true } });
  const f = sub?.plan.features as { whatsapp?: boolean } | null;
  return !!sub && !!f?.whatsapp && !["EXPIRED", "CANCELLED"].includes(sub.status);
}
const clean = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 60) || "-"; // Meta refuse les sauts de ligne dans les variables

async function send(m: WaSender, kind: WhatsappKind, phone: string | null | undefined, params: string[], ids: { invoiceId?: string; orderId?: string }) {
  if (!waConfigured()) throw new DomainError("waUnavailable");
  if (!m.org.whatsappEnabled || !(await waPlanAllows(m.org.id))) throw new DomainError("waDisabled");
  const to = toWaNumber(phone); // destinataire = téléphone enregistré du client, jamais un numéro saisi à la volée
  if (!to) throw new DomainError("customerNoPhone");
  if ((await m.db.whatsappLog.count({ where: { createdAt: { gte: new Date(Date.now() - 3600e3) } } })) >= 60) throw new DomainError("waRateLimit");

  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 10_000);
  let ok = false, externalId: string | undefined, error: string | undefined;
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, { method: "POST", signal: ctrl.signal,
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: process.env[TPL_ENV[kind]], language: { code: m.org.defaultLocale === "ar" ? "ar" : "fr" },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: clean(text) })) }] } }) });
    const j = (await r.json().catch(() => null)) as { messages?: { id?: string }[]; error?: { code?: number } } | null;
    ok = r.ok; externalId = j?.messages?.[0]?.id; if (!r.ok) error = `HTTP ${r.status}${j?.error?.code ? ` / ${j.error.code}` : ""}`;
  } catch { error = "network"; } finally { clearTimeout(timer); }
  await m.db.whatsappLog.create({ data: { organizationId: m.org.id, kind, status: ok ? "SENT" : "FAILED", toPhone: to, externalId, error, createdById: m.userId, ...ids } });
  if (!ok) throw new DomainError("waFailed");
}

export async function waOrder(m: WaSender, orderId: string) {
  const o = await m.db.order.findFirst({ where: { id: orderId, deletedAt: null }, include: { customer: true } });
  if (!o) throw new DomainError("orderNotFound");
  if (["DRAFT", "NEW", "CANCELLED"].includes(o.status)) throw new DomainError("invalidTransition");
  await send(m, "ORDER", o.customer.phone, [o.customer.name, o.number, m.org.name], { orderId });
}

async function invoiceFor(m: WaSender, id: string) {
  const inv = await m.db.invoice.findFirst({ where: { id, deletedAt: null }, include: { customer: true } });
  if (!inv) throw new DomainError("invoiceNotFound");
  if (inv.status === "CANCELLED" || inv.status === "DRAFT") throw new DomainError("invoiceNotPayable");
  return inv;
}
const loc = (m: WaSender) => (m.org.defaultLocale === "ar" ? "ar" : "fr");

export async function waInvoice(m: WaSender, id: string) {
  const inv = await invoiceFor(m, id);
  await send(m, "INVOICE", inv.customer.phone, [inv.customer.name, inv.number, money(inv.total, loc(m)), m.org.name], { invoiceId: id });
}

export async function waReminder(m: WaSender, id: string) {
  const inv = await invoiceFor(m, id);
  if (!["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status)) throw new DomainError("invoiceNotPayable");
  if (await m.db.whatsappLog.count({ where: { invoiceId: id, kind: "REMINDER", status: "SENT", createdAt: { gte: new Date(Date.now() - 3 * 864e5) } } })) throw new DomainError("reminderRecent");
  await send(m, "REMINDER", inv.customer.phone, [inv.customer.name, inv.number, money(Number(inv.total) - Number(inv.amountPaid), loc(m)), m.org.name], { invoiceId: id });
}
