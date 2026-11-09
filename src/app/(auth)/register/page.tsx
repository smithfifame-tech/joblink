import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "./register-form";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { getAuthProviders } from "@/lib/auth/providers";

export const metadata: Metadata = { title: "Inscription", description: "Créez gratuitement votre compte JOBLINK, client ou travailleur." };

export default async function RegisterPage() {
  const providers = await getAuthProviders();
  return (
    <>
      <p className="jl-rise text-xs font-semibold uppercase tracking-[0.16em] text-primary">Inscription gratuite</p>
      <h1 className="jl-rise mt-2 text-3xl font-extrabold tracking-[-0.02em] [animation-delay:60ms]">Créer un compte</h1>
      <p className="jl-rise mt-1 text-sm text-muted-foreground [animation-delay:120ms]">Moins de deux minutes. Un e-mail de confirmation vous connecte directement.</p>
      <div className="jl-rise mt-6 [animation-delay:180ms]">
        <Suspense>
          <GoogleButton enabled={providers.google} label="S'inscrire avec Google" />
          <AuthDivider>ou avec le formulaire</AuthDivider>
          <RegisterForm />
        </Suspense>
      </div>
    </>
  );
}
