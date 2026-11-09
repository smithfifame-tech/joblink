import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { reportIncident } from "@/lib/monitoring/incidents";

export const dynamic = "force-dynamic";

/**
 * Contrôle de santé (utilisé par l'agent de maintenance et par tout service de surveillance).
 * 200 si le site et la base répondent, 503 sinon. Aucune donnée sensible renvoyée.
 */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "erreur" | "non configurée" = "non configurée";
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { error } = await supabase.from("categories").select("id").limit(1).abortSignal(AbortSignal.timeout(4000));
      database = error ? "erreur" : "ok";
    } catch {
      database = "erreur";
    }
  }
  const ok = database === "ok";
  if (!ok && database === "erreur") {
    await reportIncident({ source: "monitor", severity: "critical", title: "Base de données injoignable depuis le site", path: "/api/health" });
  }
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", checks: { site: "ok", database }, latency_ms: Date.now() - started, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
