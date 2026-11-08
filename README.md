# JOBLINK

> Le travail près de vous, les opportunités à portée de main.

Marketplace de petits travaux et services géolocalisés, lancée au Bénin. Les clients publient des missions, les travailleurs proches candidatent, le client valide le travail puis paie par Mobile Money. JOBLINK prélève **5 %** de commission sur les missions payées.

**Stack** : Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · shadcn/ui (Radix) · Supabase (Auth, PostgreSQL 15, PostGIS, Storage, Realtime, RLS) · Leaflet + OpenStreetMap · React Hook Form + Zod · Sonner · date-fns · Resend · Vitest · Playwright.

## Démarrage rapide

```bash
npm install
cp .env.example .env.local          # renseignez les clés Supabase
npx supabase link --project-ref <ref>
npx supabase db push                # applique supabase/migrations
npm run dev                         # http://localhost:3000
```

Puis créez le premier administrateur (SQL Editor Supabase, après son inscription) :

```sql
select public.grant_admin('vous@exemple.com');
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Développement, build, production |
| `npm run check` | Typecheck + lint + tests unitaires |
| `npm test` | Vitest (unitaires + intégration webhooks) |
| `npm run test:db` | Migrations + 90 tests SQL (RLS, workflow, paiements, PostGIS) sur PostgreSQL local |
| `npm run test:e2e` | Playwright (navigation, formulaires, protection des routes) |
| `npm run db:types` | Régénère les types TypeScript depuis Supabase |

## Architecture

```
src/app/(public)       pages publiques (ISR) : accueil, missions, carte, catégories, pages légales
src/app/(auth)         inscription, connexion, mot de passe oublié/réinitialisation
src/app/client|worker  espaces privés par rôle (garde serveur requireRole)
src/app/admin          administration (rôle admin vérifié en base)
src/app/(shared)       messagerie temps réel, notifications
src/app/api            recherche publique, webhooks de paiement signés, cron de purge
src/lib/actions        Server Actions (validation Zod → fonctions SQL sécurisées)
src/lib/payments       Payment Adapter (sandbox, FedaPay) + signature HMAC
supabase/migrations    schéma (31 tables), fonctions métier, RLS, Storage, Realtime
tests/sql|unit|integration|e2e
```

Principe clé : **toute transition sensible** (candidature, acceptation, démarrage, validation, paiement, litige, modération) est une fonction PostgreSQL `SECURITY DEFINER` qui vérifie `auth.uid()`, le rôle et l'état. Les colonnes de statut, de rôle, de badge ou de montant **ne sont pas modifiables** depuis le navigateur (privilèges par colonne).

## Documentation

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Supabase Cloud, Vercel, domaine, e-mails, sauvegardes, maintenance
- [docs/PAYMENTS.md](docs/PAYMENTS.md) — architecture de paiement, FedaPay, webhooks, conformité
- [docs/SECURITY.md](docs/SECURITY.md) — modèle de sécurité et contrôles
- [docs/TESTING.md](docs/TESTING.md) — stratégie et exécution des tests
- [docs/DATABASE.md](docs/DATABASE.md) — schéma, statuts, fonctions

## Données de démonstration

`supabase/seed.sql` (local uniquement, `supabase db reset`) crée des comptes `@demo.joblink.test` et des missions préfixées **[DÉMO]**, mot de passe `Demo!Joblink2026`. Ce fichier n'est jamais appliqué en production.
