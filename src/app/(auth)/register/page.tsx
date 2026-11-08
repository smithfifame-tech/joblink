import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Inscription", description: "Créez gratuitement votre compte JOBLINK, client ou travailleur." };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Créer un compte</h1>
      <p className="mt-1 text-sm text-muted-foreground">Gratuit. Moins de deux minutes.</p>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </>
  );
}
