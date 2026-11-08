# Tests

| Niveau | Outil | Commande | Contenu |
|---|---|---|---|
| Base de données | PostgreSQL 16 + PostGIS | `npm run test:db` | 90 assertions : rôles à l'inscription, RLS (isolation, colonnes protégées), workflow complet missions/candidatures/contrats, paiements (calcul, idempotence, anti double paiement, confirmation réservée au service_role), messagerie et blocage, litiges, admin, recherche PostGIS (rayon, emprise, plein texte), Storage |
| Unitaires | Vitest | `npm test` | commission 5 %, signature HMAC, validations (inscription, téléphone béninois, mission, candidature, fichiers), géolocalisation, rate limiting, redirections, protection des routes |
| Intégration | Vitest | `npm test` | chaîne webhook → signature → idempotence → rapprochement → `confirm_payment` ; garde-fou sandbox en production ; FedaPay |
| Navigation | Playwright | `npm run test:e2e` | pages publiques, SEO, en-têtes de sécurité, protection des routes privées, formulaires d'inscription/connexion/récupération, menu mobile |
| Parcours complets | Playwright | `E2E_SUPABASE=1 npm run test:e2e` | inscription, connexion par rôle, déconnexion, accès admin refusé, candidature (nécessite Supabase + seed) |

## Base de données locale
`scripts/db-test.sh` recrée une base, charge `tests/sql/00_supabase_stub.sql` (rôles `anon`/`authenticated`/`service_role`, `auth.uid()`, Storage, Realtime), applique les migrations et le seed, puis exécute `tests/sql/1*.sql`.
```bash
PGHOST=localhost PGPORT=5432 PGUSER=postgres npm run test:db
```
Avec la CLI Supabase (Docker) : `supabase start && supabase db reset` applique migrations et seed sur une vraie stack locale.

## Playwright
```bash
npx playwright install chromium   # ou PW_CHROME_PATH=/chemin/vers/chrome
npm run build && npm run test:e2e
```
