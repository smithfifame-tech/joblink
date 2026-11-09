import { publicEnv } from "@/lib/env";

/** Référencement : nom de marque, variantes recherchées et données structurées (schema.org). */
export const BRAND = "JOBLINK";
export const BRAND_ALIASES = ["Joblink", "Job Link", "JOBLINK Bénin", "Joblink Bénin", "JobLink Cotonou"];
export const SEO_TITLE = "JOBLINK — Petits travaux, services et missions près de chez vous au Bénin";
export const SEO_DESCRIPTION =
  "JOBLINK, la plateforme béninoise qui met en relation clients et travailleurs de votre quartier : plombiers, électriciens, couturiers, aides ménagères, livreurs, développeurs… Publiez une mission gratuitement, payez par Mobile Money après validation.";
export const SEO_KEYWORDS = [
  "JOBLINK", "Joblink", "job link", "joblink Bénin", "joblink Cotonou",
  "petits travaux Bénin", "trouver un artisan Cotonou", "plombier Cotonou", "électricien Cotonou", "couturier Cotonou",
  "aide ménagère Bénin", "livreur Cotonou", "freelance Bénin", "missions Bénin", "emploi Bénin", "services à domicile Bénin",
  "Abomey-Calavi", "Porto-Novo", "Mobile Money",
];

export function organizationJsonLd() {
  const url = publicEnv.siteUrl;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url}/#organization`,
    name: BRAND,
    alternateName: BRAND_ALIASES,
    url,
    logo: { "@type": "ImageObject", url: `${url}/logos/joblink-512.png`, width: 512, height: 512 },
    description: SEO_DESCRIPTION,
    areaServed: { "@type": "Country", name: "Bénin" },
    address: { "@type": "PostalAddress", addressCountry: "BJ", addressLocality: "Cotonou" },
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: `${url}/contact`, availableLanguage: ["fr"] },
  };
}

export function websiteJsonLd() {
  const url = publicEnv.siteUrl;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}/#website`,
    name: BRAND,
    alternateName: BRAND_ALIASES,
    url,
    inLanguage: "fr-BJ",
    publisher: { "@id": `${url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${url}/jobs?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Sérialisation sûre pour <script type="application/ld+json">. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
