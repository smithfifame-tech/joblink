import { PageHeader } from "@/components/dashboard/page-header";
import { ReviewsPanel } from "@/components/dashboard/reviews-panel";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Avis" };

export default async function ClientReviewsPage() {
  const user = await requireRole("client");
  return (
    <>
      <PageHeader title="Avis" description="Les avis que vous avez reçus et donnés, issus uniquement de missions terminées." />
      <ReviewsPanel userId={user.id} role="client" />
    </>
  );
}
