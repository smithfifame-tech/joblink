import { JobForm } from "@/components/jobs/job-form";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/session";
import { getCategories, getCommissionRates } from "@/services/catalog";

export const metadata = { title: "Publier une mission" };

export default async function NewJobPage() {
  const user = await requireRole("client", "/client/jobs/new");
  const [categories, rates] = await Promise.all([getCategories(), getCommissionRates()]);
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="sr-only">Publier une mission</h1>
      {!user.emailConfirmed ? (
        <Alert variant="warning">Confirmez votre adresse e-mail pour publier une mission.</Alert>
      ) : (
        <JobForm categories={categories} userId={user.id} commissionRate={rates.commission} initial={{ city: user.profile?.city ?? "", neighborhood: user.profile?.neighborhood ?? "" }} />
      )}
    </div>
  );
}
