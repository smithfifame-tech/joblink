import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverRpc } from "@/lib/supabase/server-rpc";
import { serverEnv } from "@/lib/env.server";

export const dynamic = "force-dynamic";

/** Tâche planifiée (Vercel Cron) : application des règles de conservation des données. */
export async function GET(req: NextRequest) {
  const expected = `Bearer ${serverEnv.cronSecret}`;
  const got = req.headers.get("authorization") ?? "";
  if (!serverEnv.cronSecret || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await serverRpc("srv_purge");
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json({ ok: true, purged: data });
}
