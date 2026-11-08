import { Card } from "@/components/ui/card";

/** Tableau responsive simple (défilement horizontal sur mobile). */
export function DataTable({ head, children, minWidth = 720 }: { head: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y [&_td]:px-4 [&_td]:py-3 [&_td]:align-top">{children}</tbody>
      </table>
    </Card>
  );
}

export function AdminSearch({ action, placeholder, defaultValue, extra }: { action: string; placeholder: string; defaultValue?: string; extra?: React.ReactNode }) {
  return (
    <form method="get" action={action} className="mb-4 flex flex-wrap gap-2">
      <input name="q" defaultValue={defaultValue} placeholder={placeholder} className="h-10 min-w-56 flex-1 rounded-lg border px-3 text-sm outline-none focus:border-primary" aria-label="Rechercher" />
      {extra}
      <button className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background">Filtrer</button>
    </form>
  );
}
