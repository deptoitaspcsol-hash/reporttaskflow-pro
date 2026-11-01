# Guía de despliegue en un servidor Linux con Docker

## 1. Requisitos

- Linux x86-64 o ARM64 (Ubuntu 22.04/24.04 o Debian 12 recomendados), **2 vCPU, 2 GB de RAM, 20 GB de disco** (más según tus archivos adjuntos).
- Docker Engine 24 o superior y el plugin **Docker Compose v2** (`docker compose version`).
- Un **nombre** para el sistema, por ejemplo `labores.tuempresa.com` (público) o `labores.empresa.local` (solo red interna).
- Puertos 80 y 443 libres (80 solo se usa para el certificado y para redirigir a HTTPS).
- Opcional: una cuenta SMTP para enviar invitaciones y restablecer contraseñas.

## 2. Instalar

```bash
git clone https://github.com/deptoitaspcsol-hash/reporttaskflow-pro.git /opt/labores
cd /opt/labores
git checkout selfhosted/backend-docker      # o la rama principal cuando se integre
./deploy/scripts/gen-secrets.sh             # crea .env con contraseñas aleatorias y muestra la del primer administrador
nano .env                                   # SITE_ADDRESS, PUBLIC_URL, TLS_DIRECTIVE, BOOTSTRAP_ADMIN_EMAIL, SMTP_URL
docker compose up -d --build
docker compose ps                           # todos "healthy"/"running"; "migrate" aparece como "exited (0)": es lo normal
```

Abre `PUBLIC_URL`, entra con `BOOTSTRAP_ADMIN_EMAIL` y la contraseña que mostró `gen-secrets.sh`, y **borra `BOOTSTRAP_ADMIN_PASSWORD` de `.env`**
(`docker compose up -d` para aplicarlo). Después crea a los demás usuarios desde *Usuarios → Agregar Usuario*.

Si perdiste el acceso: `./deploy/scripts/create-admin.sh correo@empresa.com admin` (pide una contraseña nueva).

## 3. Certificado HTTPS

**Con dominio público** (recomendado si los usuarios entran desde campo por internet): apunta el DNS al servidor, deja `TLS_DIRECTIVE=` vacío y
`SITE_ADDRESS=labores.tuempresa.com`. Caddy obtiene y renueva el certificado de Let's Encrypt solo.

**Solo red interna**: deja `TLS_DIRECTIVE=tls internal`. Caddy usa su propia autoridad certificadora y los equipos deben **confiar en ella**,
si no el navegador mostrará advertencia y la PWA no se podrá instalar:

```bash
docker compose cp web:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
```

Instala `caddy-root.crt` como autoridad raíz de confianza en cada equipo (en Windows con una directiva de grupo; en Android/iOS desde Ajustes → Seguridad).
Necesitas además que el nombre resuelva en tu red (DNS interno o el archivo `hosts`).

## 4. Cortafuegos

Solo deben estar abiertos 80/tcp, 443/tcp y 443/udp (HTTP/3), y SSH desde tus equipos. La base de datos **no** publica ningún puerto. Ejemplo con ufw:

```bash
sudo ufw default deny incoming && sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw allow 443/udp && sudo ufw enable
```

> Docker publica puertos saltándose ufw. Como solo `web` publica puertos, es seguro; no agregues `ports:` a `db` ni a `api`.

## 5. Respaldos (obligatorio)

```bash
./deploy/scripts/backup.sh /var/backups/labores      # base de datos (pg_dump) + archivos subidos
```

Programa uno diario con systemd:

```bash
sudo cp deploy/systemd/labores-backup.* /etc/systemd/system/
sudo systemctl enable --now labores-backup.timer
```

**Copia esos respaldos fuera del servidor** (otro equipo, nube o disco externo). Un respaldo que vive solo en el mismo disco no protege de un fallo del disco.
Prueba la restauración al menos una vez: `./deploy/scripts/restore.sh backups/db-….dump backups/uploads-….tar.gz` (reemplaza todo; pide confirmación).

## 6. Actualizar

```bash
cd /opt/labores && ./deploy/scripts/backup.sh && git pull && docker compose up -d --build
```

Las migraciones corren solas (servicio `migrate`) antes de levantar la API. Las imágenes base (`postgres`, `node`, `caddy`) se actualizan con
`docker compose pull && docker compose up -d --build`; hazlo al menos cada mes para recibir parches de seguridad.

## 7. Ver qué pasa

```bash
docker compose logs -f api          # eventos de la API
docker compose logs web             # accesos y certificados
docker compose exec db psql -U labores_owner -d labores -c "SELECT at, actor_email, action, entity FROM audit_log ORDER BY id DESC LIMIT 20"
```

| Síntoma | Causa probable |
|---|---|
| `web` no arranca / sin certificado | El nombre no resuelve al servidor o los puertos 80/443 están bloqueados |
| Aviso de certificado no confiable | Falta instalar la CA de Caddy en ese equipo (sección 3) |
| `api` se reinicia | Revisa `docker compose logs api`: suele ser `PUBLIC_URL` sin `https://` o una contraseña de BD distinta a la de la primera vez |
| "Origen no permitido" al entrar | `PUBLIC_URL` no coincide exactamente con la dirección que escribe el usuario |
| No llegan correos | `SMTP_URL` vacío o incorrecto; mientras tanto el administrador recibe el enlace de invitación en pantalla (se copia al portapapeles) |

## 8. Desarrollo local sin Docker

```bash
# 1) PostgreSQL local con los roles de prueba (ver server/README.md)
# 2) API
cd server && npm install
DATABASE_URL=postgres://app_rw:app_pw@127.0.0.1:5432/labores MIGRATE_DATABASE_URL=postgres://labores_owner:owner_pw@127.0.0.1:5432/labores \
  AUTO_MIGRATE=true PUBLIC_URL=http://localhost:5173 BOOTSTRAP_ADMIN_EMAIL=admin@x.com BOOTSTRAP_ADMIN_PASSWORD='Clave-De-Prueba-123' \
  UPLOAD_DIR=/tmp/labores-uploads node src/index.js
# 3) Interfaz (en otra terminal, en la raíz del repositorio): reenvía /api a localhost:3000
npm run dev
```
