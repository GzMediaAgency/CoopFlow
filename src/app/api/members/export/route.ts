import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { MEMBER_STATUSES } from "@/schemas/member";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: NextRequest) {
  const ctx = await requirePermission("members:export");
  const sp = req.nextUrl.searchParams, q = sp.get("q")?.trim().slice(0, 80), status = MEMBER_STATUSES.find((s) => s === sp.get("status"));
  const rows = await ctx.db.member.findMany({
    where: { deletedAt: null, ...(status ? { status } : {}), ...(q ? { OR: ["firstName", "lastName", "cin", "phone"].map((k) => ({ [k]: { contains: q, mode: "insensitive" as const } })) } : {}) },
    orderBy: { lastName: "asc" }, take: 5000,
  });
  await audit(ctx, "EXPORT", "member", undefined, { count: rows.length });
  const head = ["N° membre", "Nom", "Prénom", "CIN", "Téléphone", "Email", "Ville", "Adhésion", "Statut"];
  const csv = [head, ...rows.map((m) => [m.memberNumber, m.lastName, m.firstName, m.cin, m.phone, m.email, m.city, m.joinedAt.toISOString().slice(0, 10), m.status])]
    .map((r) => r.map(esc).join(";")).join("\r\n");
  return new NextResponse("\uFEFF" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="membres.csv"' } }); // BOM + « ; » : s'ouvre proprement dans Excel FR
}
