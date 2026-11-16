import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { resolvePeriod } from "@/lib/period";
import { exportRows } from "@/services/reports";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: NextRequest) {
  const ctx = await requirePermission("reports:export");
  const sp = req.nextUrl.searchParams, type = sp.get("type") ?? "";
  const rows = await exportRows(ctx, type, resolvePeriod({ period: sp.get("period") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined }));
  if (!rows) return new NextResponse("Type d'export inconnu", { status: 400 });
  await audit(ctx, "EXPORT", `report_${type}`, undefined, { rows: rows.length - 1 });
  return new NextResponse("\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${type}.csv"` } });
}
