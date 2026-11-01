# API de Control de Labores

Node 22 + Fastify + PostgreSQL. Documentación general en `../docs/`.

```
src/app.js          construcción de la aplicación (CSRF, sesiones, errores)
src/routes/         auth · entities · files
src/policy.js       permisos por rol (matriz de "Roles y Permisos")
src/schemas.js      carga schemas/*.json → validación
schemas/            una definición por entidad (campos, índices, únicos, política, campos sensibles)
migrations/         SQL numerado (001 tablas, 002 permisos del rol limitado)
scripts/            create-user.js · import-records.js
test/               50 pruebas contra PostgreSQL real
```

## Pruebas

Necesitan un PostgreSQL con un rol propietario con `CREATEDB` y el rol `app_rw` (el que usa la API en producción). Con Docker:

```bash
docker run -d --name labores-pg-test -p 54329:5432 -e POSTGRES_USER=labores_owner -e POSTGRES_PASSWORD=owner_pw postgres:16-alpine
docker exec -i labores-pg-test psql -U labores_owner -c "CREATE ROLE app_rw LOGIN PASSWORD 'app_pw'"
npm install && npm test
```

Cada archivo de prueba crea y borra su propia base de datos. Para usar otra instancia: `TEST_PG_ADMIN_URL=postgres://...`
(y ajusta los puertos en `test/helpers.js`).

## Cómo agregar o cambiar una entidad

1. Crea o edita `schemas/<Entidad>.json` (campos con `t`: `s` texto, `n` número, `d` fecha, `a` lista, `o` objeto; `req`, `max`, `min`, `enum`).
2. Define su `policy` (módulos de la matriz o `@any`, `@writer`, `@deleter`, `@admin`, `@never`) y, si guarda datos personales, `sensitive`.
3. `docker compose up -d --build` (o `npm run migrate`): crea los índices e índices únicos declarados.
