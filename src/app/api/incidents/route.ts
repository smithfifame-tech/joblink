import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { reportIncident } from "@/lib/monitoring/incidents";

const schema = z.object({
  kind: z.enum(["page", "global"]),
  message: z.string().trim().min(1).max(500),
  digest: z.string().trim().max(100).optional(),
  path: z.string().trim().max(300).optional(),
});

/**
 * Signalement automatique des erreurs survenues dans le navigateur (pages d'erreur du site).
 * Même origine uniquement, limité par IP, contenu borné : aucune donnée personnelle n'est demandée.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const site = new URL(publicEnv.siteUrl).origin;
  if (origin && origin !== site && origin !== req.nextUrl.origin) return new NextResponse(null, { status: 403 });

  const ip = await getClientIp();
  if (!(await rateLimit("incident", ip, 10, 600))) return new NextResponse(null, { status: 429 });

  const raw = await req.text();
  if (raw.length > 4000) return new NextResponse(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const v = parsed.data;
  await reportIncident({
    source: "client",
    severity: v.kind === "global" ? "high" : "normal",
    title: `Erreur dans le navigateur : ${v.message}`,
    details: [v.digest ? `Référence : ${v.digest}` : null, `Agent : ${(req.headers.get("user-agent") ?? "").slice(0, 160)}`].filter(Boolean).join("\n"),
    path: v.path,
  });
  return new NextResponse(null, { status: 204 });
}
