import type { OrderStatus } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import type { OrderInput } from "@/schemas/sales";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { lineTotal, totals } from "@/lib/totals";
import { asMailer, emailOrderConfirmation } from "./email";
import { completeSale, resolveLines } from "./sales";
import type { Tx } from "./stock";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 25;

export const FLOW: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["NEW", "CANCELLED"], NEW: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PREPARING", "CANCELLED"], PREPARING: ["READY", "CANCELLED"],
  READY: ["SHIPPED", "DELIVERED", "CANCELLED"], SHIPPED: ["DELIVERED", "CANCELLED"], DELIVERED: [], CANCELLED: [],
};
const RESERVED = new Set<OrderStatus>(["CONFIRMED", "PREPARING", "READY", "SHIPPED"]); // statuts où le stock est réservé

export async function listOrders(ctx: Ctx, f: { q?: string; status?: OrderStatus; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const where = { deletedAt: null, ...(f.status ? { status: f.status } : {}),
    ...(f.q ? { OR: [{ number: { contains: f.q, mode: "insensitive" as const } }, { customer: { name: { contains: f.q, mode: "insensitive" as const } } }] } : {}) };
  const [items, count, total] = await Promise.all([
    ctx.db.order.findMany({ where, orderBy: { orderedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { customer: { select: { name: true } } } }),
    ctx.db.order.count({ where }), ctx.db.order.count({ where: { deletedAt: null } }),
  ]);
  return { items, count, hasAny: total > 0, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export const getOrder = (ctx: Ctx, id: string) =>
  ctx.db.order.findFirst({ where: { id, deletedAt: null }, include: {
    customer: true, items: { include: { product: { select: { name: true, unit: true } } } }, invoices: { select: { id: true, number: true } } } });

export async function createOrder(ctx: Ctx, input: OrderInput) {
  if (!(await ctx.db.customer.findFirst({ where: { id: input.customerId, deletedAt: null } }))) throw new DomainError("customerNotFound");
  const lines = await resolveLines(ctx.db, input.lines), t = totals(lines), y = new Date().getFullYear();
  for (let a = 0; a < 4; a++) {
    try {
      const order = await ctx.db.$transaction(async (tx) => tx.order.create({ data: {
        organizationId: ctx.org.id, number: `${ctx.org.orderPrefix}-${y}-${String((await tx.order.count()) + 1 + a).padStart(3, "0")}`,
        customerId: input.customerId, status: input.status, ...t, notes: input.notes, createdById: ctx.user.id,
        items: { create: lines.map((l) => ({ productId: l.productId, description: l.name, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount, vatRate: l.vatRate, lineTotal: lineTotal(l) })) } } }));
      await audit(ctx, "CREATE", "order", order.id, { number: order.number });
      return order;
    } catch (e) { if ((e as { code?: string }).code !== "P2002") throw e; }
  }
  throw new DomainError("numberTaken");
}

/** Réserve du stock « disponible » (quantité − réservé) de façon atomique. */
async function reserve(tx: Tx, org: string, productId: string, qty: number) {
  const n = await tx.$executeRaw`UPDATE "inventory" SET "reservedQty" = "reservedQty" + ${qty}::numeric
    WHERE "productId" = ${productId}::uuid AND "organizationId" = ${org}::uuid AND "quantity" - "reservedQty" >= ${qty}::numeric`;
  if (n === 0) throw new DomainError("insufficientStock");
}

/** Change le statut : confirmer réserve le stock, annuler le libère, livrer crée vente + sortie de stock + facture. */
export async function changeStatus(ctx: Ctx, id: string, to: OrderStatus) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await ctx.db.$transaction(async (tx) => {
        const order = await tx.order.findFirst({ where: { id, deletedAt: null }, include: { items: true } });
        if (!order) throw new DomainError("orderNotFound");
        if (!FLOW[order.status].includes(to)) throw new DomainError("invalidTransition");
        const lock = await tx.order.updateMany({ where: { id, status: order.status }, data: { status: to } }); // verrou : un seul changement à la fois
        if (lock.count === 0) throw new DomainError("invalidTransition");

        if (to === "CONFIRMED") for (const i of order.items) await reserve(tx, ctx.org.id, i.productId, Number(i.quantity));
        else if (to === "CANCELLED" && RESERVED.has(order.status))
          for (const i of order.items) await tx.inventory.updateMany({ where: { productId: i.productId, reservedQty: { gte: Number(i.quantity) } }, data: { reservedQty: { decrement: Number(i.quantity) } } });
        else if (to === "DELIVERED")
          await completeSale(tx, ctx, { customerId: order.customerId, orderId: id, attempt, releaseReserved: true, notes: order.notes ?? undefined,
            lines: order.items.map((i) => ({ productId: i.productId, name: i.description ?? "", quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), discount: Number(i.discount), vatRate: Number(i.vatRate) })) });
      });
      await audit(ctx, "UPDATE", "order", id, { status: to });
      if (to === "CONFIRMED" && ctx.org.emailAutoOrder) await emailOrderConfirmation(asMailer(ctx), id).catch(() => undefined); // best effort : un échec d'e-mail ne bloque jamais la commande
      return;
    } catch (e) { if ((e as { code?: string }).code !== "P2002" || to !== "DELIVERED") throw e; }
  }
  throw new DomainError("numberTaken");
}
