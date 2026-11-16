import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intl = createIntlMiddleware(routing);
const PUBLIC = ["/login", "/register", "/forgot-password", "/reset-password", "/p/"];

export default async function middleware(req: NextRequest) {
  const res = intl(req);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables.");
    return res;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options?: any }[]) =>
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    });
    const { data } = await supabase.auth.getUser();

    const locale = routing.locales.find((l) => req.nextUrl.pathname.startsWith(`/${l}`)) ?? routing.defaultLocale;
    const path = req.nextUrl.pathname.replace(new RegExp(`^/${locale}`), "") || "/";
    if (!data?.user && !PUBLIC.some((p) => path.startsWith(p))) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }
  } catch (e) {
    console.error("[Middleware] Auth check error:", e);
  }

  return res;
}
export const config = { matcher: ["/((?!api|auth|_next|.*\\..*).*)"] };
