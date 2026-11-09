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
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "JOBLINK — Le travail près de vous, les opportunités à portée de main",
    template: "%s · JOBLINK",
  },
  description:
    "JOBLINK connecte les personnes qui ont besoin d'un service aux travailleurs disponibles autour d'elles au Bénin : plombiers, électriciens, développeurs, aides ménagères, livreurs et plus.",
  applicationName: "JOBLINK",
  keywords: ["petits travaux", "Bénin", "Cotonou", "prestataires", "missions", "freelance", "plombier", "électricien"],
  openGraph: {
    type: "website",
    locale: "fr_BJ",
    siteName: "JOBLINK",
    title: "JOBLINK — Trouvez du travail. Trouvez les bonnes personnes. Près de chez vous.",
    description: "La marketplace de missions et de services géolocalisés au Bénin.",
    
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
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
