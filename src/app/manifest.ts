import type { MetadataRoute } from "next";

/** Manifeste web : nom, couleurs et icônes (installation sur l'écran d'accueil, aperçus). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JOBLINK — Missions et services près de chez vous",
    short_name: "JOBLINK",
    description: "Petits travaux, services et missions géolocalisés au Bénin.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16A34A",
    lang: "fr-BJ",
    categories: ["business", "productivity", "lifestyle"],
    icons: [
      { src: "/logos/joblink-192.png", sizes: "192x192", type: "image/png" },
      { src: "/logos/joblink-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
