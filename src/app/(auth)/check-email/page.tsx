import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResendButton } from "./resend-button";

export const metadata: Metadata = { title: "Confirmez votre e-mail" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-primary"><MailCheck className="size-6" /></span>
      <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.02em]">Vérifiez votre boîte e-mail</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Si l&apos;adresse {email ? <strong className="text-foreground">{email}</strong> : "indiquée"} est valide, un lien de confirmation vient d&apos;y être envoyé.
        Cliquez dessus pour activer votre compte (pensez aux spams).
      </p>
      <div className="mt-6 grid gap-2">
        <Button asChild><Link href="/login">Aller à la connexion</Link></Button>
        {email && <ResendButton email={email} />}
      </div>
    </div>
  );
}
