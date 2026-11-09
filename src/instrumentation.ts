import type { Instrumentation } from "next";

export async function register() {
  /* rien à initialiser */
}

/**
 * Toute erreur non gérée côté serveur (page, action, route API) devient un incident
 * visible dans le tableau de bord propriétaire, sans bloquer la réponse.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // Seulement côté Node.js (le module de surveillance n'est pas embarqué dans le runtime « edge »).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { reportIncident } = await import("@/lib/monitoring/incidents");
    const err = error as Error & { digest?: string };
    await reportIncident({
      source: "server",
      severity: "high",
      title: `Erreur serveur : ${err?.message ?? "inconnue"}`,
      details: [
        err?.digest ? `Référence : ${err.digest}` : null,
        `Type : ${context.routeType} (${context.routerKind}) · route ${context.routePath}`,
        err?.stack ? err.stack.split("\n").slice(0, 8).join("\n") : null,
      ]
        .filter(Boolean)
        .join("\n"),
      path: request.path,
    });
  } catch {
    /* surveillance best-effort */
  }
};
