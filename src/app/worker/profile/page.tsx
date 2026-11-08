import { PageHeader } from "@/components/dashboard/page-header";
import { AvatarUpload } from "@/components/forms/avatar-upload";
import { ProfileForm } from "@/components/forms/profile-form";
import { WorkerProfileForm } from "@/components/forms/worker-profile-form";
import { LocationSetter } from "@/components/forms/location-setter";
import { VerificationRequest } from "@/components/forms/verification-request";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCategories } from "@/services/catalog";
import type { VerificationRequest as VR, WorkerProfile } from "@/types/db";

export const metadata = { title: "Mon profil" };

export default async function WorkerProfilePage() {
  const user = await requireRole("worker");
  const supabase = await getSupabaseServerClient();
  const [{ data: wp }, { data: wc }, { data: loc }, { data: vr }, categories] = await Promise.all([
    supabase.from("worker_profiles").select("*").eq("user_id", user.id).single<WorkerProfile>(),
    supabase.from("worker_categories").select("category_id").eq("worker_id", user.id),
    supabase.from("user_locations").select("city, neighborhood, source, updated_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("verification_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
    getCategories(),
  ]);
  if (!user.profile || !wp) return null;
  const last = ((vr ?? []) as VR[])[0];

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader title="Mon profil" description="Un profil complet reçoit davantage de missions." />
      <Card>
        <CardHeader><CardTitle>Photo de profil</CardTitle></CardHeader>
        <CardContent><AvatarUpload userId={user.id} path={user.profile.avatar_url} name={user.profile.first_name} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Profil professionnel</CardTitle><CardDescription>Visible publiquement par les clients.</CardDescription></CardHeader>
        <CardContent><WorkerProfileForm wp={wp} categories={categories} selected={(wc ?? []).map((r) => r.category_id as string)} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Ma position</CardTitle><CardDescription>Utilisée pour calculer les distances et, si vous l&apos;acceptez, apparaître à proximité.</CardDescription></CardHeader>
        <CardContent><LocationSetter current={loc as { city: string | null; neighborhood: string | null; source: string; updated_at: string } | null} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Vérification du profil</CardTitle></CardHeader>
        <CardContent>
          <VerificationRequest userId={user.id} status={{ verified: wp.is_verified, pending: last?.status === "pending", lastRejectedNote: last?.status === "rejected" ? last.review_note : null }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Informations personnelles</CardTitle><CardDescription>Coordonnées partagées uniquement avec le client d&apos;une mission attribuée.</CardDescription></CardHeader>
        <CardContent><ProfileForm profile={user.profile} /></CardContent>
      </Card>
    </div>
  );
}
