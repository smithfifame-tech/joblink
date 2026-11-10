import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

export const revalidate = 60;

/**
 * Annonce publique du site (rédigée par le propriétaire). Lecture anonyme, sans cookie,
 * mise en cache une minute. Ne renvoie que l'annonce active et non expirée.
 */
export async function GET() {
  let announcement: unknown = null;
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await supabase.rpc("public_announcement").abortSignal(AbortSignal.timeout(4000));
      if (!error) announcement = data ?? null;
    } catch {
      announcement = null;
    }
  }
  return NextResponse.json({ announcement }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300", "X-Robots-Tag": "noindex" } });
}
