# Paiements

## Principe
1. Le client publie une mission avec un budget (FCFA).
2. Un travailleur est retenu ; le **montant convenu** est figé dans `contracts.agreed_amount` (budget ou prix proposé accepté).
3. Le travailleur réalise la mission et soumet une preuve ; le client **valide**.
4. Le client paie : `create_payment_intent` (SQL) calcule tout côté serveur — **le montant envoyé par le navigateur n'est jamais utilisé**.
5. Le prestataire de paiement notifie le résultat par **webhook signé** → `confirm_payment` (SQL, `service_role`) écrit atomiquement le paiement, le reçu et les écritures (`transactions` : charge, commission, frais, versement).
6. L'administrateur déclenche le **versement** du montant net au travailleur (API du prestataire ou versement manuel tracé).

```
Commission  = round(montant × 0,05)
Net         = montant − commission − frais du prestataire (affichés avant paiement)
Exemple     : 10 000 FCFA → 500 de commission → 9 500 FCFA nets avant frais externes
```

## Garanties techniques
| Exigence | Mise en œuvre |
|---|---|
| Idempotence | `payments.idempotency_key` unique ; clé stable côté client par session ; `webhook_events (provider, event_id)` unique |
| Anti double paiement | index unique partiel : un seul paiement `pending/processing/succeeded` par contrat |
| Signatures | HMAC-SHA256 `t=…,s=…` (format FedaPay, vérifié dans le SDK officiel), comparaison en temps constant, tolérance 5 min |
| Jamais de faux succès | aucun chemin ne marque un paiement réussi sans webhook signé ou vérification API authentifiée ; sandbox interdit si `APP_ENV=production` |
| Paiements échoués | `fail_payment` → statut `failed`, notification, nouvelle tentative possible |
| Remboursements | `admin_refund_payment` (après remboursement effectif chez le prestataire), écritures inversées |
| Litiges | `open_dispute` bloque la mission ; versement impossible tant que le litige n'est pas résolu |
| Reçus | numéro `JL-AAAAMMJJ-XXXXXXXX`, page imprimable `/client/payments/[id]` |
| Journal | `transactions` (append-only), `contract_events`, `audit_logs` |

## Payment Adapter
`src/lib/payments/types.ts` définit l'interface : `createCheckout`, `parseWebhook` (vérifie la signature), `fetchStatus`, `createPayout`. Ajouter un prestataire = un fichier dans `src/lib/payments/adapters/` + une ligne dans `registry.ts`. Le reste de l'application ne change pas.

