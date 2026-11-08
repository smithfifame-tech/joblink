import Link from "next/link";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "./empty-state";
import { ReviewForm } from "@/components/jobs/review-form";
import { ReportButton } from "@/components/jobs/report-button";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";
import type { Contract, PublicProfile, Review } from "@/types/db";

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${n} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`size-4 ${i <= n ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} aria-hidden />)}
    </span>
  );
}

export async function ReviewsPanel({ userId, role }: { userId: string; role: "client" | "worker" }) {
  const supabase = await getSupabaseServerClient();
  const col = role === "client" ? "client_id" : "worker_id";
  const [{ data: received }, { data: given }, { data: completed }] = await Promise.all([
    supabase.from("reviews").select("*").eq("reviewee_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("reviews").select("*").eq("reviewer_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("contracts").select("*").eq(col, userId).eq("status", "completed").limit(100),
  ]);
  const r = (received ?? []) as Review[];
  const g = (given ?? []) as Review[];
  const done = new Set(g.map((x) => x.contract_id));
  const toReview = ((completed ?? []) as Contract[]).filter((c) => !done.has(c.id));
  const ids = [...new Set([...r.map((x) => x.reviewer_id), ...g.map((x) => x.reviewee_id), ...toReview.map((c) => (role === "client" ? c.worker_id : c.client_id))])];
  const { data: profiles } = ids.length ? await supabase.from("public_profiles").select("id, first_name, last_initial").in("id", ids) : { data: [] };
  const name = (id: string) => {
    const p = ((profiles ?? []) as Pick<PublicProfile, "id" | "first_name" | "last_initial">[]).find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_initial}` : "Utilisateur";
  };
  const avg = r.length ? r.reduce((s, x) => s + x.rating, 0) / r.length : 0;

  return (
    <div className="grid gap-6">
      {toReview.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Avis à laisser ({toReview.length})</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {toReview.map((c) => {
              const other = role === "client" ? c.worker_id : c.client_id;
              return <ReviewForm key={c.id} contractId={c.id} targetName={name(other)} />;
            })}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Avis reçus ({r.length})</CardTitle>
          {r.length > 0 && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Stars n={Math.round(avg)} /> {avg.toFixed(1)} / 5</p>}
        </CardHeader>
        <CardContent>
          {r.length === 0 ? <EmptyState icon={Star} title="Pas encore d'avis" /> : (
            <ul className="divide-y">
              {r.map((x) => (
                <li key={x.id} className="grid gap-1 py-3">
                  <div className="flex items-center justify-between gap-2"><Stars n={x.rating} /><span className="text-xs text-muted-foreground">{formatDate(x.created_at)}</span></div>
                  {x.comment && <p className="text-sm">{x.comment}</p>}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{name(x.reviewer_id)}{x.is_hidden ? " · masqué par la modération" : ""}</p>
                    <ReportButton targetType="review" targetId={x.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Avis donnés ({g.length})</CardTitle></CardHeader>
        <CardContent>
          {g.length === 0 ? <p className="text-sm text-muted-foreground">Aucun avis donné.</p> : (
            <ul className="divide-y">
              {g.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2 py-3 text-sm">
                  <span>À <strong>{name(x.reviewee_id)}</strong> · <Link href={role === "client" ? `/client/jobs/${x.job_id}` : `/worker/contracts`} className="text-primary hover:underline">mission</Link></span>
                  <Stars n={x.rating} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
