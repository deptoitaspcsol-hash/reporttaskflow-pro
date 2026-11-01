#!/usr/bin/env bash
# Crea (o restablece la contraseña de) un usuario desde la terminal del servidor.
#   ./deploy/scripts/create-admin.sh correo@empresa.com [admin|capturista|visor] ["Nombre"]
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a
docker compose run --rm -e MIGRATE_DATABASE_URL="postgres://${DB_OWNER_USER:-labores_owner}:${DB_OWNER_PASSWORD}@db:5432/${DB_NAME:-labores}" \
  api node scripts/create-user.js "$@"
