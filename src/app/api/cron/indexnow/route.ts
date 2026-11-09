import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";
import { getCategories } from "@/services/catalog";
import { publicSeoUrls, submitIndexNow } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

/** Tâche planifiée (Vercel Cron, quotidienne) : signale les pages publiques aux moteurs IndexNow. */
export async function GET(req: NextRequest) {
  const expected = `Bearer ${serverEnv.cronSecret}`;
  const got = req.headers.get("authorization") ?? "";
  if (!serverEnv.cronSecret || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const categories = await getCategories().catch(() => []);
  try {
    const r = await submitIndexNow(publicSeoUrls(categories.map((c) => c.slug)));
    return NextResponse.json({ ok: r.ok, status: r.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
