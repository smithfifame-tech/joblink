"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", remember: true, next: sp.get("next") ?? undefined },
  });

  async function onSubmit(values: LoginInput) {
    setError(null);
    const res = await loginAction(values);
    if (!res.ok) return setError(res.error);
    router.replace(res.data.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      {sp.get("next")?.startsWith("/jobs/") && !sp.get("confirmed") && (
        <Alert variant="info">Connectez-vous ou créez un compte gratuit pour voir le détail de cette mission et postuler.</Alert>
      )}
      {sp.get("logged_out") && <Alert variant="success">Vous êtes déconnecté.</Alert>}
      {sp.get("confirmed") && <Alert variant="success">Adresse e-mail confirmée ! Connectez-vous pour accéder à votre compte.</Alert>}
      {sp.get("reset") && <Alert variant="success">Mot de passe modifié. Connectez-vous avec le nouveau.</Alert>}
      {sp.get("error") === "link" && <Alert variant="error">Lien invalide ou expiré. Refaites la demande.</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      <FormField id="identifier" label="E-mail ou téléphone" required error={formState.errors.identifier?.message}>
        <Input autoComplete="username" inputMode="email" placeholder="vous@exemple.com ou 01 97 00 00 00" {...register("identifier")} />
      </FormField>
      <FormField id="password" label="Mot de passe" required error={formState.errors.password?.message}>
        <PasswordInput autoComplete="current-password" {...register("password")} />
      </FormField>
      <div className="flex items-center justify-between">
        <Controller
          control={control}
          name="remember"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
              <Label htmlFor="remember" className="font-normal">Se souvenir de moi</Label>
            </div>
          )}
        />
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">Mot de passe oublié ?</Link>
      </div>
      <Button type="submit" size="lg" className="mt-1 shadow-[0_10px_24px_-8px_rgb(22_163_74/0.6)]" loading={formState.isSubmitting}>Se connecter</Button>
      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href={sp.get("next") ? `/register?next=${encodeURIComponent(sp.get("next")!)}` : "/register"} className="font-medium text-primary hover:underline">
          Créer un compte gratuitement
        </Link>
      </p>
    </form>
  );
}
