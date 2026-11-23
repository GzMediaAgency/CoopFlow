import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/** Retour des liens e-mail Supabase (confirmation d'inscription, réinitialisation) : échange le code contre une session. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const token_hash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const errorCode = req.nextUrl.searchParams.get("error_code") || req.nextUrl.searchParams.get("error");
  let next = req.nextUrl.searchParams.get("next") ?? "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) next = "/"; // jamais de redirection vers un autre site

  if (errorCode) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorCode)}`, req.url));
  }

  const supabase = await supabaseServer();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, req.url));
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL(next, req.url));
  }

  return NextResponse.redirect(new URL("/login?error=otp_expired", req.url));
}
