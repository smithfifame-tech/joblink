import type { Metadata } from "next";

// Toujours rendu à la requête : jamais mis en cache ni pré-rendu.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Centre de contrôle",
  robots: { index: false, follow: false, nocache: true },
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <main id="contenu">{children}</main>;
}
