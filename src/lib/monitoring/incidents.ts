import "server-only";
import { serverRpc } from "@/lib/supabase/server-rpc";

export type IncidentSource = "client" | "server" | "monitor";
export type IncidentSeverity = "critical" | "high" | "normal";

/** Retire ce qui varie d'une occurrence à l'autre (identifiants, nombres) pour regrouper un même bug. */
export function normalizeForFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, ":id")
    .replace(/\b[0-9a-f]{16,}\b/g, ":hex")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/** Chemin sans paramètres ni identifiants (aucune donnée personnelle dans les incidents). */
export function cleanPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const p = path.split(/[?#]/)[0] ?? "";
  return p.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id").slice(0, 300) || "/";
}

export async function incidentFingerprint(source: IncidentSource, title: string, path: string | null): Promise<string> {
  const data = new TextEncoder().encode(`${source}|${normalizeForFingerprint(title)}|${cleanPath(path) ?? ""}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

/**
 * Enregistre un incident (dédoublonné en base). Ne lève jamais d'erreur : la surveillance
 * ne doit pas pouvoir casser le site.
 */
export async function reportIncident(input: {
  source: IncidentSource;
  severity: IncidentSeverity;
  title: string;
  details?: string | null;
  path?: string | null;
}): Promise<void> {
  try {
    const path = cleanPath(input.path);
    const title = input.title.replace(/\s+/g, " ").trim().slice(0, 200) || "Erreur inconnue";
    await serverRpc("srv_report_incident", {
      p_fingerprint: await incidentFingerprint(input.source, title, path),
      p_source: input.source,
      p_severity: input.severity,
      p_title: title,
      p_details: input.details ? input.details.slice(0, 4000) : null,
      p_path: path,
    });
  } catch {
    /* surveillance best-effort */
  }
}
