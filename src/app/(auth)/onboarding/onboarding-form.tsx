"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Briefcase, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/form-field";
import { CityDatalist } from "@/components/layout/city-datalist";
import { onboardingSchema, type OnboardingInput } from "@/lib/validations/auth";
import { completeOnboardingAction } from "@/lib/actions/auth";
import { COUNTRIES } from "@/lib/maps/places";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "client", title: "Client", text: "Je publie des missions et je recrute.", icon: Briefcase },
  { value: "worker", title: "Travailleur", text: "Je propose mes services et je candidate.", icon: HardHat },
] as const;

export function OnboardingForm({
  next,
  defaults,
}: {
  next?: string;
  defaults: { firstName: string; lastName: string; phone: string; country: string; city: string; neighborhood: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState, setError: setFieldError } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    mode: "onTouched",
    defaultValues: { accountType: "client", ...defaults, next },
  });
  const e = formState.errors;

  async function onSubmit(values: OnboardingInput) {
    setError(null);
    const res = await completeOnboardingAction(values);
    if (!res.ok) {
      for (const [k, msgs] of Object.entries(res.fieldErrors ?? {})) {
        if (msgs?.[0]) setFieldError(k as keyof OnboardingInput, { message: msgs[0] });
      }
      return setError(res.error);
    }
    router.replace(res.data.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="jl-rise mt-7 grid gap-5 [animation-delay:180ms]" noValidate>
      <CityDatalist />
      {error && <Alert variant="error">{error}</Alert>}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Vous êtes <span className="text-destructive" aria-hidden>*</span></legend>
        <Controller
          control={control}
          name="accountType"
          render={({ field }) => (
            <div role="radiogroup" className="grid grid-cols-2 gap-3">
              {TYPES.map((t) => {
                const checked = field.value === t.value;
                return (
                  <label
                    key={t.value}
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-all duration-300 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/25",
                      checked ? "border-primary bg-accent/60 shadow-[var(--shadow-soft)]" : "hover:border-foreground/20",
                    )}
                  >
                    <input type="radio" className="sr-only" name={field.name} value={t.value} checked={checked} onChange={() => field.onChange(t.value)} />
                    <t.icon className={cn("size-5 transition-colors", checked ? "text-primary" : "text-muted-foreground")} aria-hidden />
                    <span className="text-sm font-semibold">{t.title}</span>
                    <span className="text-xs text-muted-foreground">{t.text}</span>
                  </label>
                );
              })}
            </div>
          )}
        />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="lastName" label="Nom" required error={e.lastName?.message}><Input autoComplete="family-name" {...register("lastName")} /></FormField>
        <FormField id="firstName" label="Prénom" required error={e.firstName?.message}><Input autoComplete="given-name" {...register("firstName")} /></FormField>
      </div>
      <FormField id="phone" label="Numéro de téléphone" required error={e.phone?.message} hint="Format béninois : 01 97 00 00 00 (indicatif +229 ajouté automatiquement).">
        <Input type="tel" autoComplete="tel" inputMode="tel" {...register("phone")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="country" label="Pays" required error={e.country?.message}>
          <NativeSelect {...register("country")}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} disabled={!c.enabled}>{c.name}{c.enabled ? "" : " (bientôt)"}</option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="city" label="Ville" required error={e.city?.message}><Input list="jl-cities" autoComplete="address-level2" {...register("city")} /></FormField>
        <FormField id="neighborhood" label="Quartier" required error={e.neighborhood?.message}><Input {...register("neighborhood")} /></FormField>
      </div>

      <Controller
        control={control}
        name="acceptTerms"
        render={({ field }) => (
          <div className="grid gap-1">
            <div className="flex items-start gap-2">
              <Checkbox id="acceptTerms" className="mt-0.5" checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true ? true : undefined)} aria-invalid={e.acceptTerms ? true : undefined} />
              <Label htmlFor="acceptTerms" className="block font-normal leading-snug">
                J&apos;accepte les <Link href="/terms" target="_blank" className="text-primary underline">conditions générales</Link> et la{" "}
                <Link href="/privacy" target="_blank" className="text-primary underline">politique de confidentialité</Link>.
              </Label>
            </div>
            {e.acceptTerms && <p role="alert" className="text-xs font-medium text-destructive">{e.acceptTerms.message}</p>}
          </div>
        )}
      />

      <Button type="submit" size="lg" loading={formState.isSubmitting} className="shadow-[0_10px_24px_-8px_rgb(22_163_74/0.6)]">
        Activer mon compte
      </Button>
    </form>
  );
}
