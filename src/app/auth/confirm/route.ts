import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validations/auth";

/**
 * Point d'arrivée des liens e-mail Supabase (confirmation d'inscription, réinitialisation).
 * Gère le format token_hash (recommandé pour le SSR) et le format PKCE (?code=).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next")) ?? "/account";
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await getSupabaseServerClient();

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  if (!ok) return NextResponse.redirect(`${origin}/login?error=link`);
  const dest = type === "recovery" ? "/reset-password" : next;
  return NextResponse.redirect(`${origin}${dest}`);
}
