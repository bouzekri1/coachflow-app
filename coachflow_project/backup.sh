#!/usr/bin/env bash
# Lance le backup CoachFlow et logge le résultat.
# Ajouter au crontab :
#   0 3 * * * /chemin/vers/coachflow_project/backup.sh >> /chemin/vers/coachflow_project/backups/backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "========================================"
echo " CoachFlow Backup — $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# Activer le virtualenv si présent
if [ -f "$SCRIPT_DIR/../venv/bin/activate" ]; then
  source "$SCRIPT_DIR/../venv/bin/activate"
elif [ -f "$SCRIPT_DIR/venv/bin/activate" ]; then
  source "$SCRIPT_DIR/venv/bin/activate"
fi

python manage.py backup_db

echo "Backup terminé — $(date '+%H:%M:%S')"
