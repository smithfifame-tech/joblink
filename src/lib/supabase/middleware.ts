import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";
import { SESSION_ONLY_COOKIE, applySessionPreference } from "./cookies";

const PROTECTED_PREFIXES = ["/client", "/worker", "/admin", "/notifications", "/messages", "/account"];
const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

/** Tableau de bord du propriétaire : protégé par son propre mot de passe (voir lib/owner-panel). */
export const OWNER_PANEL_PATH = "/admin/joblink";
export function isOwnerPanelPath(pathname: string): boolean {
  return pathname === OWNER_PANEL_PATH || pathname.startsWith(`${OWNER_PANEL_PATH}/`);
}

export function isProtectedPath(pathname: string): boolean {
  if (isOwnerPanelPath(pathname)) return false;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Rafraîchit la session Supabase et protège les routes privées. Le contrôle de rôle est fait côté serveur dans les layouts. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname, search } = request.nextUrl;

  if (!isSupabaseConfigured()) {
    if (isProtectedPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return response;
  }

  const sessionOnly = request.cookies.get(SESSION_ONLY_COOKIE)?.value === "1";
  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, applySessionPreference(options, sessionOnly));
        }
      },
    },
  });

  // getUser() valide le jeton auprès de Supabase Auth (ne pas se fier à getSession côté serveur)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Les pages privées ne doivent jamais être indexées
  if (isProtectedPath(pathname) || isOwnerPanelPath(pathname)) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
