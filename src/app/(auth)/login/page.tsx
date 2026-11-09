import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Connexion</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em]">Bon retour sur JOBLINK</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Connectez-vous pour retrouver vos missions, vos messages et vos paiements.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
