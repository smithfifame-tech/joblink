import Link from "next/link";
import { BadgeCheck, Heart, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { NearbyWorkers } from "@/components/jobs/nearby-workers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { storagePublicUrl } from "@/lib/env";
import { formatXOF } from "@/lib/utils/format";
import type { PublicProfile } from "@/types/db";

export const metadata = { title: "Travailleurs" };

export default async function ClientWorkersPage() {
  const user = await requireRole("client");
  const supabase = await getSupabaseServerClient();
  const [{ data: contracts }, { data: favs }] = await Promise.all([
    supabase.from("contracts").select("worker_id, job_id, status").eq("client_id", user.id),
    supabase.from("favorites").select("target_id").eq("user_id", user.id).eq("target_type", "worker"),
  ]);
  const ids = [...new Set([...(contracts ?? []).map((c) => c.worker_id as string), ...(favs ?? []).map((f) => f.target_id as string)])];
  const { data: profiles } = ids.length ? await supabase.from("public_profiles").select("*").in("id", ids) : { data: [] };
  const favSet = new Set((favs ?? []).map((f) => f.target_id as string));
  const missions = (id: string) => (contracts ?? []).filter((c) => c.worker_id === id).length;

  return (
    <>
      <PageHeader title="Travailleurs" description="Les personnes avec qui vous avez travaillé et vos favoris." />
      {(profiles ?? []).length === 0 ? (
        <EmptyState icon={Users} title="Aucun travailleur pour l'instant" description="Les travailleurs retenus sur vos missions apparaîtront ici." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {((profiles ?? []) as PublicProfile[]).map((p) => (
            <Card key={p.id} className="flex gap-3 p-4">
              <Avatar className="size-12">
                {p.avatar_url && <AvatarImage src={storagePublicUrl("avatars", p.avatar_url) ?? undefined} alt="" />}
                <AvatarFallback>{p.first_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-medium">{p.first_name} {p.last_initial}{p.is_verified && <BadgeCheck className="size-4 text-primary" />}{favSet.has(p.id) && <Heart className="size-3.5 fill-red-500 text-red-500" />}</p>
                <p className="truncate text-sm text-muted-foreground">{p.headline ?? p.city}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.rating_count ? <Badge variant="secondary">★ {Number(p.rating_avg).toFixed(1)}</Badge> : null}
                  <Badge variant="outline">{missions(p.id)} mission{missions(p.id) > 1 ? "s" : ""} avec vous</Badge>
                  {p.rate_min ? <Badge variant="outline">dès {formatXOF(p.rate_min)}</Badge> : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Card className="mt-8">
        <CardHeader><CardTitle>Trouver des travailleurs à proximité</CardTitle></CardHeader>
        <CardContent><NearbyWorkers /></CardContent>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">Pour recruter, <Link href="/client/jobs/new" className="text-primary underline">publiez une mission</Link> : les travailleurs intéressés candidateront.</p>
    </>
  );
}
