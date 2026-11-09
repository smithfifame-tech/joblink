"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/**
 * Connexion / inscription avec Google (OAuth via Supabase, flux PKCE).
 * Le compte créé reste « incomplet » tant que l'utilisateur n'a pas choisi son rôle,
 * renseigné téléphone et ville et accepté les CGU (page /onboarding).
 */
export function GoogleButton({ enabled, label = "Continuer avec Google", className }: { enabled: boolean; label?: string; className?: string }) {
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function go() {
    if (!enabled || loading) return;
    setLoading(true);
    const next = sp.get("next");
    const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next && next.startsWith("/") && !next.startsWith("//") ? next : "/account")}`;
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setLoading(false);
      toast.error("Connexion Google indisponible pour le moment. Utilisez votre e-mail.");
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={go}
        disabled={!enabled || loading}
        aria-describedby={!enabled ? "google-soon" : undefined}
        className={cn(
          "group relative flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-white text-[15px] font-semibold text-foreground shadow-[var(--shadow-soft)] transition-all duration-300",
          enabled ? "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-lift)] active:translate-y-0" : "cursor-not-allowed opacity-60",
        )}
      >
        {loading ? <Loader2 className="size-5 animate-spin text-primary" /> : <GoogleG className="size-5 transition-transform duration-300 group-hover:scale-110" />}
        {loading ? "Redirection vers Google…" : label}
      </button>
      {!enabled && (
        <p id="google-soon" className="mt-1.5 text-center text-xs text-muted-foreground">
          Connexion Google bientôt disponible.
        </p>
      )}
    </div>
  );
}

export function AuthDivider({ children = "ou avec votre e-mail" }: { children?: React.ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
