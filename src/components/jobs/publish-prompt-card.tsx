import Link from "next/link";
import { ArrowRight, Megaphone, UserRoundPlus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Carte d'appel à l'action placée dans une grille de missions lorsqu'elle est peu remplie :
 * évite les grands vides et oriente vers la publication (clients) ou l'inscription (travailleurs).
 */
export function PublishPromptCard({ variant = "client", className }: { variant?: "client" | "worker"; className?: string }) {
  const client = variant === "client";
  const Icon = client ? Megaphone : UserRoundPlus;
  return (
    <div
      className={cn(
        "relative isolate flex h-full min-h-72 flex-col justify-between overflow-hidden rounded-[1.4rem] p-6 shadow-[var(--shadow-soft)]",
        client ? "bg-gradient-to-br from-primary to-primary-strong text-white" : "border border-primary/15 bg-white",
        className,
      )}
    >
      <div aria-hidden className={cn("absolute -right-14 -top-14 -z-10 size-48 rounded-full", client ? "bg-white/10" : "bg-accent")} />
      <div aria-hidden className={cn("absolute -bottom-16 right-10 -z-10 size-36 rounded-full", client ? "bg-black/10" : "bg-accent/60")} />
      <div>
        <span className={cn("grid size-11 place-items-center rounded-2xl", client ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-accent text-primary")}>
          <Icon className="size-5" aria-hidden />
        </span>
        <h3 className={cn("mt-5 text-xl font-extrabold leading-tight tracking-[-0.01em]", client ? "text-white" : "text-foreground")}>
          {client ? "Votre besoin n'est pas encore dans la liste ?" : "Vous avez un savoir-faire ?"}
        </h3>
        <p className={cn("mt-2 text-sm leading-relaxed", client ? "text-white/85" : "text-muted-foreground")}>
          {client
            ? "Publiez-le gratuitement en 2 minutes : les travailleurs de votre quartier vous envoient leurs propositions."
            : "Créez votre profil gratuit et recevez les nouvelles missions publiées près de chez vous."}
        </p>
      </div>
      <Link
        href={client ? "/client/jobs/new" : "/register?type=worker"}
        prefetch={false}
        className={cn(
          "group mt-6 inline-flex w-fit items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5",
          client ? "bg-white text-primary-strong shadow-lg hover:shadow-xl" : "bg-primary text-white hover:bg-primary-strong",
        )}
      >
        {client ? "Publier une mission" : "Devenir travailleur"}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}
