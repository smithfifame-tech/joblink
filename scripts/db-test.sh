#!/usr/bin/env bash
# Recrée une base locale, applique le stub Supabase, toutes les migrations, le seed,
# puis exécute les tests SQL (RLS, workflow, paiements, géolocalisation).
# Usage : PGHOST=/chemin/socket PGPORT=54329 PGUSER=postgres ./scripts/db-test.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${TEST_DB:-joblink_test}
PSQL="psql -v ON_ERROR_STOP=1 -q -X -t -o /dev/null"

dropdb --if-exists "$DB"
createdb "$DB"
$PSQL -d "$DB" -f tests/sql/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do
  echo "→ migration $(basename "$f")"
  $PSQL -d "$DB" -f "$f"
done
echo "→ seed"
$PSQL -d "$DB" -f supabase/seed.sql
for f in tests/sql/[1-9]*.sql; do
  echo "→ test $(basename "$f")"
  $PSQL -d "$DB" -f "$f"
done
echo "✔ Tous les tests SQL sont passés"
