import { isSupabaseConfigured } from "@/lib/env";
import { Alert } from "@/components/ui/alert";

/** Affiché uniquement en développement si Supabase n'est pas encore configuré. */
export function ConfigNotice() {
  if (isSupabaseConfigured() || process.env.NODE_ENV === "production") return null;
  return (
    <Alert variant="warning" title="Supabase n'est pas configuré" className="mx-auto mt-4 max-w-7xl">
      Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local (voir README). Les données dynamiques s&apos;afficheront ensuite.
    </Alert>
  );
}
