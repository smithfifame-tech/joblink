import { PageHeader } from "@/components/dashboard/page-header";
import { ReviewsPanel } from "@/components/dashboard/reviews-panel";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Évaluations" };

export default async function WorkerReviewsPage() {
  const user = await requireRole("worker");
  return (
    <>
      <PageHeader title="Évaluations" description="Vos avis sont publics et proviennent uniquement de missions terminées." />
      <ReviewsPanel userId={user.id} role="worker" />
    </>
  );
}
