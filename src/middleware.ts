import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isProbePath } from "@/lib/security/probes";

export async function middleware(request: NextRequest) {
  // Robots qui sondent des failles connues (WordPress, fichiers .env, .git…) : réponse 404 immédiate.
  if (isProbePath(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/webhooks|images|logos|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
