import { NextResponse, type NextRequest } from "next/server";
import { parseSearchParams } from "@/lib/validations/jobs";
import { searchJobs } from "@/services/catalog";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

/** Recherche publique (carte, filtres). Paramètres validés, résultats sans position exacte. */
export async function GET(req: NextRequest) {
  const ip = await getClientIp();
  if (!(await rateLimit("search", ip, 120, 60))) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }
  const params = parseSearchParams(Object.fromEntries(req.nextUrl.searchParams));
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 100);
  try {
    const { rows, total } = await searchJobs(params, limit);
    return NextResponse.json({ jobs: rows, total }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ error: "Recherche indisponible" }, { status: 503 });
  }
}
