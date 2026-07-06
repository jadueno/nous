# Backups de la base de datos

Esta carpeta contiene dumps de Postgres generados por `../scripts/backup-db.sh`.
**Contiene tus notas reales — nunca se sube al repositorio** (está en
`.gitignore`).

## Cómo se generan

- Script: `scripts/backup-db.sh`
- Formato: `pg_dump -Fc` (formato "custom" de Postgres), comprimido después con
  gzip → ficheros `nous_<fecha>_<hora>.dump.gz`
- Programación: `launchd` (ver `scripts/com.nous.dbbackup.plist`),
  se ejecuta una vez al día.
- Retención: se borran automáticamente los dumps con más de 14 días
  (variable `RETENTION_DAYS` en el script).

## Restaurar un dump

Los dumps son formato "custom" de `pg_dump`, así que se restauran con
`pg_restore`, **no** con `psql < fichero`.

1. Descomprime el dump que quieras restaurar:

   ```bash
   gunzip -k backups/nous_2026-07-06_090000.dump.gz
   ```

2. Cópialo dentro del contenedor `db` (debe estar levantado: `docker compose up -d db`):

   ```bash
   docker compose cp backups/nous_2026-07-06_090000.dump db:/tmp/restore.dump
   ```

3. Restaura sobre la base de datos existente. `--clean --if-exists` hace que
   se borren antes las tablas/objetos actuales para dejar la BD como en el
   dump (pisa los datos actuales de la BD, pero el dump que estás restaurando
   no se toca):

   ```bash
   docker compose exec db pg_restore -U nous -d nous --clean --if-exists /tmp/restore.dump
   ```

4. Verifica en la app o con `psql` que los datos son los esperados, y borra
   el fichero temporal dentro del contenedor si quieres:

   ```bash
   docker compose exec db rm -f /tmp/restore.dump
   ```

Para restaurar en una base de datos **nueva/vacía** (por ejemplo, tras perder
el volumen Docker), omite `--clean --if-exists` y asegúrate antes de que la
base de datos y el usuario existen (mismos valores que en `.env` de la raíz:
`POSTGRES_DB`, `POSTGRES_USER`).

## Comprobar el contenido de un dump sin restaurarlo

```bash
docker compose cp backups/<fichero>.dump db:/tmp/check.dump
docker compose exec db pg_restore --list /tmp/check.dump
docker compose exec db rm -f /tmp/check.dump
```
