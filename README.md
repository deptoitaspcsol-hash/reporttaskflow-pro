# Control de Labores (TaskFlow Pro)

Aplicación web instalable (PWA) para controlar labores, asistencia, tareas, cierres de pago y reportes corporativos de cuadrillas de trabajo.
Corre en un servidor propio con Docker: interfaz React, API Node + Fastify y base de datos PostgreSQL.

| Carpeta | Contenido |
|---|---|
| `src/` | Interfaz (React, Vite, Tailwind) y cliente de la API (`src/api/client.js`) |
| `server/` | API: sesiones, permisos por rol, validación, archivos, auditoría; esquemas de las entidades; pruebas |
| `deploy/` | Caddy (HTTPS y cabeceras), inicialización de la base de datos, respaldo, restauración y secretos |
| `docs/` | Arquitectura, despliegue y migración de datos |
| `docker-compose.yml`, `Dockerfile.web` | Despliegue completo: `db`, `migrate`, `api`, `web` |

## Empezar

**En un servidor (producción):** sigue [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

```bash
./deploy/scripts/gen-secrets.sh     # crea .env con contraseñas aleatorias
nano .env                           # dominio, correo del primer administrador, SMTP
docker compose up -d --build
```

**En tu equipo (desarrollo):** necesitas Node 22 y un PostgreSQL local (ver [server/README.md](server/README.md)).

```bash
cd server && npm install && AUTO_MIGRATE=true node src/index.js   # API en :3000 (variables en docs/DESPLIEGUE.md, sección 8)
cd .. && npm install && npm run dev                               # interfaz en :5173, reenvía /api a :3000
```

Comandos útiles: `npm run lint`, `npm run build` (interfaz) y, en `server/`, `npm test` (50 pruebas contra PostgreSQL real).

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md) · [Despliegue](docs/DESPLIEGUE.md) · [Migración de datos desde Base44](docs/MIGRACION-BASE44.md) · [Seguridad](SECURITY.md)

## PWA

Se puede instalar en el celular o la computadora y abre la interfaz sin conexión.

- **Configuración:** `vite.config.js` (`vite-plugin-pwa`). El manifest y el service worker se generan en `npm run build`.
- **Iconos:** `public/icons/` y `public/apple-touch-icon.png`.
- **Actualizaciones:** al haber versión nueva aparece un aviso con el botón «Actualizar» (`src/components/pwa/PWAManager.jsx`).
- **Instalación:** botón «Instalar app» en el menú lateral. En iPhone/iPad: Safari → Compartir → Añadir a pantalla de inicio.
- **Sin conexión:** solo se guarda la interfaz. Datos y sesión (`/api/`) siempre van a la red; sin red se muestra «No se pudo conectar».
- **Probar en local:** el service worker solo existe en el build: `npm run build && npm run preview`, y revisar DevTools → Application.

## Reportes corporativos

- **Imprimir:** todos los botones «Imprimir» usan el mismo membrete (empresa, título, período, fecha, usuario y pie confidencial con número de página) desde `src/lib/corporate.js`.
- **Exportar PDF:** Reporte Diario y Reportes generan un PDF con indicadores, tablas con totales y paginación. La librería se carga solo al exportar.
- **Exportar CSV:** abre bien en Excel (acentos) y neutraliza fórmulas.
- **Personalizar:** el nombre de la empresa y el color están en `CORPORATE` (`src/lib/corporate.js`).
- El permiso «Exportar» de la matriz de roles controla los botones de CSV y PDF.
