import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact", description: "Contactez l'équipe JOBLINK.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <h1 className="text-3xl font-semibold">Contactez-nous</h1>
        <p className="mt-3 text-muted-foreground">Une question, un partenariat, un problème sur une mission ? Écrivez-nous.</p>
        <ul className="mt-6 grid gap-3 text-sm">
          <li className="flex items-center gap-2"><Mail className="size-4 text-primary" /> support@joblink.bj</li>
          <li className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> Cotonou, Bénin</li>
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">Pour un litige sur une mission, utilisez plutôt « Signaler un problème » depuis la mission : le traitement est plus rapide.</p>
      </div>
      <ContactForm />
    </div>
  );
}
