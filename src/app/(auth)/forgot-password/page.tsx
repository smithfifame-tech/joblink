"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { forgotPasswordAction } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.input<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema) });
  return (
    <>
      <h1 className="text-2xl font-semibold">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-muted-foreground">Recevez un lien de réinitialisation par e-mail.</p>
      <form
        className="mt-8 grid gap-4"
        noValidate
        onSubmit={handleSubmit(async (v) => {
          setError(null);
          const res = await forgotPasswordAction(v);
          if (res.ok) {
            setDone(res.message ?? "E-mail envoyé.");
          } else {
            setError(res.error);
          }
        })}
      >
        {done && <Alert variant="success">{done}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}
        <FormField id="email" label="Adresse e-mail" required error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </FormField>
        <Button type="submit" size="lg" loading={formState.isSubmitting} disabled={Boolean(done)}>Envoyer le lien</Button>
        <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">Retour à la connexion</Link>
      </form>
    </>
  );
}
