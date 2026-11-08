"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { CityDatalist } from "@/components/layout/city-datalist";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { registerAction } from "@/lib/actions/auth";
import { COUNTRIES } from "@/lib/maps/places";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "client", title: "Client", text: "Je publie des missions et je recrute.", icon: Briefcase },
  { value: "worker", title: "Travailleur", text: "Je propose mes services et je candidate.", icon: HardHat },
] as const;

export function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const initialType = sp.get("type") === "worker" ? "worker" : "client";
  const { register, handleSubmit, control, watch, formState, setError: setFieldError } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      accountType: initialType,
      country: "BJ",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      city: "",
      neighborhood: "",
      website: "",
    },
  });
  const e = formState.errors;

  async function onSubmit(values: RegisterInput) {
    setError(null);
    const res = await registerAction(values);
    if (!res.ok) {
      for (const [k, msgs] of Object.entries(res.fieldErrors ?? {})) {
        if (msgs?.[0]) setFieldError(k as keyof RegisterInput, { message: msgs[0] });
      }
      return setError(res.error);
    }
    router.push(`/check-email?email=${encodeURIComponent(res.data.email)}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-5" noValidate>
      <CityDatalist />
      {error && <Alert variant="error">{error}</Alert>}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Type de compte <span className="text-destructive" aria-hidden>*</span></legend>
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
                      "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-all has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/25",
                      checked ? "border-primary bg-accent/60" : "hover:border-foreground/20",
                    )}
                  >
                    <input type="radio" className="sr-only" name={field.name} value={t.value} checked={checked} onChange={() => field.onChange(t.value)} />
                    <t.icon className={cn("size-5", checked ? "text-primary" : "text-muted-foreground")} aria-hidden />
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
      <FormField id="email" label="Adresse e-mail" required error={e.email?.message}>
        <Input type="email" autoComplete="email" inputMode="email" {...register("email")} />
      </FormField>
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
      <FormField id="password" label="Mot de passe" required error={e.password?.message} hint="10 caractères min., majuscule, minuscule, chiffre et caractère spécial.">
        <PasswordInput autoComplete="new-password" {...register("password")} />
      </FormField>
      <PasswordStrength value={watch("password") ?? ""} />
      <FormField id="confirmPassword" label="Confirmation du mot de passe" required error={e.confirmPassword?.message}>
        <PasswordInput autoComplete="new-password" {...register("confirmPassword")} />
      </FormField>

      {/* Champ piège anti-robots */}
      <div className="hidden" aria-hidden>
        <label htmlFor="website">Site web</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
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

      <Button type="submit" size="lg" loading={formState.isSubmitting}>Créer mon compte</Button>
      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ? <Link href="/login" className="font-medium text-primary hover:underline">Se connecter</Link>
      </p>
    </form>
  );
}
