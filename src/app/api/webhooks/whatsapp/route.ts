import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/tenant";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Vérification de l'adresse par Meta (une seule fois, à la configuration du webhook). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams, token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && sp.get("hub.mode") === "subscribe" && same(sp.get("hub.verify_token") ?? "", token)) return new NextResponse(sp.get("hub.challenge") ?? "", { status: 200 });
  return new NextResponse("Forbidden", { status: 403 });
}

/** Statuts de livraison : on ne retient que les échecs, après vérification de la signature de Meta. */
export async function POST(req: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return new NextResponse("Not configured", { status: 503 });
  const raw = await req.text();
  if (!same(req.headers.get("x-hub-signature-256") ?? "", `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`)) return new NextResponse("Invalid signature", { status: 401 });
  let body: { entry?: { changes?: { value?: { statuses?: { id?: string; status?: string; errors?: { code?: number }[] }[] } }[] }[] };
  try { body = JSON.parse(raw); } catch { return new NextResponse("Bad request", { status: 400 }); }
  for (const e of body.entry ?? []) for (const c of e.changes ?? []) for (const s of c.value?.statuses ?? [])
    if (s.status === "failed" && s.id) await prisma.whatsappLog.updateMany({ where: { externalId: s.id }, data: { status: "FAILED", error: `delivery / ${s.errors?.[0]?.code ?? "?"}` } });
  return new NextResponse("ok", { status: 200 });
}
