"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/form-field";
import { CityDatalist } from "@/components/layout/city-datalist";
import { profileSchema } from "@/lib/validations/profile";
import { updateProfileAction } from "@/lib/actions/profile";
import { COUNTRIES } from "@/lib/maps/places";
import type { Profile } from "@/types/db";

type V = z.input<typeof profileSchema>;

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<V>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.first_name,
      lastName: profile.last_name,
      phone: profile.phone ?? "",
      country: profile.country_code,
      city: profile.city ?? "",
      neighborhood: profile.neighborhood ?? "",
      bio: profile.bio ?? "",
      notifyEmail: profile.notify_email,
      notifyNewJobs: profile.notify_new_jobs,
    },
  });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={handleSubmit(async (v) => {
        const res = await updateProfileAction(v);
        if (!res.ok) return toast.error(res.error);
        toast.success(res.message);
        router.refresh();
      })}
    >
      <CityDatalist />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="lastName" label="Nom" required error={e.lastName?.message}><Input {...register("lastName")} /></FormField>
        <FormField id="firstName" label="Prénom" required error={e.firstName?.message}><Input {...register("firstName")} /></FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="email" label="Adresse e-mail" hint="Pour la modifier, contactez le support."><Input value={profile.email} disabled readOnly /></FormField>
        <FormField id="phone" label="Téléphone (Mobile Money)" required error={e.phone?.message}><Input type="tel" {...register("phone")} /></FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="country" label="Pays" required error={e.country?.message}>
          <NativeSelect {...register("country")}>{COUNTRIES.map((c) => <option key={c.code} value={c.code} disabled={!c.enabled}>{c.name}</option>)}</NativeSelect>
        </FormField>
        <FormField id="city" label="Ville" required error={e.city?.message}><Input list="jl-cities" {...register("city")} /></FormField>
        <FormField id="neighborhood" label="Quartier" required error={e.neighborhood?.message}><Input {...register("neighborhood")} /></FormField>
      </div>
      <FormField id="bio" label="À propos de vous" error={e.bio?.message}><Textarea rows={4} maxLength={2000} {...register("bio")} /></FormField>
      <Button type="submit" className="justify-self-start" loading={formState.isSubmitting}>Enregistrer</Button>
    </form>
  );
}
