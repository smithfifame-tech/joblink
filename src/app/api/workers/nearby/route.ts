import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(50).default(10),
  category: z.string().regex(/^[a-z0-9-]{2,60}$/).optional(),
});

export async function GET(req: NextRequest) {
  const ip = await getClientIp();
  if (!(await rateLimit("nearby", ip, 60, 60))) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ workers: [] });
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("nearby_workers", {
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
    p_radius_km: parsed.data.radius,
    p_category_slug: parsed.data.category ?? null,
    p_limit: 12,
  });
  if (error) return NextResponse.json({ error: "Indisponible" }, { status: 503 });
  // Les coordonnées approximatives ne sont pas renvoyées ici : seule la distance est utile
  const workers = (data ?? []).map(({ approx_lat: _a, approx_lng: _b, ...w }: Record<string, unknown>) => w);
  return NextResponse.json({ workers }, { headers: { "Cache-Control": "public, s-maxage=60" } });
}
