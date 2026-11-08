import { Alert } from "@/components/ui/alert";

export function LegalPage({ title, updated, notice, sections }: { title: string; updated: string; notice?: string; sections: [string, string][] }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {updated}</p>
      {notice && <Alert variant="warning" className="mt-6">{notice}</Alert>}
      <div className="mt-8 grid gap-8">
        {sections.map(([h, body]) => (
          <section key={h}>
            <h2 className="text-lg font-semibold">{h}</h2>
            <p className="mt-2 leading-relaxed text-foreground/85">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
