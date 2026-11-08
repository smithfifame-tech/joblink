/**
 * Variables d'environnement. Seules les variables préfixées NEXT_PUBLIC_ sont exposées au navigateur.
 * SUPABASE_SERVICE_ROLE_KEY et les secrets de paiement ne sont lus que côté serveur (voir lib/env.server.ts).
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
};

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

export function storagePublicUrl(bucket: "avatars" | "job-images", path: string | null | undefined): string | null {
  if (!path || !publicEnv.supabaseUrl) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
