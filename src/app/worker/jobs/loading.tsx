import { JobCardSkeleton } from "@/components/jobs/job-card";

export default function Loading() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}</div>;
}
