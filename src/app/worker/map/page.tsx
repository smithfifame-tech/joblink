import { PageHeader } from "@/components/dashboard/page-header";
import { JobsMapExplorer } from "@/components/maps/jobs-map-explorer";
import { requireRole } from "@/lib/auth/session";
import { getCategories } from "@/services/catalog";

export const metadata = { title: "Carte des missions" };

export default async function WorkerMapPage() {
  await requireRole("worker");
  const categories = await getCategories();
  return (
    <>
      <PageHeader title="Carte des missions" description="Distances approximatives depuis votre position ou la ville choisie." />
      <JobsMapExplorer categories={categories} />
    </>
  );
}
