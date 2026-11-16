import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { CUSTOMER_TYPES } from "@/schemas/customer";
import { customerWhere } from "@/services/customers";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: NextRequest) {
  const ctx = await requirePermission("customers:export");
  const sp = req.nextUrl.searchParams;
  const rows = await ctx.db.customer.findMany({ where: customerWhere({ q: sp.get("q")?.trim().slice(0, 80) || undefined, type: CUSTOMER_TYPES.find((x) => x === sp.get("type")) }), orderBy: { name: "asc" }, take: 5000 });
  await audit(ctx, "EXPORT", "customer", undefined, { count: rows.length });
  const csv = [["Nom", "Entreprise", "Type", "Téléphone", "Email", "Ville", "ICE"], ...rows.map((c) => [c.name, c.company, c.type, c.phone, c.email, c.city, c.ice])].map((r) => r.map(esc).join(";")).join("\r\n");
  return new NextResponse("\uFEFF" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="clients.csv"' } });
}
