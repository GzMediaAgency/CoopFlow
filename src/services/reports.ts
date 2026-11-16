import type { requireUser } from "@/lib/auth/session";
import { stockOverview } from "./stock-ops";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export type Period = { from: Date; to: Date };
const n = (v: unknown) => Number(v ?? 0);

export async function buildReport(ctx: Ctx, per: Period) {
  const range = { gte: per.from, lt: per.to };
  const saleWhere = { soldAt: range, status: "COMPLETED" as const, deletedAt: null };
  const [credit, repaid] = await Promise.all([
    ctx.db.expense.aggregate({ where: { deletedAt: null, onCredit: true }, _sum: { amount: true } }),
    ctx.db.payment.aggregate({ where: { type: "SUPPLIER", direction: "OUT", status: "COMPLETED" }, _sum: { amount: true } }),
  ]);
  const [sales, salesCount, topItems, topCust, cashIn, cashContrib, exp, expByCat, open, prod, newMembers, contrib, stock] = await Promise.all([
    ctx.db.sale.aggregate({ where: saleWhere, _sum: { subtotal: true, taxTotal: true, total: true } }),
    ctx.db.sale.count({ where: saleWhere }),
    ctx.db.saleItem.groupBy({ by: ["productId"], where: { sale: { organizationId: ctx.org.id, ...saleWhere } }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { lineTotal: "desc" } }, take: 5 }),
    ctx.db.sale.groupBy({ by: ["customerId"], where: { ...saleWhere, customerId: { not: null } }, _sum: { total: true }, orderBy: { _sum: { total: "desc" } }, take: 5 }),
    ctx.db.payment.aggregate({ where: { direction: "IN", status: "COMPLETED", paidAt: range }, _sum: { amount: true } }),
    ctx.db.payment.aggregate({ where: { type: "CONTRIBUTION", status: "COMPLETED", paidAt: range }, _sum: { amount: true } }),
    ctx.db.expense.aggregate({ where: { deletedAt: null, spentAt: range }, _sum: { amount: true } }),
    ctx.db.expense.groupBy({ by: ["category"], where: { deletedAt: null, spentAt: range }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } } }),
    ctx.db.invoice.aggregate({ where: { deletedAt: null, status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } }, _sum: { total: true, amountPaid: true } }),
    ctx.db.productionRecord.groupBy({ by: ["productId"], where: { producedAt: range }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
    ctx.db.member.count({ where: { deletedAt: null, joinedAt: range } }),
    ctx.db.contribution.aggregate({ where: { deletedAt: null, dueDate: range }, _sum: { amountDue: true, amountPaid: true } }),
    stockOverview(ctx, {}),
  ]);
  const pids = [...new Set([...topItems.map((t) => t.productId), ...prod.map((p) => p.productId)])];
  const cids = topCust.map((c) => c.customerId!).filter(Boolean);
  const [products, customers] = await Promise.all([
    ctx.db.product.findMany({ where: { id: { in: pids } }, select: { id: true, name: true, unit: true } }),
    ctx.db.customer.findMany({ where: { id: { in: cids } }, select: { id: true, name: true } }),
  ]);
  const pn = new Map(products.map((p) => [p.id, p])), cn = new Map(customers.map((c) => [c.id, c.name]));
  const revenue = n(sales._sum.total), income = n(cashIn._sum.amount), spent = n(exp._sum.amount);
  return {
    sales: { ht: n(sales._sum.subtotal), vat: n(sales._sum.taxTotal), ttc: revenue, count: salesCount, basket: salesCount ? revenue / salesCount : 0,
      top: topItems.map((t) => ({ name: pn.get(t.productId)?.name ?? "—", qty: n(t._sum.quantity), amount: n(t._sum.lineTotal) })),
      customers: topCust.map((c) => ({ name: cn.get(c.customerId!) ?? "—", amount: n(c._sum.total) })) },
    finance: { income, contributions: n(cashContrib._sum.amount), spent, result: income - spent, receivables: n(open._sum.total) - n(open._sum.amountPaid), payables: n(credit._sum.amount) - n(repaid._sum.amount),
      byCategory: expByCat.map((e) => ({ category: e.category, amount: n(e._sum.amount) })) },
    production: prod.map((p) => ({ name: pn.get(p.productId)?.name ?? "—", qty: n(p._sum.quantity), unit: pn.get(p.productId)?.unit ?? "UNIT" })),
    members: { added: newMembers },
    contributions: { due: n(contrib._sum.amountDue), paid: n(contrib._sum.amountPaid) },
    stock: stock.kpi,
  };
}

export async function exportRows(ctx: Ctx, type: string, per: Period): Promise<string[][] | null> {
  const range = { gte: per.from, lt: per.to };
  if (type === "sales") {
    const rows = await ctx.db.sale.findMany({ where: { soldAt: range, status: "COMPLETED", deletedAt: null }, orderBy: { soldAt: "asc" }, take: 5000, include: { customer: { select: { name: true } } } });
    return [["N°", "Date", "Client", "Total HT", "TVA", "Total TTC", "Payé", "Paiement"], ...rows.map((r) => [r.number, r.soldAt.toISOString().slice(0, 10), r.customer?.name ?? "", String(r.subtotal), String(r.taxTotal), String(r.total), String(r.amountPaid), r.paymentState])];
  }
  if (type === "expenses") {
    const rows = await ctx.db.expense.findMany({ where: { deletedAt: null, spentAt: range }, orderBy: { spentAt: "asc" }, take: 5000, include: { supplier: { select: { name: true } } } });
    return [["Date", "Catégorie", "Montant", "Fournisseur", "Mode", "Note"], ...rows.map((r) => [r.spentAt.toISOString().slice(0, 10), r.category, String(r.amount), r.supplier?.name ?? "", r.method, r.note ?? ""])];
  }
  if (type === "payments") {
    const rows = await ctx.db.payment.findMany({ where: { paidAt: range, status: "COMPLETED" }, orderBy: { paidAt: "asc" }, take: 5000, include: { customer: { select: { name: true } }, invoice: { select: { number: true } } } });
    return [["Date", "Type", "Sens", "Montant", "Mode", "Client", "Facture", "Référence"], ...rows.map((r) => [r.paidAt.toISOString().slice(0, 10), r.type, r.direction, String(r.amount), r.method, r.customer?.name ?? "", r.invoice?.number ?? "", r.reference ?? ""])];
  }
  return null;
}
