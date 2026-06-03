#!/bin/bash
# CoachFlow — provisioning d'un VPS Ubuntu 24.04 (Hetzner CX22 ou équivalent).
# À exécuter UNE FOIS en root après création du VPS :
#   curl -sSL https://raw.githubusercontent.com/<user>/<repo>/main/deploy/setup.sh | bash
# (ou copie-colle ce script via ssh)
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/bouzekri1/coachflow-app.git}"
APP_USER="coachflow"
APP_DIR="/opt/coachflow"

echo "▶ Mise à jour système…"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ufw fail2ban unattended-upgrades

echo "▶ Docker…"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "▶ Pare-feu UFW (22, 80, 443 uniquement)…"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "▶ Auto-updates de sécurité…"
dpkg-reconfigure -plow unattended-upgrades || true

echo "▶ User applicatif '$APP_USER'…"
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$APP_USER"
  usermod -aG docker "$APP_USER"
fi

echo "▶ Clonage du repo dans $APP_DIR…"
if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$APP_DIR"
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
else
  sudo -u "$APP_USER" git -C "$APP_DIR" pull
fi

echo ""
echo "✅ Provisioning terminé."
echo ""
echo "Étapes restantes (manuelles) :"
echo "  1. cp $APP_DIR/coachflow_project/.env.example $APP_DIR/coachflow_project/.env"
echo "     puis éditer toutes les valeurs (SECRET_KEY, DB_PASSWORD, API_DOMAIN, etc.)"
echo "     → générer SECRET_KEY : python3 -c \"import secrets;print(secrets.token_urlsafe(50))\""
echo "  2. Pointer un sous-domaine (ex: api.coachflow.fr) sur l'IP de ce VPS"
echo "  3. Lancer : cd $APP_DIR && docker compose --env-file coachflow_project/.env up -d --build"
echo "  4. Créer un superuser admin :"
echo "     docker compose exec backend python manage.py createsuperuser"
echo "  5. Installer les crons (cf. deploy/crontab.example)"
