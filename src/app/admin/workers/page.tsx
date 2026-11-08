import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/admin/data-table";
import { ReviewVerificationButtons, VerifyWorkerButton } from "@/components/admin/admin-actions";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatRelative } from "@/lib/utils/format";
import type { Profile, VerificationRequest, WorkerProfile } from "@/types/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Travailleurs" };
const DOC: Record<string, string> = { cni: "CNI", cip: "CIP", passport: "Passeport", driver_license: "Permis", other: "Autre" };

export default async function AdminWorkersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireRole("admin");
  const tab = (await searchParams).tab === "verifications" ? "verifications" : "all";
  const supabase = await getSupabaseServerClient();

  if (tab === "verifications") {
    const { data } = await supabase.from("verification_requests").select("*").eq("status", "pending").order("created_at").limit(100);
    const reqs = (data ?? []) as VerificationRequest[];
    const { data: profiles } = reqs.length ? await supabase.from("profiles").select("id, first_name, last_name, email, city").in("id", reqs.map((r) => r.user_id)) : { data: [] };
    const signed = reqs.length ? (await supabase.storage.from("verifications").createSignedUrls(reqs.map((r) => r.document_path), 900)).data ?? [] : [];
    return (
      <>
        <Header tab={tab} />
        <DataTable head={["Travailleur", "Document", "Envoyé", "Décision"]}>
          {reqs.length === 0 && <tr><td colSpan={4} className="text-center text-muted-foreground">Aucune demande en attente.</td></tr>}
          {reqs.map((r) => {
            const p = (profiles ?? []).find((x) => x.id === r.user_id);
            const url = signed.find((s) => s.path === r.document_path)?.signedUrl;
            return (
              <tr key={r.id}>
                <td><p className="font-medium">{p ? `${p.first_name} ${p.last_name}` : r.user_id}</p><p className="text-xs text-muted-foreground">{p?.email as string}</p></td>
                <td>{DOC[r.document_type]} {url && <a href={url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"><FileText className="size-3.5" /> Consulter (15 min)</a>}</td>
                <td className="text-muted-foreground">{formatRelative(r.created_at)}</td>
                <td><ReviewVerificationButtons requestId={r.id} /></td>
              </tr>
            );
          })}
        </DataTable>
      </>
    );
  }

  const { data: wps } = await supabase.from("worker_profiles").select("*").order("created_at", { ascending: false }).limit(200);
  const workers = (wps ?? []) as (WorkerProfile & { created_at: string })[];
  const { data: profiles } = workers.length ? await supabase.from("profiles").select("*").in("id", workers.map((w) => w.user_id)) : { data: [] };
  const pmap = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));
  return (
    <>
      <Header tab={tab} />
      <DataTable head={["Travailleur", "Titre", "Note", "Missions", "Visible", "Inscrit", "Vérification"]}>
        {workers.map((w) => {
          const p = pmap.get(w.user_id);
          return (
            <tr key={w.user_id}>
              <td><p className="font-medium">{p ? `${p.first_name} ${p.last_name}` : "—"}</p><p className="text-xs text-muted-foreground">{p?.city}</p></td>
              <td className="max-w-56 truncate">{w.headline ?? "—"}</td>
              <td>{w.rating_count ? `${Number(w.rating_avg).toFixed(1)} (${w.rating_count})` : "—"}</td>
              <td>{w.completed_jobs_count}</td>
              <td>{w.show_on_map ? <Badge>Oui</Badge> : <Badge variant="secondary">Non</Badge>}</td>
              <td className="text-muted-foreground">{formatDate(w.created_at)}</td>
              <td className="flex items-center gap-2">{w.is_verified && <Badge>Vérifié</Badge>}<VerifyWorkerButton userId={w.user_id} verified={w.is_verified} /></td>
            </tr>
          );
        })}
      </DataTable>
    </>
  );
}

function Header({ tab }: { tab: string }) {
  return (
    <>
      <PageHeader title="Travailleurs" />
      <nav className="mb-4 flex gap-1" aria-label="Onglets">
        {[["all", "Tous les travailleurs"], ["verifications", "Vérifications en attente"]].map(([k, l]) => (
          <Link key={k} href={`/admin/workers${k === "all" ? "" : "?tab=verifications"}`} className={cn("rounded-full border px-3 py-1.5 text-sm", tab === k ? "border-primary bg-accent font-medium" : "text-muted-foreground hover:bg-muted")}>{l}</Link>
        ))}
      </nav>
    </>
  );
}
