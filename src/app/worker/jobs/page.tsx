import { Suspense } from "react";
import Link from "next/link";
import { Map, SearchX } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Pagination } from "@/components/dashboard/pagination";
import { JobCard } from "@/components/jobs/job-card";
import { JobFilters } from "@/components/jobs/job-filters";
import { NearMeButton } from "@/components/jobs/near-me-button";
import { CityDatalist } from "@/components/layout/city-datalist";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getCategories, PAGE_SIZE, searchJobs } from "@/services/catalog";
import { parseSearchParams } from "@/lib/validations/jobs";

export const metadata = { title: "Missions disponibles" };

export default async function WorkerJobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("worker");
  const params = parseSearchParams(await searchParams);
  const [categories, { rows, total }] = await Promise.all([getCategories(), searchJobs(params)]);
  return (
    <>
      <CityDatalist />
      <PageHeader
        title="Missions disponibles"
        description={`${total} mission${total > 1 ? "s" : ""} ouverte${total > 1 ? "s" : ""}`}
        actions={<><Suspense><NearMeButton /></Suspense><Button asChild variant="outline"><Link href="/worker/map"><Map /> Carte</Link></Button></>}
      />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <JobFilters categories={categories} params={params} action="/worker/jobs" />
        <div>
          {rows.length === 0 ? <EmptyState icon={SearchX} title="Aucune mission" description="Modifiez vos filtres ou élargissez le rayon." /> : (
            <div className="grid gap-5 sm:grid-cols-2">{rows.map((j) => <JobCard key={j.id} job={j} />)}</div>
          )}
          <Pagination page={params.page ?? 1} pageSize={PAGE_SIZE} total={total} basePath="/worker/jobs" params={params as Record<string, string | number | undefined>} />
        </div>
      </div>
    </>
  );
}
