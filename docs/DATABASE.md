# Base de données

Migrations : `supabase/migrations/` (ordre d'horodatage).

| Fichier | Contenu |
|---|---|
| 001 | Extensions (PostGIS, pgcrypto), types énumérés, `approx_point` |
| 002 | `profiles`, `user_roles`, `worker_profiles`, `categories`, `worker_categories`, `skills`, `worker_skills`, `user_locations`, `platform_settings`, vue `public_profiles` |
| 003 | `jobs` (PostGIS, recherche plein texte française), `job_images`, `applications`, `contracts`, `contract_events`, vue `public_jobs` |
| 004 | `conversations`, `conversation_members`, `messages`, `message_attachments`, `user_blocks`, `notifications`, `payments`, `transactions`, `webhook_events`, `reviews`, `reports`, `disputes`, `favorites`, `verification_requests`, `audit_logs`, `rate_limits`, `contact_messages` |
| 005 | Fonctions métier : inscription, conversations, missions, candidatures, contrats, avis, contacts, notifications, rate limiting, purge |
| 006 | Paiements, recherche géographique, statistiques, actions admin |
| 007 | RLS, privilèges par colonne, droits d'exécution, buckets et politiques Storage, Realtime |
| 008 | Données de référence (catégories, compétences, paramètres) |

## Cycle de vie
```
Mission     draft → published → reviewing → assigned → in_progress → completed (archivée)
                         ↘ cancelled          ↘ disputed → completed | cancelled
Candidature pending → accepted | rejected | withdrawn
Contrat     pending_acceptance → in_progress ⇄ submitted → completed
                   ↘ cancelled              ↘ disputed
Paiement    pending → processing → succeeded → (refunded)   | failed | cancelled
```

## Fonctions appelables (authenticated)
`apply_to_job`, `withdraw_application`, `accept_application`, `reject_application`, `respond_to_contract`, `submit_completion`, `request_changes`, `validate_completion`, `open_dispute`, `cancel_job`, `publish_job`, `submit_review`, `start_conversation`, `mark_conversation_read`, `mark_notifications_read`, `get_contact_info`, `create_payment_intent`, `cancel_payment_intent`, `set_my_location`, `*_dashboard_stats`, `admin_*`, `record_payout`, `log_audit`.
Publiques : `search_jobs`, `nearby_workers`, `public_stats`.
Service role uniquement : `confirm_payment`, `fail_payment`, `attach_payment_reference`, `check_rate_limit`, `purge_expired_data`, `grant_admin`.

## Montants
`bigint` en francs CFA (XOF, sans décimales). `payments` impose `net_amount = amount − commission_amount − provider_fee_amount` par contrainte.

## Conservation
Voir `purge_expired_data()` et la politique de confidentialité. Suppression logique via `deleted_at` (profils, missions).
