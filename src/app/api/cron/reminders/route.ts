import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma, tenantDb } from "@/lib/db/tenant";
import { sendReminders } from "@/services/email";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Relances automatiques quotidiennes (Vercel Cron). Réservé : l'appel doit présenter CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !same(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return new NextResponse("Unauthorized", { status: 401 });
  const orgs = await prisma.organization.findMany({ where: { status: "ACTIVE", emailAutoReminders: true }, select: { id: true, name: true, email: true, defaultLocale: true } });
  let sent = 0;
  for (const org of orgs) {
    const m = { db: tenantDb(org.id), org, userId: null };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    await m.db.invoice.updateMany({ where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] }, dueDate: { lt: today }, deletedAt: null }, data: { status: "OVERDUE" } });
    try { sent += (await sendReminders(m)).sent; } catch (e) { console.error("[cron] reminders failed for", org.id, e); }
  }
  return NextResponse.json({ organizations: orgs.length, sent });
}
