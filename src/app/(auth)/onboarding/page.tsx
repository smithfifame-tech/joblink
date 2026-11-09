import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, needsOnboarding } from "@/lib/auth/session";
import { safeNext } from "@/lib/validations/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Finaliser mon profil", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await requireUser("/onboarding", { allowIncomplete: true });
  if (!needsOnboarding(user)) redirect(safeNext(next) ?? "/account");

  const p = user.profile!;
  const isPlaceholder = p.first_name === "Utilisateur" && p.last_name === "JOBLINK";
  return (
    <>
      <p className="jl-rise text-xs font-semibold uppercase tracking-[0.16em] text-primary">Dernière étape</p>
      <h1 className="jl-rise mt-2 text-3xl font-extrabold tracking-[-0.02em] [animation-delay:60ms]">Finalisez votre profil</h1>
      <p className="jl-rise mt-2 text-[15px] text-muted-foreground [animation-delay:120ms]">
        Votre compte Google <strong className="text-foreground">{user.email}</strong> est presque prêt. Ces informations sont
        nécessaires pour utiliser JOBLINK en toute confiance.
      </p>
      <OnboardingForm
        next={safeNext(next) ?? undefined}
        defaults={{
          firstName: isPlaceholder ? "" : p.first_name,
          lastName: isPlaceholder ? "" : p.last_name,
          phone: "",
          country: p.country_code || "BJ",
          city: p.city ?? "",
          neighborhood: p.neighborhood ?? "",
        }}
      />
    </>
  );
}
