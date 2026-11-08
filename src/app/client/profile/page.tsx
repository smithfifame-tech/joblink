import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileForm } from "@/components/forms/profile-form";
import { AvatarUpload } from "@/components/forms/avatar-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Mon profil" };

export default async function ClientProfilePage() {
  const user = await requireRole("client");
  if (!user.profile) return null;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Mon profil" description="Ces informations aident les travailleurs à vous faire confiance. Vos coordonnées ne sont partagées qu'avec le travailleur retenu." />
      <Card>
        <CardHeader><CardTitle>Photo</CardTitle></CardHeader>
        <CardContent><AvatarUpload userId={user.id} path={user.profile.avatar_url} name={user.profile.first_name} /></CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
        <CardContent><ProfileForm profile={user.profile} /></CardContent>
      </Card>
    </div>
  );
}
