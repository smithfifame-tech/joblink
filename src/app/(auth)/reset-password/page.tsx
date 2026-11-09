"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { resetPasswordAction } from "@/lib/actions/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState } = useForm<z.input<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema) });
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-[-0.02em]">Nouveau mot de passe</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choisissez un mot de passe robuste que vous n&apos;utilisez nulle part ailleurs.</p>
      <form
        className="mt-8 grid gap-4"
        noValidate
        onSubmit={handleSubmit(async (v) => {
          setError(null);
          const res = await resetPasswordAction(v);
          if (!res.ok) return setError(res.error);
          router.replace("/account?reset=1");
        })}
      >
        {error && <Alert variant="error">{error}</Alert>}
        <FormField id="password" label="Nouveau mot de passe" required error={formState.errors.password?.message}>
          <PasswordInput autoComplete="new-password" {...register("password")} />
        </FormField>
        <PasswordStrength value={watch("password") ?? ""} />
        <FormField id="confirmPassword" label="Confirmation" required error={formState.errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...register("confirmPassword")} />
        </FormField>
        <Button type="submit" size="lg" loading={formState.isSubmitting}>Enregistrer</Button>
      </form>
    </>
  );
}
