# Relais de versements JOBLINK → SasPay

SasPay n'accepte les versements (payouts) que depuis une **adresse IP déclarée**. Vercel n'ayant pas d'IP de sortie fixe sur l'offre gratuite, ce mini-serveur — installé sur un VPS à IP fixe — exécute les versements pour JOBLINK.

## Installation (10 minutes)
1. Louez un petit VPS **Ubuntu 22.04 ou 24.04** (1 vCPU / 1 Go suffit ; ex. Hetzner CX22, Contabo, DigitalOcean, ou Oracle Cloud « Always Free »).
2. Connectez-vous en SSH puis lancez :
   ```bash
   curl -fsSL https://raw.githubusercontent.com/smithfifame-tech/joblink/main/relay/install.sh | sudo bash
   ```
   Collez la clé SasPay `sk_live_…` quand elle est demandée (saisie masquée).
3. Le script affiche **l'IP** et **l'adresse du relais** :
   - SasPay → *Développeur* → *IP Whitelist* → ajoutez l'IP ;
   - Vercel → variable `SASPAY_PAYOUT_RELAY_URL` = l'adresse du relais, et `SASPAY_PAYOUTS_ENABLED=true` ; redéployez.

## Sécurité
- Requêtes de JOBLINK signées (HMAC-SHA256 avec la clé SasPay, déjà présente des deux côtés), tolérance 5 min, anti-rejeu.
- Seuls des versements XOF vers MTN / Moov / Celtiis Bénin, plafonnés à 500 000 FCFA (`RELAY_MAX_AMOUNT`).
- Clé d'idempotence par paiement : jamais de double versement.
- Clé SasPay stockée dans `/etc/joblink-relay.env` (lisible par root et le service uniquement), jamais journalisée.

## Exploitation
```bash
systemctl status joblink-relay      # état
journalctl -u joblink-relay -f      # journal (montants et réseaux, jamais la clé)
```
Changer la clé SasPay : éditez `/etc/joblink-relay.env` puis `systemctl restart joblink-relay`.
