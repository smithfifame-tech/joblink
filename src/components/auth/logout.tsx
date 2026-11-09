"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const LogoutContext = createContext<{ logout: () => void; leaving: boolean } | null>(null);

/**
 * Déconnexion fiable depuis n'importe quel endroit (menus, tiroirs mobiles, en-têtes) :
 * appel POST au serveur, nettoyage côté navigateur, puis rechargement complet vers /login.
 * Un écran de transition animé s'affiche pendant l'opération.
 */
export function LogoutProvider({ children }: { children: React.ReactNode }) {
  const [leaving, setLeaving] = useState(false);

  const logout = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    void (async () => {
      try {
        await fetch("/auth/logout", { method: "POST", headers: { Accept: "application/json" }, credentials: "same-origin" });
      } catch {
        /* le nettoyage local ci-dessous suffit à couper l'accès côté navigateur */
      }
      if (isSupabaseConfigured()) {
        await getSupabaseBrowserClient().auth.signOut({ scope: "local" }).catch(() => undefined);
      }
      window.setTimeout(() => window.location.assign("/login?logged_out=1"), 350);
    })();
  }, [leaving]);

  return (
    <LogoutContext.Provider value={{ logout, leaving }}>
      {children}
      {leaving && typeof document !== "undefined" &&
        createPortal(
          <div role="status" aria-live="polite" className="fixed inset-0 z-[100] grid place-items-center bg-white/80 backdrop-blur-md animate-[fade-in_.3s_ease-out_both]">
            <div className="flex flex-col items-center gap-4 animate-[pop-in_.45s_cubic-bezier(.2,.8,.2,1)_both]">
              <LogoMark className="size-16 animate-[bob_1.2s_ease-in-out_infinite]" />
              <p className="text-sm font-semibold text-primary-strong">Déconnexion en cours…</p>
            </div>
          </div>,
          document.body,
        )}
    </LogoutContext.Provider>
  );
}

export function useLogout() {
  const ctx = useContext(LogoutContext);
  // Sans fournisseur (cas improbable) : repli sur un formulaire classique.
  return ctx ?? {
    leaving: false,
    logout: () => {
      const f = document.createElement("form");
      f.method = "POST";
      f.action = "/auth/logout";
      document.body.appendChild(f);
      f.submit();
    },
  };
}

export function LogoutButton({ className, children, onDone }: { className?: string; children?: React.ReactNode; onDone?: () => void }) {
  const { logout, leaving } = useLogout();
  return (
    <button
      type="button"
      onClick={() => {
        onDone?.();
        logout();
      }}
      disabled={leaving}
      className={cn("inline-flex items-center gap-2", className)}
    >
      {children ?? (
        <>
          <LogOut className="size-4" /> Déconnexion
        </>
      )}
    </button>
  );
}
