#!/usr/bin/env bash
#
# install-backup-schedule.sh — Instala/actualiza el job de launchd que
# ejecuta scripts/backup-db.sh una vez al día (09:00 hora local).
#
# Uso:
#   ./scripts/install-backup-schedule.sh          # instala/actualiza y activa
#   ./scripts/install-backup-schedule.sh --uninstall   # desactiva y elimina
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$PROJECT_DIR/scripts/com.nous.dbbackup.plist"
LABEL="com.nous.dbbackup"
PLIST_DEST="$HOME/Library/LaunchAgents/${LABEL}.plist"
UID_NUM="$(id -u)"

if [[ "${1:-}" == "--uninstall" ]]; then
  echo "Desinstalando job de launchd $LABEL..."
  launchctl bootout "gui/${UID_NUM}" "$PLIST_DEST" 2>/dev/null || true
  rm -f "$PLIST_DEST"
  echo "Hecho. $PLIST_DEST eliminado y job descargado."
  exit 0
fi

if [[ ! -f "$TEMPLATE" ]]; then
  echo "ERROR: no encuentro la plantilla $TEMPLATE" >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

# Sustituir placeholders de la plantilla por rutas absolutas reales
sed -e "s|__PROJECT_DIR__|${PROJECT_DIR}|g" \
    -e "s|__HOME__|${HOME}|g" \
    "$TEMPLATE" > "$PLIST_DEST"

echo "Plist instalado en $PLIST_DEST"

# Descargar la versión anterior si existía, y cargar la nueva
launchctl bootout "gui/${UID_NUM}" "$PLIST_DEST" 2>/dev/null || true
launchctl bootstrap "gui/${UID_NUM}" "$PLIST_DEST"
launchctl enable "gui/${UID_NUM}/${LABEL}"

echo "Job '$LABEL' cargado y activado en launchd."
echo "Se ejecutará todos los días a las 09:00 (hora local)."
echo "Log de ejecución: $PROJECT_DIR/backups/backup.log"
echo ""
echo "Para forzar una ejecución manual ahora mismo:"
echo "  launchctl kickstart -k gui/${UID_NUM}/${LABEL}"
echo ""
echo "Para desinstalar el job:"
echo "  ./scripts/install-backup-schedule.sh --uninstall"
