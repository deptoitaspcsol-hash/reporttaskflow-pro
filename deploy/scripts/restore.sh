#!/usr/bin/env bash
# Restaura un respaldo. ¡Reemplaza TODOS los datos actuales!
#   ./deploy/scripts/restore.sh backups/db-AAAAMMDD-HHMMSS.dump [backups/uploads-AAAAMMDD-HHMMSS.tar.gz]
set -euo pipefail
cd "$(dirname "$0")/../.."
DUMP="${1:?Indica el archivo .dump}"; UPLOADS="${2:-}"
[ -f "$DUMP" ] || { echo "No existe $DUMP"; exit 1; }
set -a; . ./.env; set +a
echo "ATENCIÓN: esto reemplaza todos los datos actuales por los del respaldo."
read -r -p "Escribe RESTAURAR para continuar: " ok; [ "$ok" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }

docker compose stop api web
docker compose exec -T db psql -U "${DB_OWNER_USER:-labores_owner}" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS ${DB_NAME:-labores} WITH (FORCE)" -c "CREATE DATABASE ${DB_NAME:-labores}"
docker compose exec -T db pg_restore -U "${DB_OWNER_USER:-labores_owner}" -d "${DB_NAME:-labores}" --no-owner --role="${DB_OWNER_USER:-labores_owner}" < "$DUMP"
if [ -n "$UPLOADS" ]; then
  docker run --rm -i -v labores_uploads:/data alpine sh -c 'rm -rf /data/* && tar -xzf - -C /data --strip-components=1' < "$UPLOADS"
fi
docker compose run --rm migrate          # vuelve a otorgar permisos a app_rw sobre el esquema restaurado
docker compose up -d
echo "[restore] listo."