- `sandbox` : simulateur `/payments/sandbox/[id]` qui émet un vrai webhook signé (même chaîne de traitement).
- `saspay` : [SasPay](https://docs.saspay.me) — API unique couvrant **MTN MoMo**, **Moov Money** et **Celtiis Cash** au Bénin (et le Togo, le Niger, le Burkina Faso, le Nigeria…). **Prestataire recommandé.**
- `fedapay` : [FedaPay](https://docs.fedapay.com) — agrégateur béninois couvrant **MTN Mobile Money**, **Moov Money** et cartes.
- `kkiapay` : à implémenter si choisi (même interface).

## Mise en service avec SasPay
Le client est redirigé vers la page de paiement hébergée par SasPay (`POST /checkout-sessions/`) : il y choisit MTN, Moov ou Celtiis et valide sur son téléphone. Aucune donnée de paiement ne passe par JOBLINK.

1. Créez le compte sur [app.saspay.me](https://app.saspay.me), vérifiez l'e-mail, complétez le KYC et créez le marchand.
2. *Développeur* → générez une clé **`sk_test_…`** (scope `PAYIN` ou `BOTH`). La clé `sk_live_…` viendra après les tests.
3. *Webhooks* → nouveau point de réception :
   - URL : `https://joblink-benin.vercel.app/api/webhooks/payments/saspay`
   - événements : `transaction.success` (et `transaction.failed`, facultatif)
   - **copiez le `signing_secret` tout de suite** : SasPay ne l'affiche qu'une fois.
4. Vercel → *Settings → Environment Variables* (Production), puis redéployez :
   | Variable | Valeur |
   |---|---|
   | `PAYMENT_PROVIDER` | `saspay` |
   | `SASPAY_ENVIRONMENT` | `sandbox` (tests) puis `live` |
   | `SASPAY_SECRET_KEY` | `sk_test_…` puis `sk_live_…` |
   | `SASPAY_WEBHOOK_SECRET` | le `signing_secret` du webhook |
   | `SASPAY_PAYOUTS_ENABLED` | `false` (voir *Versements* ci-dessous) |
5. `/admin/joblink` → *Paiements Mobile Money* doit afficher « SasPay en mode test ». Sinon, la clé ne correspond pas à l'environnement.
6. Testez une mission complète (numéros de test SasPay : dernier chiffre `0` = succès, `2` = solde insuffisant, `9` = reste en attente). Depuis le tableau de bord SasPay, envoyez aussi l'événement `webhook.test` : il doit apparaître comme reçu et ignoré.
7. Passez en réel : `SASPAY_ENVIRONMENT=live` **et** `SASPAY_SECRET_KEY=sk_live_…` (et le secret du webhook *live*), puis un premier paiement de faible montant (minimum 200 FCFA).

**Garde-fou clé ↔ environnement.** Chez SasPay, l'environnement dépend de l'hôte appelé, pas de la clé : une requête envoyée à `api.saspay.me` est réelle même avec une clé de test. JOBLINK refuse donc d'activer le paiement si la clé ne commence pas par `sk_test_` en `sandbox` ou par `sk_live_` en `live`.

**Rapprochement.** Le webhook SasPay décrit la *transaction*, pas la session. JOBLINK vérifie la signature (`X-Webhook-Signature`, HMAC-SHA256 de `horodatage.corps`, 5 min de tolérance), relit la transaction par l'API authentifiée (`GET /payments/{id}/verify/`), exige `SUCCESS` en XOF, puis retrouve le paiement grâce à la référence `JL:<identifiant>` placée dans la description de la session. Les frais réels (montant demandé − montant net) remplacent l'estimation. Une tentative échouée ne fait pas échouer le paiement : le client peut réessayer sur la même page. La session expire au bout de 24 h ; au retour du client, la vérification `GET /checkout-sessions/{id}/status/` fait échouer un paiement expiré ou annulé pour permettre une nouvelle tentative.

**Versements automatiques (relais à IP fixe).** Voir [`relay/README.md`](../relay/README.md) : un mini-serveur installé en une commande sur un VPS à IP fixe exécute les versements, sur demande signée de JOBLINK (HMAC avec la clé SasPay, déjà présente des deux côtés). Une fois l'IP du VPS déclarée chez SasPay et `SASPAY_PAYOUT_RELAY_URL` + `SASPAY_PAYOUTS_ENABLED=true` renseignées dans Vercel, le bouton **« Verser automatiquement »** apparaît dans `/admin/joblink` → Paiements → À verser.

**Versements aux travailleurs (historique).** `POST /payouts/initialize/` exige que l'**adresse IP du serveur soit whitelistée** chez SasPay. Sur Vercel, les fonctions n'ont pas d'IP fixe (sauf option *Static IPs*). Par défaut (`SASPAY_PAYOUTS_ENABLED=false`), versez depuis le tableau de bord SasPay puis enregistrez la référence dans l'admin (« versement manuel »). Si vous disposez d'une IP fixe whitelistée, `SASPAY_PAYOUTS_ENABLED=true` active le versement automatique : opérateur déduit du préfixe (MTN, Moov, Celtiis ; préfixe incertain → versement manuel), clé d'idempotence unique par paiement pour empêcher tout double versement.

## Mise en production avec FedaPay
1. Ouvrez un compte marchand FedaPay et complétez la vérification (KYC entreprise). Demandez l'activation des **reversements (payouts)**.
2. Tableau de bord FedaPay → *Webhooks* → URL `https://votre-domaine.bj/api/webhooks/payments/fedapay`, événements `transaction.approved`, `transaction.declined`, `transaction.canceled`. Copiez le secret de signature.
3. Vercel : `PAYMENT_PROVIDER=fedapay`, `FEDAPAY_ENVIRONMENT=sandbox` (tests) puis `live`, `FEDAPAY_SECRET_KEY`, `FEDAPAY_WEBHOOK_SECRET`.
4. Renseignez le taux de frais estimé dans `/admin/settings` → `payments.provider_fee_rate` (ex. `0.015`) pour l'affichage avant paiement ; les frais réels renvoyés par le webhook remplacent l'estimation.
5. Faites un paiement réel de faible montant et vérifiez : webhook reçu (`/admin/settings`), reçu, écritures, versement.

## Conformité — à valider avant le lancement
Le modèle « le client paie JOBLINK puis JOBLINK reverse au travailleur » revient à **encaisser des fonds pour le compte de tiers**. Dans l'UEMOA, cette activité relève de la réglementation de la BCEAO sur les services de paiement et la monnaie électronique. JOBLINK **ne prétend pas** offrir de séquestre :
- s'appuyer sur un prestataire agréé (FedaPay ou autre) dont l'offre couvre explicitement la collecte et le reversement pour une place de marché ;
- faire valider le montage par un juriste (et la déclaration des traitements de données par l'APDP) ;
- en attendant, le paiement intervient uniquement **après** validation du travail (pas de fonds conservés en amont).
