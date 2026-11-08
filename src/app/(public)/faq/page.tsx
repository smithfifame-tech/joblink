import type { Metadata } from "next";
import { FaqList, FAQ_ITEMS } from "@/components/layout/faq-list";

export const metadata: Metadata = { title: "Questions fréquentes", description: "Tarifs, paiements, sécurité, inscription : toutes les réponses sur JOBLINK.", alternates: { canonical: "/faq" } };

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1 className="text-3xl font-semibold">Questions fréquentes</h1>
      <div className="mt-8"><FaqList /></div>
    </div>
  );
}
