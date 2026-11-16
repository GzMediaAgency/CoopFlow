import type { PaymentMethod } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import type { SaleInput } from "@/schemas/sales";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { lineTotal, totals } from "@/lib/totals";
import { recordPayment } from "./payments";
import { applyOutFifo, type Tx } from "./stock";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 25;
export type SaleLine = { productId: string; name: string; quantity: number; unitPrice: number; discount: number; vatRate: number };
const pad = (n: number) => String(n).padStart(3, "0");

/** Recharge les produits côté serveur : TVA, nom et existence ne viennent jamais du navigateur. */
export async function resolveLines(db: Pick<Tx, "product">, raw: { productId: string; quantity: number; unitPrice: number; discount: number }[]): Promise<SaleLine[]> {
  const products = await db.product.findMany({ where: { id: { in: raw.map((r) => r.productId) }, deletedAt: null, isActive: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  return raw.map((r) => {
    const p = byId.get(r.productId);
    if (!p) throw new DomainError("productNotFound");
    if (r.discount > r.quantity * r.unitPrice) throw new DomainError("invalidLines");
    return { productId: p.id, name: p.name, quantity: r.quantity, unitPrice: r.unitPrice, discount: r.discount, vatRate: Number(p.vatRate) };
  });
}

/**
 * Cœur du workflow : vente + sortie de stock (FIFO) + facture émise (+ paiement éventuel), dans UNE transaction.
 * Appelée à la livraison d'une commande ou pour une vente directe (comptoir).
 */
export async function completeSale(tx: Tx, ctx: Ctx, p: {
  customerId: string; orderId?: string; lines: SaleLine[]; notes?: string; attempt: number; releaseReserved?: boolean;
  payment?: { amount: number; method: PaymentMethod; reference?: string };
}) {
  const y = new Date().getFullYear(), org = ctx.org.id, t = totals(p.lines);
  const saleNumber = `VTE-${y}-${pad((await tx.sale.count()) + 1 + p.attempt)}`;
  const invoiceNumber = `${ctx.org.invoicePrefix}-${y}-${pad((await tx.invoice.count()) + 1 + p.attempt)}`;

  const sale = await tx.sale.create({ data: {
    organizationId: org, number: saleNumber, customerId: p.customerId, orderId: p.orderId, status: "COMPLETED", ...t, notes: p.notes, createdById: ctx.user.id,
    items: { create: p.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount, vatRate: l.vatRate, lineTotal: lineTotal(l) })) } } });

  for (const l of p.lines) {
    if (p.releaseReserved) {
      await tx.inventory.updateMany({ where: { productId: l.productId, reservedQty: { gte: l.quantity } }, data: { reservedQty: { decrement: l.quantity } } });
    } else { // vente directe : on ne touche pas au stock réservé par des commandes confirmées
      const inv = await tx.inventory.findFirst({ where: { productId: l.productId } });
      if (!inv || Number(inv.quantity) - Number(inv.reservedQty) < l.quantity) throw new DomainError("insufficientStock");
    }
    await applyOutFifo(tx, { organizationId: org, userId: ctx.user.id, productId: l.productId, type: "SALE", quantity: l.quantity, reference: saleNumber, saleId: sale.id, orderId: p.orderId });
  }

  const invoice = await tx.invoice.create({ data: {
    organizationId: org, number: invoiceNumber, customerId: p.customerId, saleId: sale.id, orderId: p.orderId, status: "ISSUED", dueDate: new Date(Date.now() + 30 * 864e5),
    ...t, validatedAt: new Date(), paymentTerms: "Paiement à 30 jours", notes: p.notes,
    items: { create: p.lines.map((l) => ({ productId: l.productId, description: l.name, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount, vatRate: l.vatRate, lineTotal: lineTotal(l) })) } } });

  if (p.payment && p.payment.amount > 0) await recordPayment(tx, ctx, { invoiceId: invoice.id, ...p.payment });
  return { sale, invoice };
}

export async function createSale(ctx: Ctx, input: SaleInput) {
  if (!(await ctx.db.customer.findFirst({ where: { id: input.customerId, deletedAt: null } }))) throw new DomainError("customerNotFound");
  const lines = await resolveLines(ctx.db, input.lines);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const out = await ctx.db.$transaction((tx) => completeSale(tx, ctx, { customerId: input.customerId, lines, notes: input.notes, attempt,
        payment: input.payAmount ? { amount: input.payAmount, method: input.payMethod } : undefined }));
      await audit(ctx, "CREATE", "sale", out.sale.id, { number: out.sale.number, invoice: out.invoice.number });
      return out;
    } catch (e) { if ((e as { code?: string }).code !== "P2002") throw e; } // numéro déjà pris en parallèle : on réessaie
  }
  throw new DomainError("numberTaken");
}

export async function listSales(ctx: Ctx, f: { q?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const where = { status: "COMPLETED" as const, deletedAt: null, ...(f.q ? { OR: [{ number: { contains: f.q, mode: "insensitive" as const } }, { customer: { name: { contains: f.q, mode: "insensitive" as const } } }] } : {}) };
  const [items, count] = await Promise.all([
    ctx.db.sale.findMany({ where, orderBy: { soldAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { customer: { select: { name: true } }, invoices: { select: { id: true, number: true }, take: 1 } } }),
    ctx.db.sale.count({ where }),
  ]);
  return { items, count, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}
