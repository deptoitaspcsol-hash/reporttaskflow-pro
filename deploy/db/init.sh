#!/bin/sh
# Se ejecuta UNA vez, al crear la base por primera vez (docker-entrypoint-initdb.d).
# Crea el rol "app_rw" con el mínimo privilegio para la API. Las tablas las crea el rol propietario
# al migrar, y la migración 002 le otorga a app_rw solo lectura/escritura de datos.
set -eu
: "${APP_DB_PASSWORD:?Falta APP_DB_PASSWORD}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -v app_pw="$APP_DB_PASSWORD" -v dbname="$POSTGRES_DB" <<'SQL'
CREATE ROLE app_rw LOGIN PASSWORD :'app_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
REVOKE ALL ON DATABASE :"dbname" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"dbname" TO app_rw;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_rw;
SQL
echo "[init] rol app_rw creado"
