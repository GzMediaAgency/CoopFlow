import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { documentLink } from "@/services/documents";

/** Ouvre ou télécharge un document : accès vérifié (permission + même coopérative), puis lien signé de 60 s. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });
  const ctx = await requirePermission("documents:read");
  try { return NextResponse.redirect(await documentLink(ctx, id, req.nextUrl.searchParams.get("download") === "1")); }
  catch (e) { return new NextResponse(e instanceof DomainError && e.code === "documentNotFound" ? "Not found" : "Storage error", { status: e instanceof DomainError && e.code === "documentNotFound" ? 404 : 502 }); }
}
