import "server-only";
import { cookies, headers } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Tableau de bord du propriétaire (/admin/joblink).
 * - Le mot de passe est vérifié en base (hash bcrypt), jamais comparé ni stocké côté application.
 * - Chaque appel transmet la clé serveur (variable d'environnement, jamais envoyée au navigateur).
 * - La session est un jeton aléatoire dans un cookie httpOnly / Secure / SameSite=Strict,
 *   limité au chemin du tableau de bord ; seul son hash est conservé en base.
 */
export const OWNER_COOKIE = "jl_owner";
export const OWNER_PATH = "/admin/joblink";
const SESSION_SECONDS = 8 * 3600;

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

export function ownerPanelConfigured(): boolean {
  return isSupabaseConfigured() && serverEnv.ownerPanelServerKey.length >= 32;
}

async function clientInfo() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
  return { ip: ip.slice(0, 64), ua: (h.get("user-agent") ?? "").slice(0, 300) };
}

async function token(): Promise<string | null> {
  const v = (await cookies()).get(OWNER_COOKIE)?.value;
  return v && /^[a-f0-9]{64}$/.test(v) ? v : null;
}

export type LoginResult = { ok: true } | { ok: false; error: "INVALID_PASSWORD" | "LOCKED" | "UNAVAILABLE"; remaining?: number };

export async function ownerLogin(password: string): Promise<LoginResult> {
  if (!ownerPanelConfigured()) return { ok: false, error: "UNAVAILABLE" };
  const { ip, ua } = await clientInfo();
  const { data, error } = await db().rpc("owner_panel_login", {
    p_server_key: serverEnv.ownerPanelServerKey,
    p_password: password,
    p_ip: ip,
    p_user_agent: ua,
  });
  if (error || !data) return { ok: false, error: "UNAVAILABLE" };
  const res = data as { ok: boolean; token?: string; error?: string; remaining?: number };
  if (!res.ok || !res.token) {
    return { ok: false, error: res.error === "LOCKED" ? "LOCKED" : "INVALID_PASSWORD", remaining: res.remaining };
  }
  (await cookies()).set(OWNER_COOKIE, res.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: OWNER_PATH,
    maxAge: SESSION_SECONDS,
  });
  return { ok: true };
}

export async function ownerLogout(): Promise<void> {
  const t = await token();
  if (t && ownerPanelConfigured()) {
    await db().rpc("owner_panel_logout", { p_server_key: serverEnv.ownerPanelServerKey, p_token: t });
  }
  (await cookies()).set(OWNER_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: OWNER_PATH, maxAge: 0 });
}

/** Vérifie la session (en base). Renvoie le jeton si valide. */
export async function ownerSession(): Promise<string | null> {
  const t = await token();
  if (!t || !ownerPanelConfigured()) return null;
  const { data, error } = await db().rpc("owner_panel_session_valid", { p_server_key: serverEnv.ownerPanelServerKey, p_token: t });
  return !error && data === true ? t : null;
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const t = await token();
  if (!t) throw new Error("SESSION_EXPIRED");
  const { data, error } = await db().rpc(fn, { p_server_key: serverEnv.ownerPanelServerKey, p_token: t, ...args });
  if (error) throw new Error(error.message.includes("SESSION_EXPIRED") ? "SESSION_EXPIRED" : "ACTION_FAILED");
  return data as T;
}

export type OwnerOverview = {
  generated_at: string;
  kpis: Record<
    | "users" | "users_7d" | "clients" | "workers" | "admins" | "suspended" | "jobs_total" | "jobs_open" | "jobs_active"
    | "jobs_completed" | "jobs_7d" | "applications" | "volume" | "commissions" | "commissions_30d" | "payments_pending"
    | "payouts_pending" | "reports_open" | "disputes_open" | "verifications_pending" | "contact_new",
    number
  >;
  series: { day: string; users: number; jobs: number }[];
  by_category: { name: string; count: number }[];
  by_city: { name: string; count: number }[];
  recent_users: { id: string; first_name: string; last_name: string; email: string; city: string | null; created_at: string; is_suspended: boolean; roles: string[] }[];
  recent_jobs: { id: string; title: string; city: string; neighborhood: string; budget_amount: number; status: string; is_hidden: boolean; created_at: string; applications_count: number; category: string }[];
  recent_payments: { id: string; amount: number; commission_amount: number; status: string; provider: string; receipt_number: string | null; created_at: string }[];
  open_reports: { id: string; target_type: string; target_id: string; reason: string; details: string | null; status: string; created_at: string }[];
  contact_messages: { id: string; name: string; email: string; subject: string; message: string; status: string; created_at: string }[];
  recent_logins: { created_at: string; ip: string | null; success: boolean }[];
};

export type OwnerUser = {
  id: string; first_name: string; last_name: string; email: string; phone: string | null; city: string | null; neighborhood: string | null;
  created_at: string; is_suspended: boolean; suspended_reason: string | null; roles: string[]; jobs_count: number; applications_count: number;
};

export type OwnerIncident = {
  id: string; source: "client" | "server" | "monitor" | "ai"; severity: "critical" | "high" | "normal"; title: string;
  details: string | null; path: string | null; occurrences: number; first_seen: string; last_seen: string;
  status: "open" | "approved" | "fixing" | "resolved" | "dismissed"; approved_at: string | null; resolved_at: string | null;
  auto_action: boolean; ai_notes: string | null;
};
export type OwnerIncidents = {
  counts: { open: number; approved: number; critical: number; resolved_7d: number; auto_7d: number };
  items: OwnerIncident[];
};

export type OwnerAnnouncement = {
  message: string; tone: "info" | "success" | "warning"; link_url: string | null; link_label: string | null;
  active: boolean; expires_at: string | null; updated_at: string; visible: boolean;
};

export const ownerApi = {
  announcement: () => call<OwnerAnnouncement>("owner_panel_get_announcement", {}),
  setAnnouncement: (a: { message: string; tone: string; linkUrl: string | null; linkLabel: string | null; active: boolean; hours: number | null }) =>
    call<null>("owner_panel_set_announcement", {
      p_message: a.message, p_tone: a.tone, p_link_url: a.linkUrl, p_link_label: a.linkLabel, p_active: a.active, p_hours: a.hours,
    }),
  incidents: () => call<OwnerIncidents>("owner_panel_incidents", {}),
  setIncident: (incident: string, action: "approve" | "dismiss" | "reopen" | "resolve") =>
    call<null>("owner_panel_set_incident", { p_incident: incident, p_action: action }),
  overview: () => call<OwnerOverview>("owner_panel_overview", {}),
  users: (q: string, limit = 50, offset = 0) =>
    call<{ total: number; items: OwnerUser[] }>("owner_panel_users", { p_search: q || null, p_limit: limit, p_offset: offset }),
  setSuspension: (user: string, suspended: boolean, reason?: string) =>
    call<null>("owner_panel_set_suspension", { p_user: user, p_suspended: suspended, p_reason: reason ?? null }),
  moderateJob: (job: string, hide: boolean, note?: string) =>
    call<null>("owner_panel_moderate_job", { p_job: job, p_hide: hide, p_note: note ?? null }),
  updateReport: (report: string, status: "reviewing" | "resolved" | "dismissed", note?: string) =>
    call<null>("owner_panel_update_report", { p_report: report, p_status: status, p_note: note ?? null }),
  markContact: (id: string) => call<null>("owner_panel_mark_contact", { p_message: id }),
};
