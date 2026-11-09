import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/montserrat/latin-800.css";
import "@fontsource/montserrat/latin-900.css";
import { Toaster } from "sonner";
import { Suspense } from "react";
import { LogoutProvider } from "@/components/auth/logout";
import { WelcomeToast } from "@/components/auth/welcome-toast";
import { RevealObserver } from "@/components/motion/reveal-observer";
import { publicEnv } from "@/lib/env";
import { SEO_DESCRIPTION, SEO_KEYWORDS, SEO_TITLE } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: SEO_TITLE,
    template: "%s · JOBLINK",
  },
  description: SEO_DESCRIPTION,
  applicationName: "JOBLINK",
  keywords: SEO_KEYWORDS,
  authors: [{ name: "JOBLINK" }],
  creator: "JOBLINK",
  publisher: "JOBLINK",
  category: "business",
  openGraph: {
    type: "website",
    locale: "fr_BJ",
    siteName: "JOBLINK",
    title: "JOBLINK — Trouvez du travail. Trouvez les bonnes personnes. Près de chez vous.",
    description: "La plateforme de missions et de services géolocalisés au Bénin. Publiez gratuitement, payez par Mobile Money après validation.",
  },
  twitter: { card: "summary_large_image", title: "JOBLINK", description: "Missions et services près de chez vous au Bénin." },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/logos/joblink-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Codes de validation des outils pour webmasters (à renseigner dans Vercel, pas de secret)
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#16A34A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={GeistMono.variable}>
      <body className="min-h-dvh">
        <LogoutProvider>{children}</LogoutProvider>
        <RevealObserver />
        <Suspense>
          <WelcomeToast />
        </Suspense>
        <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 4500 }} />
      </body>
    </html>
  );
}
