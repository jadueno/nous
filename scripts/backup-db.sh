#!/usr/bin/env bash
#
# backup-db.sh — Backup diario de la base de datos Postgres de Nous.
#
# Qué hace:
#   1. Lanza `pg_dump` DENTRO del contenedor `db` (docker compose exec) para no
#      depender de tener herramientas de Postgres instaladas en el Mac.
#   2. Guarda el dump en formato "custom" (-Fc), comprimido, con fecha en el
#      nombre, en la carpeta backups/ del proyecto (fuera del volumen Docker).
#   3. Aplica retención: borra dumps con más de RETENTION_DAYS días.
#
# Es una operación de SOLO LECTURA sobre la base de datos: no borra ni
# modifica nada del volumen ni de los datos reales.
#
# Uso manual:
#   ./scripts/backup-db.sh
#
# Programación automática: ver scripts/com.nous.dbbackup.plist
# (launchd), instalado con scripts/install-backup-schedule.sh
#
# --- RESTAURAR UN DUMP (referencia rápida) ---
#
# Los dumps se generan con `pg_dump -Fc` (formato "custom"), que se restauran
# con `pg_restore`, NO con `psql < fichero`.
#
# 1. Con el contenedor `db` arriba y la base de datos existente (restaura
#    sobre una BD vacía o usa --clean para sobrescribir):
#
#      gunzip -k backups/nous_YYYY-MM-DD_HHMMSS.dump.gz \
#        && docker compose cp backups/nous_YYYY-MM-DD_HHMMSS.dump db:/tmp/restore.dump \
#        && docker compose exec db pg_restore -U nous -d nous --clean --if-exists /tmp/restore.dump
#
# 2. Para restaurar en una base de datos nueva desde cero, primero crea la BD
#    vacía y luego ejecuta el pg_restore de arriba sin --clean.
#
# Revisa siempre .env en la raíz para confirmar nombre de BD, usuario, etc.
# antes de restaurar.
#
set -euo pipefail

# --- Configuración ---
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
BACKUP_DIR="$PROJECT_DIR/backups"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE_SERVICE="db"

LOG_PREFIX="[backup-db]"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$LOG_PREFIX ERROR: no encuentro $ENV_FILE" >&2
  exit 1
fi

# Cargar variables del .env de la raíz (POSTGRES_DB, POSTGRES_USER, ...)
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

POSTGRES_DB="${POSTGRES_DB:-nous}"
POSTGRES_USER="${POSTGRES_USER:-nous}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
DUMP_FILE="$BACKUP_DIR/${POSTGRES_DB}_${TIMESTAMP}.dump"

echo "$LOG_PREFIX Iniciando backup de '$POSTGRES_DB' -> $DUMP_FILE"

# pg_dump se ejecuta DENTRO del contenedor y el resultado se vuelca a stdout,
# que redirigimos a un fichero en el host. Formato "custom" (-Fc): comprimido
# y compatible con pg_restore, permite restauración selectiva de tablas.
cd "$PROJECT_DIR"
if ! docker compose exec -T "$COMPOSE_SERVICE" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$DUMP_FILE"; then
  echo "$LOG_PREFIX ERROR: pg_dump ha fallado" >&2
  rm -f "$DUMP_FILE"
  exit 1
fi

if [[ ! -s "$DUMP_FILE" ]]; then
  echo "$LOG_PREFIX ERROR: el dump generado está vacío" >&2
  rm -f "$DUMP_FILE"
  exit 1
fi

# Comprimir aún más el dump (pg_dump -Fc ya comprime, gzip añade poco pero
# resulta cómodo y consistente con el nombre .dump.gz documentado arriba).
gzip -f "$DUMP_FILE"

FINAL_FILE="${DUMP_FILE}.gz"
SIZE_HUMAN="$(du -h "$FINAL_FILE" | cut -f1)"
echo "$LOG_PREFIX Backup OK: $FINAL_FILE ($SIZE_HUMAN)"

# --- Retención: borrar dumps más antiguos que RETENTION_DAYS ---
echo "$LOG_PREFIX Aplicando retención de $RETENTION_DAYS días en $BACKUP_DIR"
find "$BACKUP_DIR" -maxdepth 1 -name "${POSTGRES_DB}_*.dump.gz" -mtime "+${RETENTION_DAYS}" -print -delete

echo "$LOG_PREFIX Backups actuales:"
ls -lh "$BACKUP_DIR"/*.dump.gz 2>/dev/null || echo "$LOG_PREFIX (ninguno todavía)"

echo "$LOG_PREFIX Fin."
