"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { CategoryIcon } from "@/components/layout/category-icon";
import { workerProfileSchema } from "@/lib/validations/profile";
import { updateWorkerProfileAction } from "@/lib/actions/profile";
import type { Category, WorkerProfile } from "@/types/db";
import { cn } from "@/lib/utils";

type V = z.input<typeof workerProfileSchema>;

export function WorkerProfileForm({ wp, categories, selected }: { wp: WorkerProfile; categories: Category[]; selected: string[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const { register, control, handleSubmit, formState, watch, setValue } = useForm<V>({
    resolver: zodResolver(workerProfileSchema),
    defaultValues: {
      headline: wp.headline ?? "",
      experienceYears: wp.experience_years ?? "",
      experiences: wp.experiences ?? "",
      rateMin: wp.rate_min ?? "",
      rateMax: wp.rate_max ?? "",
      rateUnit: wp.rate_unit,
      travelRadiusKm: wp.travel_radius_km,
      availability: wp.availability,
      availabilityNotes: wp.availability_notes ?? "",
      portfolioUrls: wp.portfolio_urls,
      showOnMap: wp.show_on_map,
      categoryIds: selected,
    },
  });
  const e = formState.errors;
  const urls = watch("portfolioUrls") ?? [];
  const cats = watch("categoryIds") ?? [];

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={handleSubmit(async (v) => {
        const res = await updateWorkerProfileAction(v);
        if (!res.ok) return toast.error(res.error);
        toast.success(res.message);
        router.refresh();
      })}
    >
      <FormField id="headline" label="Présentation professionnelle (titre)" error={e.headline?.message} hint="Ex. « Électricien bâtiment, 8 ans d'expérience »">
        <Input maxLength={140} {...register("headline")} />
      </FormField>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Catégories de services (8 max)</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = cats.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setValue("categoryIds", on ? cats.filter((x) => x !== c.id) : [...cats, c.id], { shouldValidate: true })}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted")}
              >
                <CategoryIcon name={c.icon} className="size-3.5" /> {c.name}
              </button>
            );
          })}
        </div>
        {e.categoryIds && <p className="mt-1 text-xs text-destructive">{e.categoryIds.message}</p>}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="experienceYears" label="Années d'expérience" error={e.experienceYears?.message}><Input type="number" min={0} max={70} inputMode="numeric" {...register("experienceYears")} /></FormField>
        <FormField id="travelRadiusKm" label="Rayon de déplacement (km)" required error={e.travelRadiusKm?.message}><Input type="number" min={1} max={200} inputMode="numeric" {...register("travelRadiusKm")} /></FormField>
      </div>
      <FormField id="experiences" label="Expériences" error={e.experiences?.message} hint="Chantiers réalisés, entreprises, formations, certifications…"><Textarea rows={5} maxLength={4000} {...register("experiences")} /></FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="rateMin" label="Tarif indicatif min (FCFA)" error={e.rateMin?.message}><Input inputMode="numeric" {...register("rateMin")} /></FormField>
        <FormField id="rateMax" label="Tarif indicatif max (FCFA)" error={e.rateMax?.message}><Input inputMode="numeric" {...register("rateMax")} /></FormField>
        <FormField id="rateUnit" label="Unité" required error={e.rateUnit?.message}>
          <NativeSelect {...register("rateUnit")}><option value="fixed">Par mission</option><option value="hourly">Par heure</option><option value="daily">Par jour</option></NativeSelect>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="availability" label="Disponibilité" required error={e.availability?.message}>
          <NativeSelect {...register("availability")}><option value="available">Disponible</option><option value="busy">Occupé (missions courtes)</option><option value="unavailable">Indisponible</option></NativeSelect>
        </FormField>
        <FormField id="availabilityNotes" label="Précisions" error={e.availabilityNotes?.message}><Input placeholder="Ex. week-ends et soirs" maxLength={500} {...register("availabilityNotes")} /></FormField>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="portfolio-url">Portfolio (facultatif) — liens https</Label>
        <div className="flex gap-2">
          <Input id="portfolio-url" type="url" value={url} onChange={(ev) => setUrl(ev.target.value)} placeholder="https://…" />
          <Button type="button" variant="outline" size="icon" aria-label="Ajouter le lien" onClick={() => {
            if (!/^https:\/\/\S+\.\S+/.test(url)) return toast.error("Lien https:// valide requis.");
            if (urls.length >= 10) return;
            setValue("portfolioUrls", [...urls, url.trim()], { shouldValidate: true });
            setUrl("");
          }}><Plus /></Button>
        </div>
        <ul className="grid gap-1">
          {urls.map((u) => (
            <li key={u} className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-sm">
              <a href={u} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-primary">{u}</a>
              <button type="button" aria-label="Retirer" onClick={() => setValue("portfolioUrls", urls.filter((x) => x !== u))}><X className="size-4" /></button>
            </li>
          ))}
        </ul>
        {e.portfolioUrls && <p className="text-xs text-destructive">Un des liens est invalide.</p>}
      </div>
      <Controller control={control} name="showOnMap" render={({ field }) => (
        <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
          <div>
            <Label htmlFor="showOnMap">Apparaître dans « Travailleurs à proximité »</Label>
            <p className="mt-1 text-xs text-muted-foreground">Les clients verront votre prénom, votre quartier et une distance approximative (jamais votre position exacte). Nécessite d&apos;enregistrer votre position ci-dessous.</p>
          </div>
          <Switch id="showOnMap" checked={field.value} onCheckedChange={field.onChange} />
        </div>
      )} />
      <Button type="submit" className="justify-self-start" loading={formState.isSubmitting}>Enregistrer le profil professionnel</Button>
    </form>
  );
}
