import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { auditExportRows, parseAuditFilters } from "@/services/settings";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: NextRequest) {
  const ctx = await requirePermission("settings:export");
  const f = parseAuditFilters(Object.fromEntries(req.nextUrl.searchParams));
  const rows = await auditExportRows(ctx, f);
  await audit(ctx, "EXPORT", "audit_log", undefined, { rows: rows.length, ...f }); // l'export du journal est lui-même journalisé
  const day = new Intl.DateTimeFormat("fr-MA", { dateStyle: "short" }), hour = new Intl.DateTimeFormat("fr-MA", { timeStyle: "medium" });
  const csv = [["Date", "Heure", "Utilisateur", "Action", "Objet", "Identifiant", "Détails"],
    ...rows.map((r) => [day.format(r.createdAt), hour.format(r.createdAt), r.user?.fullName ?? "", r.action, r.entityType, r.entityId ?? "", r.changes ? JSON.stringify(r.changes) : ""])].map((r) => r.map(esc).join(";")).join("\r\n");
  return new NextResponse("\uFEFF" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="journal-activite.csv"' } });
}
