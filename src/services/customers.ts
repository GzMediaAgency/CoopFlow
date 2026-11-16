import type { CustomerType, Prisma } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import { defaultTier, type CustomerInput } from "@/schemas/customer";
import { audit } from "@/lib/audit";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 20;
export type CustomerFilters = { q?: string; type?: CustomerType; page?: number };

export const customerWhere = (f: CustomerFilters): Prisma.CustomerWhereInput => ({
  deletedAt: null,
  ...(f.type ? { type: f.type } : {}),
  ...(f.q ? { OR: ["name", "company", "phone", "email", "city"].map((k) => ({ [k]: { contains: f.q, mode: "insensitive" as const } })) } : {}),
});

const OPEN = ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] as const;
const owed = (inv: { total: unknown; amountPaid: unknown }[]) => inv.reduce((s, i) => s + Number(i.total) - Number(i.amountPaid), 0);

export async function listCustomers(ctx: Ctx, f: CustomerFilters) {
  const page = Math.max(1, f.page ?? 1), where = customerWhere(f);
  const [rows, count, total] = await Promise.all([
    ctx.db.customer.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { invoices: { where: { status: { in: [...OPEN] }, deletedAt: null }, select: { total: true, amountPaid: true } } } }),
    ctx.db.customer.count({ where }),
    ctx.db.customer.count({ where: { deletedAt: null } }),
  ]);
  return { items: rows.map((c) => ({ ...c, balance: owed(c.invoices) })), count, hasAny: total > 0, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export async function getCustomer(ctx: Ctx, id: string) {
  const c = await ctx.db.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      orders: { where: { deletedAt: null }, orderBy: { orderedAt: "desc" }, take: 10 },
      invoices: { where: { deletedAt: null }, orderBy: { issueDate: "desc" }, take: 10 },
      payments: { where: { status: "COMPLETED" }, orderBy: { paidAt: "desc" }, take: 10 },
    },
  });
  if (!c) return null;
  const open = await ctx.db.invoice.findMany({ where: { customerId: id, status: { in: [...OPEN] }, deletedAt: null }, select: { total: true, amountPaid: true } });
  return { ...c, balance: owed(open) };
}

const fields = (i: CustomerInput) => ({
  name: i.name, company: i.company ?? null, type: i.type, priceTier: i.priceTier ?? defaultTier(i.type),
  phone: i.phone ?? null, email: i.email ?? null, address: i.address ?? null, city: i.city ?? null, ice: i.ice ?? null, notes: i.notes ?? null,
});

export async function createCustomer(ctx: Ctx, input: CustomerInput) {
  const c = await ctx.db.customer.create({ data: { organizationId: ctx.org.id, ...fields(input) } });
  await audit(ctx, "CREATE", "customer", c.id, { name: c.name });
  return c;
}
export async function updateCustomer(ctx: Ctx, id: string, input: CustomerInput) {
  const c = await ctx.db.customer.update({ where: { id }, data: fields(input) });
  await audit(ctx, "UPDATE", "customer", id, fields(input));
  return c;
}
/** Archivage : les commandes, factures et paiements du client restent consultables. */
export async function archiveCustomer(ctx: Ctx, id: string) {
  await ctx.db.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(ctx, "DELETE", "customer", id, { archived: true });
}
