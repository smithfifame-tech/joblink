"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { resetPasswordAction } from "@/lib/actions/auth";
import { updateProfileAction } from "@/lib/actions/profile";
import type { Profile } from "@/types/db";

export function SettingsPanel({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [notifyEmail, setNotifyEmail] = useState(profile.notify_email);
  const [notifyNewJobs, setNotifyNewJobs] = useState(profile.notify_new_jobs);
  const [saving, setSaving] = useState(false);
  const pwd = useForm<z.input<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema) });

  async function savePrefs() {
    setSaving(true);
    const res = await updateProfileAction({
      firstName: profile.first_name,
      lastName: profile.last_name,
      phone: profile.phone ?? "",
      country: profile.country_code,
      city: profile.city ?? "",
      neighborhood: profile.neighborhood ?? "",
      bio: profile.bio ?? "",
      notifyEmail,
      notifyNewJobs,
    });
    setSaving(false);
    if (!res.ok) return toast.error(res.error === "Vérifiez les champs du formulaire." ? "Complétez d'abord votre profil (téléphone, ville, quartier)." : res.error);
    toast.success("Préférences enregistrées.");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle><CardDescription>Les notifications de l&apos;application restent toujours actives.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="ne" className="font-normal">Recevoir aussi les notifications par e-mail</Label>
            <Switch id="ne" checked={notifyEmail} onCheckedChange={setNotifyEmail} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="nj" className="font-normal">Nouvelles missions correspondant à mes préférences</Label>
            <Switch id="nj" checked={notifyNewJobs} onCheckedChange={setNotifyNewJobs} />
          </div>
          <Button className="justify-self-start" onClick={savePrefs} loading={saving}>Enregistrer</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Mot de passe</CardTitle><CardDescription>Vos autres sessions seront déconnectées après le changement.</CardDescription></CardHeader>
        <CardContent>
          <form
            noValidate
            className="grid max-w-md gap-4"
            onSubmit={pwd.handleSubmit(async (v) => {
              const res = await resetPasswordAction(v);
              if (!res.ok) return toast.error(res.error);
              toast.success(res.message);
              pwd.reset({ password: "", confirmPassword: "" });
            })}
          >
            <FormField id="np" label="Nouveau mot de passe" required error={pwd.formState.errors.password?.message}><PasswordInput autoComplete="new-password" {...pwd.register("password")} /></FormField>
            <PasswordStrength value={pwd.watch("password") ?? ""} />
            <FormField id="npc" label="Confirmation" required error={pwd.formState.errors.confirmPassword?.message}><PasswordInput autoComplete="new-password" {...pwd.register("confirmPassword")} /></FormField>
            <Button type="submit" className="justify-self-start" loading={pwd.formState.isSubmitting}>Changer le mot de passe</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
