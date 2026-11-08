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
- `fedapay` : [FedaPay](https://docs.fedapay.com) — agrégateur béninois couvrant **MTN Mobile Money**, **Moov Money** et cartes.
- `kkiapay` : à implémenter si choisi (même interface).

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
