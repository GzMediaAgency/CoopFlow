import type { MemberStatus, Prisma } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";
import type { MemberInput } from "@/schemas/member";
import { audit } from "@/lib/audit";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export const PAGE_SIZE = 20;
export type MemberFilters = { q?: string; status?: MemberStatus; page?: number };

const whereOf = (f: MemberFilters): Prisma.MemberWhereInput => ({
  deletedAt: null,
  ...(f.status ? { status: f.status } : {}),
  ...(f.q ? { OR: ["firstName", "lastName", "cin", "phone", "memberNumber"].map((k) => ({ [k]: { contains: f.q, mode: "insensitive" as const } })) } : {}),
});

export async function listMembers(ctx: Ctx, f: MemberFilters) {
  const page = Math.max(1, f.page ?? 1), where = whereOf(f);
  const [rows, count, total] = await Promise.all([
    ctx.db.member.findMany({
      where, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { shares: { select: { sharesCount: true, shareValue: true } }, contributions: { where: { deletedAt: null }, select: { amountDue: true, amountPaid: true } } },
    }),
    ctx.db.member.count({ where }),
    ctx.db.member.count({ where: { deletedAt: null } }),
  ]);
  const items = rows.map((m) => {
    const shares = m.shares.reduce((s, x) => s + x.sharesCount, 0);
    const sharesAmount = m.shares.reduce((s, x) => s + x.sharesCount * Number(x.shareValue), 0);
    const balance = m.contributions.reduce((s, c) => s + Number(c.amountDue) - Number(c.amountPaid), 0); // reste à payer
    return { ...m, shares, sharesAmount, balance };
  });
  return { items, count, hasAny: total > 0, page, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export const getMember = (ctx: Ctx, id: string) =>
  ctx.db.member.findFirst({
    where: { id, deletedAt: null },
    include: {
      shares: true,
      contributions: { where: { deletedAt: null }, orderBy: { dueDate: "desc" } },
      productionRecords: { include: { product: { select: { name: true } } }, orderBy: { producedAt: "desc" }, take: 10 },
    },
  });

const toDate = (v?: string) => (v ? new Date(v) : undefined);
const fields = (i: MemberInput) => ({
  firstName: i.firstName, lastName: i.lastName, cin: i.cin ?? null, phone: i.phone?.replace(/[\s.-]/g, "") ?? null, email: i.email ?? null,
  address: i.address ?? null, city: i.city ?? null, role: i.role ?? null, groupName: i.groupName ?? null, notes: i.notes ?? null,
  status: i.status, birthDate: toDate(i.birthDate) ?? null,
});

export async function createMember(ctx: Ctx, input: MemberInput) {
  const base = await ctx.db.member.count(); // archivés inclus : le numéro ne se réutilise jamais
  for (let n = base + 1; n < base + 4; n++) { // réessaie si deux créations simultanées prennent le même numéro
    try {
      const m = await ctx.db.member.create({ data: { organizationId: ctx.org.id, memberNumber: `M-${String(n).padStart(3, "0")}`, joinedAt: toDate(input.joinedAt) ?? new Date(), ...fields(input) } });
      if (input.sharesCount > 0) await ctx.db.memberShare.create({ data: { organizationId: ctx.org.id, memberId: m.id, sharesCount: input.sharesCount, shareValue: input.shareValue } });
      await audit(ctx, "CREATE", "member", m.id, { memberNumber: m.memberNumber });
      return m;
    } catch (e) { if ((e as { code?: string }).code !== "P2002") throw e; }
  }
  throw new Error("Impossible d'attribuer un numéro de membre");
}

export async function updateMember(ctx: Ctx, id: string, input: MemberInput) {
  const m = await ctx.db.member.update({ where: { id }, data: { ...fields(input), ...(input.joinedAt ? { joinedAt: new Date(input.joinedAt) } : {}) } });
  await audit(ctx, "UPDATE", "member", id, fields(input));
  return m;
}

/** Archivage (jamais de suppression physique : l'historique de production et de paiement est conservé). */
export async function archiveMember(ctx: Ctx, id: string) {
  await ctx.db.member.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(ctx, "DELETE", "member", id, { archived: true });
}
