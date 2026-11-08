# Déploiement de JOBLINK

Cible : **GitHub → Vercel** (application) + **Supabase Cloud** (données). Région conseillée : Europe de l'Ouest (Paris / Francfort), la plus proche de l'Afrique de l'Ouest parmi les régions disponibles. `vercel.json` fixe la région Vercel à `cdg1` (Paris).

## 1. Projet Supabase

1. Créez un projet sur https://supabase.com (plan Pro recommandé en production : sauvegardes quotidiennes, pas de mise en veille).
2. **Database → Extensions** : PostGIS est activé par la migration 001 (aucune action manuelle normalement).
3. Appliquez les migrations depuis votre poste :
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
   Alternative : copier-coller chaque fichier de `supabase/migrations/` dans le SQL Editor, **dans l'ordre**.
4. **N'exécutez pas** `supabase/seed.sql` en production (données de démonstration).
5. **Project Settings → API** : récupérez `URL`, `anon key` et `service_role key`.

### Authentification (Authentication → Settings)
- *Site URL* : `https://votre-domaine.bj`
- *Redirect URLs* : `https://votre-domaine.bj/auth/confirm` (+ l'URL de préproduction Vercel)
- *Email confirmations* : activé · *Secure password change* : activé
- *Password requirements* : minuscule, majuscule, chiffre, symbole ; longueur minimale 10
- *Rate limits* : laissez les valeurs par défaut ou plus strictes
- *Email Templates* : remplacez « Confirm signup » et « Reset password » par le contenu de `supabase/templates/*.html` (liens `token_hash` compatibles SSR).

### E-mails transactionnels (recommandé)
L'expéditeur par défaut de Supabase est limité à quelques e-mails par heure. Configurez **Resend** :
1. Créez un compte Resend, vérifiez votre domaine (enregistrements DNS SPF/DKIM).
2. Supabase → *Authentication → SMTP Settings* : hôte `smtp.resend.com`, port `465`, utilisateur `resend`, mot de passe = clé API Resend, expéditeur `no-reply@votre-domaine.bj`.
3. Renseignez aussi `RESEND_API_KEY`, `EMAIL_FROM` et `CONTACT_INBOX` dans Vercel (formulaire de contact).

### Premier administrateur
Inscrivez-vous normalement sur le site, confirmez l'e-mail, puis dans le SQL Editor :
```sql
select public.grant_admin('votre-email@exemple.com');
```
La fonction n'est exécutable que par le propriétaire de la base / `service_role` : aucun utilisateur ne peut s'auto-promouvoir.

## 2. Vercel

1. Poussez le dépôt sur GitHub, puis *Add New Project* sur Vercel (framework détecté : Next.js).
2. Variables d'environnement (Production + Preview) : voir `.env.example`.
   - `NEXT_PUBLIC_SITE_URL=https://votre-domaine.bj`
   - `APP_ENV=production` en production (**interdit le mode sandbox**), `staging` en préproduction
   - `SUPABASE_SERVICE_ROLE_KEY` : **non préfixée** `NEXT_PUBLIC_`, jamais exposée au navigateur
   - `CRON_SECRET` : chaîne aléatoire (`openssl rand -hex 32`) — Vercel l'envoie au cron `/api/cron/purge`
3. Déployez. Vérifiez `/admin/settings` → « État de la configuration ».

## 3. Nom de domaine
Vercel → *Settings → Domains* → ajoutez `votre-domaine.bj` et `www.votre-domaine.bj`, configurez les DNS indiqués (A / CNAME). HTTPS est automatique. Mettez ensuite à jour `NEXT_PUBLIC_SITE_URL`, la *Site URL* et les *Redirect URLs* Supabase.

## 4. Paiements et webhooks
Voir [PAYMENTS.md](PAYMENTS.md). URL de webhook à déclarer chez FedaPay :
`https://votre-domaine.bj/api/webhooks/payments/fedapay`

## 5. Sauvegardes
- **Supabase Pro** : sauvegardes quotidiennes automatiques (7 jours) ; activez le *Point-in-Time Recovery* pour une reprise à la seconde.
- Sauvegarde logique supplémentaire hebdomadaire (hors Supabase) :
  ```bash
  pg_dump "$SUPABASE_DB_URL" --no-owner --format=custom -f joblink-$(date +%F).dump
  ```
  Stockez-la chiffrée hors de la plateforme (ex. bucket S3 avec rétention).
- **Storage** : les fichiers ne sont pas inclus dans `pg_dump` ; synchronisez périodiquement les buckets (`supabase storage cp -r`).
- **Testez la restauration** chaque trimestre sur un projet de préproduction.

## 6. Maintenance
| Fréquence | Tâche |
|---|---|
| Quotidien (auto) | Cron `/api/cron/purge` : rate limits expirés, notifications lues > 180 j, webhooks > 400 j |
| Hebdomadaire | Admin : litiges ouverts, signalements, vérifications, versements en attente (`/admin/transactions?payout=pending`) |
| Hebdomadaire | Supabase → *Advisors* (sécurité et performance) |
| Mensuel | `npm outdated` puis mises à jour mineures, `npm audit` ; relancer `npm run check` et `npm run test:e2e` |
| Mensuel | Vérifier les journaux d'activité (`/admin/audit-logs`) et les webhooks en erreur (`/admin/settings`) |
| Trimestriel | Test de restauration de sauvegarde ; rotation des secrets (webhook, cron, service_role si suspicion) |

### Évolutions de schéma
Créez toujours une **nouvelle** migration horodatée dans `supabase/migrations/` (ne modifiez jamais une migration déjà appliquée), testez-la avec `npm run test:db`, puis `supabase db push`. Pensez à accorder explicitement les privilèges aux nouvelles tables/fonctions : les privilèges par défaut sont révoqués (migration 007).

### Internationalisation (anglais)
Tous les textes sont en français dans les composants ; la colonne `profiles.locale` (`fr`/`en`) est prévue. Pour ajouter l'anglais : introduire `next-intl`, extraire les chaînes dans `messages/fr.json` / `en.json`, et traduire `src/lib/errors.ts`.

### Extension à d'autres pays
Activez le pays dans `src/lib/maps/places.ts` (`enabled: true`), ajoutez ses villes, puis vérifiez le prestataire de paiement compatible (XOF pour le Togo, le Niger et le Burkina Faso ; NGN pour le Nigeria nécessitera une colonne de devise multi-valeurs).
