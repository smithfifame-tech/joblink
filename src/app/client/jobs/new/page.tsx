import { PageHeader } from "@/components/dashboard/page-header";
import { JobForm } from "@/components/jobs/job-form";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/session";
import { getCategories } from "@/services/catalog";

export const metadata = { title: "Publier une mission" };

export default async function NewJobPage() {
  const user = await requireRole("client", "/client/jobs/new");
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Publier une mission" description="Une annonce précise attire de meilleures candidatures." />
      {!user.emailConfirmed ? (
        <Alert variant="warning">Confirmez votre adresse e-mail pour publier une mission.</Alert>
      ) : (
        <JobForm categories={categories} userId={user.id} initial={{ city: user.profile?.city ?? "", neighborhood: user.profile?.neighborhood ?? "" }} />
      )}
    </div>
  );
}
