import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { getAuthProviders } from "@/lib/auth/providers";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage() {
  const providers = await getAuthProviders();
  return (
    <>
      <p className="jl-rise text-xs font-semibold uppercase tracking-[0.16em] text-primary">Connexion</p>
      <h1 className="jl-rise mt-2 text-3xl font-extrabold tracking-[-0.02em] [animation-delay:60ms]">Bon retour sur JOBLINK</h1>
      <p className="jl-rise mt-2 text-[15px] text-muted-foreground [animation-delay:120ms]">
        Connectez-vous pour retrouver vos missions, vos messages et vos paiements.
      </p>
      <div className="jl-rise mt-7 [animation-delay:180ms]">
        <Suspense>
          <GoogleButton enabled={providers.google} />
          <AuthDivider />
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}
