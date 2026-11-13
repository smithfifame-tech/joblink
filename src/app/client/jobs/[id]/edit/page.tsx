import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { JobForm } from "@/components/jobs/job-form";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCategories, getCommissionRates } from "@/services/catalog";
import type { Job } from "@/types/db";
import { parsePoint } from "@/lib/maps/parse-point";

export const metadata = { title: "Modifier la mission" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("client");
  const supabase = await getSupabaseServerClient();
  const [{ data: job }, { data: images }, categories, rates] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).eq("client_id", user.id).maybeSingle<Job>(),
    supabase.from("job_images").select("id, storage_path").eq("job_id", id).order("sort_order"),
    getCategories(),
    getCommissionRates(),
  ]);
  if (!job) notFound();
  if (!["draft", "published", "reviewing"].includes(job.status)) redirect(`/client/jobs/${id}?locked=1`);
  // Coordonnées exactes du point (lisibles par le propriétaire uniquement)
  const point = parsePoint(job.location);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Modifier la mission" description="Les modifications importantes sont historisées." />
      <JobForm
        categories={categories}
        userId={user.id}
        jobId={job.id}
        existingImages={(images ?? []) as { id: string; storage_path: string }[]}
        canPublishDraft={job.status === "draft"}
        commissionRate={rates.commission}
        initial={{
          title: job.title,
          categoryId: job.category_id,
          description: job.description,
          skills: job.skills_required,
          budget: job.budget_amount,
          payType: job.pay_type,
          allowPriceProposal: job.allow_price_proposal,
          startDate: job.start_date,
          deadline: job.deadline,
          country: job.country_code,
          city: job.city,
          neighborhood: job.neighborhood,
          address: job.address ?? "",
          workMode: job.work_mode,
          lat: point?.lat ?? null,
          lng: point?.lng ?? null,
          workersNeeded: job.workers_needed,
        }}
      />
    </div>
  );
}
