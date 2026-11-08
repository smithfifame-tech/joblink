import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { DataTable } from "@/components/admin/data-table";
import { ApplicationStatusBadge } from "@/components/jobs/status-badge";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelative, formatXOF, truncate } from "@/lib/utils/format";
import type { Application } from "@/types/db";

export const metadata = { title: "Candidatures" };
const PAGE = 30;

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireRole("admin");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await getSupabaseServerClient();
  const { data, count } = await supabase.from("applications").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const apps = (data ?? []) as Application[];
  const [{ data: jobs }, { data: people }] = await Promise.all([
    apps.length ? supabase.from("jobs").select("id, title").in("id", apps.map((a) => a.job_id)) : Promise.resolve({ data: [] }),
    apps.length ? supabase.from("profiles").select("id, first_name, last_name").in("id", apps.map((a) => a.worker_id)) : Promise.resolve({ data: [] }),
  ]);
  return (
    <>
      <PageHeader title="Candidatures" description={`${count ?? 0} candidature(s)`} />
      <DataTable head={["Mission", "Travailleur", "Message", "Prix", "Envoyée", "Statut"]}>
        {apps.map((a) => {
          const j = (jobs ?? []).find((x) => x.id === a.job_id);
          const p = (people ?? []).find((x) => x.id === a.worker_id);
          return (
            <tr key={a.id}>
              <td><Link href={`/jobs/${a.job_id}`} className="font-medium hover:text-primary">{(j?.title as string) ?? "—"}</Link></td>
              <td>{p ? `${p.first_name} ${p.last_name}` : "—"}</td>
              <td className="max-w-72 text-muted-foreground">{truncate(a.cover_letter, 120)}</td>
              <td className="tabular-nums">{a.proposed_amount ? formatXOF(a.proposed_amount) : "Budget"}</td>
              <td className="text-muted-foreground">{formatRelative(a.created_at)}</td>
              <td><ApplicationStatusBadge status={a.status} /></td>
            </tr>
          );
        })}
      </DataTable>
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} basePath="/admin/applications" />
    </>
  );
}
