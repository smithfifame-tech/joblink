"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Fingerprint, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { AuthBrand, AuthWatermark } from "@/components/auth/auth-brand";
import { PhotoCarousel, type Slide } from "@/components/auth/photo-carousel";
import { ownerLoginAction, type OwnerLoginState } from "@/app/admin/joblink/actions";
import { PHOTOS } from "@/lib/media/photos";

const SLIDES: Slide[] = [
  { photo: PHOTOS.market, position: "object-[50%_60%]" },
  { photo: PHOTOS.builder, position: "object-[60%_30%]" },
  { photo: PHOTOS.tailorPhone, position: "object-[40%_center]" },
];

export function OwnerLogin({ available }: { available: boolean }) {
  const [state, action, pending] = useActionState<OwnerLoginState, FormData>(ownerLoginAction, undefined);

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.15fr_minmax(0,580px)]">
      {/* Panneau visuel : diaporama de 3 photos */}
      <aside className="relative hidden p-4 lg:block">
        <div className="sticky top-4 isolate flex h-[calc(100dvh-2rem)] min-h-[560px] flex-col justify-between overflow-hidden rounded-[2rem] p-10 text-white shadow-[var(--shadow-lift)]">
          <PhotoCarousel slides={SLIDES} priority sizes="55vw" controlsClassName="absolute inset-x-10 bottom-8 border-t border-white/15 pt-5" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0b2e1a]/95 via-[#14532d]/75 to-[#0b2e1a]/45" />
          <div aria-hidden className="jl-grid absolute inset-0 -z-10 opacity-15" />

          <p className="jl-rise inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold ring-1 ring-white/25 backdrop-blur">
            <LockKeyhole className="size-3.5 text-green-300" aria-hidden /> Centre de contrôle · accès réservé
          </p>

          <div className="max-w-md pb-14">
            <p className="text-balance text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
              Toute votre plateforme, <span className="text-green-300">d&apos;un seul regard.</span>
            </p>
            <ul className="mt-8 grid gap-3 text-[15px] text-white/85">
              {[
                "Inscriptions, missions et paiements en temps réel",
                "Modération : comptes, missions, signalements",
                "Accès protégé, chaque connexion est journalisée",
              ].map((t, i) => (
                <li key={t} className="jl-rise flex items-center gap-2.5" style={{ animationDelay: `${300 + i * 120}ms` }}>
                  <ShieldCheck className="size-5 shrink-0 text-green-300" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Formulaire */}
      <main className="relative isolate flex flex-col overflow-hidden px-5 py-6 sm:px-10">
        <AuthWatermark />
        <Link href="/" className="relative inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Retour au site
        </Link>

        <AuthBrand subtitle="Centre de contrôle" className="mt-4" />

        {/* Diaporama compact (mobile et tablette) */}
        <div className="relative isolate mt-6 flex h-36 flex-col justify-end overflow-hidden rounded-[1.5rem] p-3 shadow-[var(--shadow-soft)] sm:h-44 lg:hidden">
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b2e1a]/85 via-[#0b2e1a]/25 to-transparent" />
          <PhotoCarousel slides={SLIDES} priority sizes="100vw" />
        </div>

        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
          <div className="jl-rise rounded-[1.75rem] border border-border/70 bg-white/85 p-6 shadow-[var(--shadow-lift)] backdrop-blur-md [animation-delay:120ms] sm:p-7">
            <div className="flex items-center gap-3">
              <span className="relative grid size-12 shrink-0 place-items-center">
                <span aria-hidden className="absolute inset-0 rounded-2xl bg-primary/25 animate-ping [animation-duration:2.6s]" />
                <span className="relative grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-strong text-white shadow-[0_12px_24px_-10px_rgb(22_163_74/0.8)]">
                  <LockKeyhole className="size-5" />
                </span>
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Accès propriétaire</p>
                <h1 className="text-xl font-extrabold tracking-[-0.01em]">Tableau de bord</h1>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Saisissez votre mot de passe administrateur pour continuer.</p>

            {!available ? (
              <div role="alert" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Le tableau de bord n&apos;est pas encore configuré sur ce serveur.
              </div>
            ) : (
              <form action={action} className="mt-6 grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="owner-password" className="text-sm font-medium">Mot de passe</label>
                  <PasswordInput
                    id="owner-password"
                    name="password"
                    autoComplete="current-password"
                    required
                    autoFocus
                    maxLength={200}
                    aria-invalid={Boolean(state?.error)}
                    aria-describedby={state?.error ? "owner-error" : undefined}
                  />
                </div>
                {state?.error && (
                  <p id="owner-error" role="alert" className="animate-[pop-in_.35s_cubic-bezier(.2,.8,.2,1)_both] rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                    {state.error}
                  </p>
                )}
                <Button type="submit" size="lg" disabled={pending} className="shadow-[0_10px_24px_-8px_rgb(22_163_74/0.6)]">
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Fingerprint className="size-4" />}
                  {pending ? "Vérification…" : "Accéder au tableau de bord"}
                </Button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Après 5 essais incorrects, l&apos;accès est bloqué 15 minutes.
            <br />
            Session limitée à 8 heures.
          </p>
        </div>
      </main>
    </div>
  );
}
