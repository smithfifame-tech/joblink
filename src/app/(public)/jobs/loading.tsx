import { JobCardSkeleton } from "@/components/jobs/job-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-40" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Skeleton className="h-[480px] rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
