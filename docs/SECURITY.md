# Sécurité

## Authentification
- Supabase Auth : mots de passe hachés (bcrypt), confirmation d'e-mail obligatoire, politique de mot de passe (10 car., 4 classes) côté Zod **et** Supabase.
- Sessions par cookies httpOnly (`@supabase/ssr`), rafraîchies dans le middleware ; `getUser()` valide le jeton côté serveur. « Se souvenir de moi » décoché → cookies de session (sans `maxAge`).
- Connexion par e-mail ou téléphone ; message d'erreur générique (pas d'énumération de comptes). Inscription et mot de passe oublié répondent de façon identique que le compte existe ou non.
- Changement de mot de passe → déconnexion des autres sessions.
- Comptes suspendus : refus en base (`is_active_user()`) et redirection `/suspended`.

## Rôles
- Attribués par le trigger SQL `handle_new_user` : seuls `client` / `worker` sont acceptés depuis l'inscription ; toute autre valeur devient `client`.
- `admin` : uniquement via `grant_admin()` (SQL Editor / service_role).
- Table `user_roles` : aucun droit d'écriture pour `anon`/`authenticated`. Les layouts privés vérifient le rôle **en base** (`requireRole`).

## Base de données
- RLS activée sur les 31 tables ; privilèges par défaut révoqués puis accordés **colonne par colonne** (statuts, montants, badges, rôles non modifiables).
- Transitions métier en fonctions `SECURITY DEFINER` avec `search_path` fixé et contrôles `auth.uid()`.
- Vues publiques (`public_jobs`, `public_profiles`) sans e-mail, téléphone, adresse ni coordonnées exactes.
- Positions arrondies (~1 km, `ST_SnapToGrid`) ; adresse exacte visible seulement par le travailleur sous contrat ; présence « à proximité » soumise au consentement (`show_on_map`).
- Coordonnées (e-mail/téléphone) via `get_contact_info` uniquement entre parties d'un contrat.
- 90 tests SQL vérifient ces règles (`npm run test:db`).

## Application
- Validation Zod de toutes les entrées serveur ; requêtes paramétrées (supabase-js/PostgREST) → pas d'injection SQL.
- XSS : rendu React échappé, aucun `dangerouslySetInnerHTML` sauf JSON-LD échappé (`<` → `<`), CSP stricte (`frame-ancestors 'none'`, `object-src 'none'`).
- CSRF : Server Actions protégées nativement par Next.js (contrôle Origin/Host) ; cookies `SameSite=Lax` ; webhooks authentifiés par signature.
- Redirections post-connexion limitées aux chemins internes (`safeNext`).
- Rate limiting partagé (table `rate_limits` via service_role) : inscription, connexion, mot de passe oublié, candidatures, messages, signalements, paiements, recherche publique.
- Fichiers : type MIME et taille contrôlés côté client, serveur et Storage (limites par bucket) ; noms régénérés ; dossiers par propriétaire (politiques Storage) ; buckets privés pour preuves, pièces jointes et pièces d'identité (liens signés courts).
- En-têtes : HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy ; `X-Robots-Tag: noindex` et `Cache-Control: no-store` sur les espaces privés.
- Erreurs : codes métier traduits, jamais de détail technique renvoyé à l'utilisateur.
- `SUPABASE_SERVICE_ROLE_KEY` et secrets uniquement côté serveur (`server-only`).

## Journalisation
`audit_logs` (actions admin, versements, remboursements, attribution admin), `contract_events` (historique de chaque mission), `webhook_events`, `transactions`.

## Signaler une vulnérabilité
security@joblink.bj — merci de ne pas divulguer publiquement avant correction.
