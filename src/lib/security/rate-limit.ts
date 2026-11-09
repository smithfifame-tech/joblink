import "server-only";
import { headers } from "next/headers";
import { serverRpc, serverRpcConfigured } from "@/lib/supabase/server-rpc";

const memory = new Map<string, { start: number; count: number }>();

/** Limiteur en mémoire (développement / repli si la base est indisponible). */
export function memoryRateLimit(key: string, max: number, windowSeconds: number, now = Date.now()): boolean {
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSeconds * 1000) {
    memory.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h.get("x-real-ip") || "unknown";
}

/**
 * Limitation de débit partagée entre instances serverless (table rate_limits via srv_check_rate_limit).
 * Retourne true si la requête est autorisée.
 */
export async function rateLimit(scope: string, identifier: string, max: number, windowSeconds: number): Promise<boolean> {
  const key = `${scope}:${identifier}`.slice(0, 200);
  if (!serverRpcConfigured()) return memoryRateLimit(key, max, windowSeconds);
  try {
    const { data, error } = await serverRpc<boolean>("srv_check_rate_limit", {
      p_bucket: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return data === true;
  } catch {
    return memoryRateLimit(key, max, windowSeconds);
  }
}
