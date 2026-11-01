#!/usr/bin/env bash
# Crea .env con contraseñas aleatorias. No sobrescribe un .env existente.
set -euo pipefail
cd "$(dirname "$0")/../.."
[ -e .env ] && { echo ".env ya existe: no se modifica."; exit 0; }
command -v openssl >/dev/null || { echo "Hace falta openssl."; exit 1; }

rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }
umask 077
sed -e "s|^DB_OWNER_PASSWORD=.*|DB_OWNER_PASSWORD=$(rand 40)|" \
    -e "s|^DB_APP_PASSWORD=.*|DB_APP_PASSWORD=$(rand 40)|" \
    -e "s|^BOOTSTRAP_ADMIN_PASSWORD=.*|BOOTSTRAP_ADMIN_PASSWORD=$(rand 20)-Aa1|" \
    .env.example > .env
chmod 600 .env
echo "Listo: se creó .env (permisos 600)."
echo "Revisa SITE_ADDRESS, PUBLIC_URL y BOOTSTRAP_ADMIN_EMAIL, y anota la contraseña del primer administrador:"
grep -E '^(BOOTSTRAP_ADMIN_EMAIL|BOOTSTRAP_ADMIN_PASSWORD)=' .env
