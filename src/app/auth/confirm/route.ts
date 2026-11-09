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

  // Erreur renvoyée par Supabase (lien expiré, refus de Google…)
  if (searchParams.get("error") || searchParams.get("error_description")) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (!ok) {
      // Lien de confirmation ouvert dans un autre navigateur que celui de l'inscription :
      // l'adresse est bien confirmée par Supabase, il suffit de se connecter.
      return NextResponse.redirect(`${origin}/login?confirmed=1&next=${encodeURIComponent(next)}`);
    }
  }
  if (!ok) return NextResponse.redirect(`${origin}/login?error=link`);
  const dest = type === "recovery" ? "/reset-password" : next;
  // Petit signal de bienvenue affiché par le site après la confirmation
  const url = new URL(`${origin}${dest}`);
  if (type !== "recovery") url.searchParams.set("welcome", "1");
  return NextResponse.redirect(url);
}
