import type { Metadata } from "next";
import { JobsMapExplorer } from "@/components/maps/jobs-map-explorer";
import { getCategories } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Carte des missions",
  description: "Explorez les missions ouvertes autour de vous sur une carte interactive, avec un rayon de 1 à 50 km.",
  alternates: { canonical: "/map" },
};

export default async function MapPage() {
  const categories = await getCategories().catch(() => []);
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold">Carte des missions</h1>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">Déplacez la carte puis « Rechercher dans cette zone ». Liste et carte sont synchronisées.</p>
      <JobsMapExplorer categories={categories} />
    </div>
  );
}
