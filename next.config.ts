import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();

const isDev = process.env.NODE_ENV !== "production";

/** Content Security Policy : sources limitées à Supabase, OpenStreetMap, aux vidéos Pexels du hero et au prestataire de paiement. */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.tile.openstreetmap.org ${supabaseHost ? `https://${supabaseHost}` : ""}`,
  "media-src 'self' https://videos.pexels.com",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseHost ? `https://${supabaseHost} wss://${supabaseHost}` : ""} https://nominatim.openstreetmap.org${isDev ? " ws: http://127.0.0.1:54321" : ""}`,
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "form-action 'self' https://*.fedapay.com",
  "base-uri 'self'",
  "object-src 'none'",
  isDev ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-**" },
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  /**
   * Ancienne adresse → nouvelle (redirection permanente 308, chemin et paramètres conservés).
   * Le fichier de validation Google reste servi sur l'ancienne adresse pour que sa propriété
   * Search Console reste vérifiée pendant le transfert.
   */
  async redirects() {
    return [
      {
        source: "/:path((?!googlec9d33df673924e64\\.html$).*)",
        has: [{ type: "host", value: "joblink-one.vercel.app" }],
        destination: "https://joblink-benin.vercel.app/:path",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Origin-Agent-Cluster", value: "?1" },
        ],
      },
      { source: "/(client|worker|admin|messages|notifications)/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
