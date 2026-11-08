"use client";

import { useEffect } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Erreur inattendue ou réseau : message clair, sans détail technique exposé. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff className="size-10 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Un problème est survenu</h1>
      <p className="text-sm text-muted-foreground">Vérifiez votre connexion internet puis réessayez. Si le problème persiste, contactez le support{error.digest ? ` (réf. ${error.digest})` : ""}.</p>
      <Button onClick={reset}><RefreshCw /> Réessayer</Button>
    </main>
  );
}
