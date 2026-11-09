"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Fingerprint, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/layout/logo";
import { ownerLoginAction, type OwnerLoginState } from "@/app/admin/joblink/actions";
import { PHOTOS } from "@/lib/media/photos";

export function OwnerLogin({ available }: { available: boolean }) {
  const [state, action, pending] = useActionState<OwnerLoginState, FormData>(ownerLoginAction, undefined);
  const photo = PHOTOS.market;

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.15fr_minmax(0,560px)]">
      {/* Panneau visuel */}
      <aside className="relative hidden p-4 lg:block">
        <div className="sticky top-4 isolate flex h-[calc(100dvh-2rem)] flex-col justify-between overflow-hidden rounded-[2rem] p-10 text-white">
          <Image src={photo.src} alt="" fill priority sizes="55vw" className="-z-10 object-cover object-[50%_60%] animate-[kenburns_18s_ease-out_both]" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0b2e1a]/95 via-[#14532d]/80 to-[#0b2e1a]/60" />
          <div aria-hidden className="jl-grid absolute inset-0 -z-10 opacity-20" />

          <div className="flex items-center gap-2.5">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/95 shadow-lg">
              <LogoMark className="size-8" />
            </span>
            <div>
              <p className="font-logo text-lg font-extrabold leading-none tracking-tight">
                JOB<span className="text-green-300">LINK</span>
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/60">Centre de contrôle</p>
            </div>
          </div>

          <div className="max-w-md">
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

          <a href={photo.authorUrl} target="_blank" rel="noopener noreferrer" className="w-fit text-xs text-white/60 hover:text-white">
            Photo : {photo.author} / Unsplash
          </a>
        </div>
      </aside>

      {/* Formulaire */}
      <main className="relative flex flex-col px-5 py-8 sm:px-10">
        <div aria-hidden className="jl-dots pointer-events-none absolute inset-x-0 top-0 h-56 opacity-40 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
        <Link href="/" className="relative inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Retour au site
        </Link>

        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="jl-rise relative mx-auto mb-8 grid size-20 place-items-center">
            <span aria-hidden className="absolute inset-0 rounded-[1.6rem] bg-primary/25 animate-ping [animation-duration:2.6s]" />
            <span className="relative grid size-20 place-items-center rounded-[1.6rem] bg-gradient-to-br from-primary to-primary-strong text-white shadow-[0_18px_36px_-12px_rgb(22_163_74/0.7)]">
              <LockKeyhole className="size-8" />
            </span>
          </div>
          <p className="jl-rise text-center text-xs font-semibold uppercase tracking-[0.18em] text-primary [animation-delay:80ms]">Accès propriétaire</p>
          <h1 className="jl-rise mt-2 text-center text-3xl font-extrabold tracking-[-0.02em] [animation-delay:140ms]">Tableau de bord JOBLINK</h1>
          <p className="jl-rise mt-2 text-center text-[15px] text-muted-foreground [animation-delay:200ms]">
            Saisissez votre mot de passe administrateur pour continuer.
          </p>

          {!available ? (
            <div role="alert" className="jl-rise mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Le tableau de bord n&apos;est pas encore configuré sur ce serveur.
            </div>
          ) : (
            <form action={action} className="jl-rise mt-8 grid gap-4 [animation-delay:260ms]">
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

          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
            Après 5 essais incorrects, l&apos;accès est bloqué 15 minutes.
            <br />
            Session limitée à 8 heures.
          </p>
        </div>
      </main>
    </div>
  );
}
