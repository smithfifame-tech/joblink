import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { reportIncident } from "@/lib/monitoring/incidents";
import { serverEnv } from "@/lib/env.server";
import { isPaymentConfigured } from "@/lib/payments/registry";
import { saspayPing } from "@/lib/payments/adapters/saspay";

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
  // Paiements : configuration + connexion réelle au prestataire (lecture seule). N'affecte pas le statut global.
  let payments = "non configurés";
  if (isPaymentConfigured()) {
    payments = `${serverEnv.paymentProvider} configuré`;
    if (serverEnv.paymentProvider === "saspay") {
      const ping = await saspayPing();
      payments = ping === "ok" ? `saspay ${serverEnv.saspayEnvironment} : connecté` : `saspay ${serverEnv.saspayEnvironment} : ${ping === "cle_refusee" ? "clé refusée" : "injoignable"}`;
    }
  }
  const ok = database === "ok";
  if (!ok && database === "erreur") {
    await reportIncident({ source: "monitor", severity: "critical", title: "Base de données injoignable depuis le site", path: "/api/health" });
  }
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", checks: { site: "ok", database, payments }, latency_ms: Date.now() - started, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
