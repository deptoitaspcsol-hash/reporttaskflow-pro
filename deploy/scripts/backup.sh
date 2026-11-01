#!/usr/bin/env bash
# Respaldo completo: base de datos (pg_dump) + archivos subidos. Ejecutar desde cualquier carpeta.
#   ./deploy/scripts/backup.sh [carpeta_destino]     (por defecto ./backups)
# Variables: KEEP_DAYS (por defecto 14) = días que se conservan los respaldos.
set -euo pipefail
cd "$(dirname "$0")/../.."
DEST="${1:-./backups}"; KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"; umask 077

set -a; . ./.env; set +a
echo "[backup] base de datos..."
docker compose exec -T db pg_dump -U "${DB_OWNER_USER:-labores_owner}" -d "${DB_NAME:-labores}" -Fc > "$DEST/db-$STAMP.dump"

echo "[backup] archivos subidos..."
docker compose run --rm --no-deps -T --entrypoint tar api -C /data -czf - uploads 2>/dev/null > "$DEST/uploads-$STAMP.tar.gz" \
  || docker run --rm -v labores_uploads:/data:ro alpine tar -C /data -czf - . > "$DEST/uploads-$STAMP.tar.gz"

# Verificación mínima: los archivos no están vacíos y el volcado es legible.
[ -s "$DEST/db-$STAMP.dump" ] || { echo "El respaldo de la base está vacío"; exit 1; }
docker compose exec -T db pg_restore -l < "$DEST/db-$STAMP.dump" >/dev/null

find "$DEST" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete
echo "[backup] listo: $DEST/db-$STAMP.dump y uploads-$STAMP.tar.gz"
echo "Guarda una copia FUERA de este servidor (otro equipo, nube o disco externo)."
