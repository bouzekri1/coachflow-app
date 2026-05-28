#!/bin/bash
# Lance tout le nécessaire pour tester CoachFlow sur téléphone

set -e
NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use v24.15.0 --silent

FRONTEND_DIR="$(dirname "$0")/coachflow_frontend"
BACKEND_DIR="$(dirname "$0")/coachflow_project"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║      CoachFlow — Mode Mobile         ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Tue les anciens processus ────────────────────────────────────────────
echo "► Nettoyage des anciens processus..."
pkill -f "localtunnel" 2>/dev/null || true
pkill -f "serve -s build" 2>/dev/null || true
sleep 1

# ── 2. Tunnel Django ─────────────────────────────────────────────────────────
echo "► Ouverture du tunnel Django (port 8000)..."
npx --yes localtunnel --port 8000 > /tmp/lt-django.log 2>&1 &
LT_DJANGO_PID=$!
sleep 4

DJANGO_URL=$(grep -o 'https://[^ ]*' /tmp/lt-django.log | head -1)
if [ -z "$DJANGO_URL" ]; then
  echo "✗ Impossible d'obtenir l'URL Django. Django tourne sur le port 8000 ?"
  exit 1
fi
echo "  ✓ Django  → $DJANGO_URL"

# ── 3. Build frontend avec l'URL Django ─────────────────────────────────────
echo ""
echo "► Build du frontend (env API = $DJANGO_URL/api)..."
cd "$FRONTEND_DIR"
REACT_APP_API_URL="$DJANGO_URL/api" npm run build --silent
echo "  ✓ Build terminé"

# ── 4. Serve le build ────────────────────────────────────────────────────────
echo ""
echo "► Démarrage du serveur frontend (port 3001)..."
npx serve -s build -l 3001 > /tmp/serve.log 2>&1 &
sleep 3

# ── 5. Tunnel frontend ───────────────────────────────────────────────────────
echo "► Ouverture du tunnel frontend (port 3001)..."
npx localtunnel --port 3001 > /tmp/lt-frontend.log 2>&1 &
LT_FRONT_PID=$!
sleep 4

FRONTEND_URL=$(grep -o 'https://[^ ]*' /tmp/lt-frontend.log | head -1)
if [ -z "$FRONTEND_URL" ]; then
  echo "✗ Impossible d'obtenir l'URL frontend."
  exit 1
fi
echo "  ✓ Frontend → $FRONTEND_URL"

# ── Résumé ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ CoachFlow Mobile prêt !                      ║"
echo "╠══════════════════════════════════════════════════╣"
printf  "║  📱 Ouvre sur ton téléphone :                    ║\n"
printf  "║  %-48s║\n" "$FRONTEND_URL"
echo "╠══════════════════════════════════════════════════╣"
echo "║  💡 Assure-toi que Django tourne (port 8000)     ║"
echo "║  💡 Téléphone sur le même WiFi ou via 4G         ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Ctrl+C pour tout arrêter"
echo ""

# ── Garde le script actif ────────────────────────────────────────────────────
trap "echo ''; echo 'Arrêt...'; pkill -f localtunnel 2>/dev/null; pkill -f 'serve -s build' 2>/dev/null; exit 0" INT
wait
