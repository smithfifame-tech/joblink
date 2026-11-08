import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Bon retour sur JOBLINK</h1>
      <p className="mt-1 text-sm text-muted-foreground">Connectez-vous pour accéder à votre espace.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
