#!/usr/bin/env bash
# Installation du relais de versements JOBLINK sur un serveur Ubuntu 22.04 / 24.04 (VPS à IP fixe).
# Usage (en root) :
#   curl -fsSL https://raw.githubusercontent.com/smithfifame-tech/joblink/main/relay/install.sh | sudo bash
# Le script demande la clé SasPay (saisie masquée), installe Node.js + Caddy (HTTPS automatique),
# démarre le relais au démarrage du serveur et affiche l'IP à déclarer chez SasPay et l'URL à donner à JOBLINK.
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/smithfifame-tech/joblink/main/relay"
APP_DIR=/opt/joblink-relay
ENV_FILE=/etc/joblink-relay.env

if [ "$(id -u)" -ne 0 ]; then echo "Lancez ce script en root (sudo)." >&2; exit 1; fi

echo "==> Paquets système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg ufw debian-keyring debian-archive-keyring apt-transport-https >/dev/null

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "==> Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi

if ! command -v caddy >/dev/null; then
  echo "==> Caddy (certificat HTTPS automatique)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi

echo "==> Relais"
id joblink >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin joblink
mkdir -p "$APP_DIR"
curl -fsSL "$REPO_RAW/server.mjs" -o "$APP_DIR/server.mjs"
chown -R root:root "$APP_DIR" && chmod 755 "$APP_DIR" && chmod 644 "$APP_DIR/server.mjs"

if [ ! -s "$ENV_FILE" ]; then
  echo
  echo "Collez votre clé API SasPay (elle commence par sk_live_), puis Entrée."
  echo "(Rien ne s'affiche pendant la saisie : c'est normal.)"
  read -r -s SASPAY_KEY < /dev/tty
  echo
  case "$SASPAY_KEY" in sk_live_*) SASPAY_ENV=live ;; sk_test_*) SASPAY_ENV=sandbox ;; *) echo "Clé invalide (sk_live_… attendu)." >&2; exit 1 ;; esac
  umask 077
  printf 'SASPAY_SECRET_KEY=%s\nSASPAY_ENVIRONMENT=%s\nRELAY_PORT=8787\nRELAY_MAX_AMOUNT=500000\n' "$SASPAY_KEY" "$SASPAY_ENV" > "$ENV_FILE"
  chown root:joblink "$ENV_FILE" && chmod 640 "$ENV_FILE"
  unset SASPAY_KEY
fi

cat > /etc/systemd/system/joblink-relay.service <<'UNIT'
[Unit]
Description=Relais de versements JOBLINK -> SasPay
After=network-online.target
Wants=network-online.target

[Service]
User=joblink
EnvironmentFile=/etc/joblink-relay.env
ExecStart=/usr/bin/node /opt/joblink-relay/server.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT

IP=$(curl -4 -fsS https://api.ipify.org)
HOST="$(echo "$IP" | tr . -).sslip.io"
cat > /etc/caddy/Caddyfile <<CADDY
$HOST {
  reverse_proxy 127.0.0.1:8787
}
CADDY

echo "==> Pare-feu (SSH, HTTP, HTTPS)"
ufw allow OpenSSH >/dev/null && ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null && ufw --force enable >/dev/null

systemctl daemon-reload
systemctl enable --now joblink-relay >/dev/null
systemctl restart caddy

echo "==> Vérification"
for i in $(seq 1 20); do
  if curl -fsS "https://$HOST/health" >/dev/null 2>&1; then break; fi
  sleep 3
done
curl -fsS "https://$HOST/health" && echo

cat <<DONE

============================================================
 Relais JOBLINK installé.

 1) IP à déclarer chez SasPay (Développeur > IP Whitelist) :
      $IP
 2) Adresse du relais à donner à JOBLINK :
      https://$HOST
============================================================
DONE
