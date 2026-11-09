import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Map, SearchX } from "lucide-react";
import { JobCard } from "@/components/jobs/job-card";
import { JobFilters } from "@/components/jobs/job-filters";
import { NearMeButton } from "@/components/jobs/near-me-button";
import { CityDatalist } from "@/components/layout/city-datalist";
import { ConfigNotice } from "@/components/layout/config-notice";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Pagination } from "@/components/dashboard/pagination";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { getCategories, PAGE_SIZE, searchJobs } from "@/services/catalog";
import { parseSearchParams } from "@/lib/validations/jobs";

export const metadata: Metadata = {
  title: "Découvrir les missions",
  description: "Parcourez les missions ouvertes au Bénin : filtrez par catégorie, budget, ville et distance.",
  alternates: { canonical: "/jobs" },
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function JobsPage({ searchParams }: { searchParams: SP }) {
  const params = parseSearchParams(await searchParams);
  const [categories, result] = await Promise.all([
    getCategories().catch(() => []),
    searchJobs(params).then(
      (r) => ({ ...r, error: false }),
      () => ({ rows: [], total: 0, error: true }),
    ),
  ]);
  const page = params.page ?? 1;
  const category = categories.find((c) => c.slug === params.category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <ConfigNotice />
      <CityDatalist />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{category ? category.name : "Découvrir les missions"}</h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {result.total} mission{result.total > 1 ? "s" : ""} ouverte{result.total > 1 ? "s" : ""}
            {params.city ? ` à ${params.city}` : ""}
            {params.radius && params.lat !== undefined ? ` dans un rayon de ${params.radius} km` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Suspense>
            <NearMeButton />
          </Suspense>
          <Button asChild variant="outline">
            <Link href="/map">
              <Map /> Voir la carte
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside>
          <JobFilters categories={categories} params={params} />
        </aside>
        <section aria-label="Résultats">
          {result.error && (
            <Alert variant="error" title="Recherche momentanément indisponible" className="mb-4">
              Vérifiez votre connexion puis réessayez.
            </Alert>
          )}
          {result.rows.length === 0 && !result.error ? (
            <EmptyState
              icon={SearchX}
              title="Aucune mission ne correspond"
              description="Élargissez le rayon, retirez un filtre ou essayez un autre mot-clé."
              action={
                <Button asChild variant="outline">
                  <Link href="/jobs">Effacer les filtres</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.rows.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} basePath="/jobs" params={params as Record<string, string | number | undefined>} />
        </section>
      </div>
    </div>
  );
}
