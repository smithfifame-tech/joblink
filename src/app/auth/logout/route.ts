import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SESSION_ONLY_COOKIE } from "@/lib/supabase/cookies";

/**
 * Déconnexion (POST uniquement, jamais en GET pour éviter les déconnexions forcées par lien).
 * Vérifie l'origine de la requête, révoque la session locale et supprime les cookies.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "Origine refusée." }, { status: 403 });
  }
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  const store = await cookies();
  store.delete(SESSION_ONLY_COOKIE);

  // Formulaire HTML classique (sans JavaScript) : redirection ; appel fetch : réponse JSON.
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.redirect(new URL("/login?logged_out=1", request.url), { status: 303 });
}
