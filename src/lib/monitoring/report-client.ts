/** Envoie (sans bloquer) une erreur survenue dans le navigateur au tableau de bord propriétaire. */
export function reportClientError(kind: "page" | "global", error: Error & { digest?: string }) {
  try {
    const body = JSON.stringify({
      kind,
      message: String(error?.message || "Erreur inconnue").slice(0, 500),
      digest: error?.digest?.slice(0, 100),
      path: window.location.pathname.slice(0, 300),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/incidents", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/incidents", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    /* jamais bloquant */
  }
}
