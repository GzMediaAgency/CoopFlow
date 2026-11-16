import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Retour des liens e-mail Supabase (confirmation d'inscription, réinitialisation) : échange le code contre une session. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  let next = req.nextUrl.searchParams.get("next") ?? "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) next = "/"; // jamais de redirection vers un autre site
  if (code) {
    const { error } = await (await supabaseServer()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, req.url));
  }
  return NextResponse.redirect(new URL("/login?error=1", req.url));
}
