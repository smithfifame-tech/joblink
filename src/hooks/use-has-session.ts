"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Indique si une session existe (lecture locale du cookie, sans appel réseau).
 * Sert uniquement à l'affichage de l'en-tête public : l'autorisation reste vérifiée côté serveur.
 */
export function useHasSession(): boolean {
  const [has, setHas] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => setHas(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setHas(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, []);
  return has;
}
