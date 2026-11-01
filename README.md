**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)


## PWA (app instalable)

Se puede instalar en el celular o la computadora y abre la interfaz sin conexión.

- **Configuración:** `vite.config.js` (`vite-plugin-pwa`). El manifest y el service worker se generan en `npm run build`.
- **Iconos:** `public/icons/` y `public/apple-touch-icon.png`.
- **Actualizaciones:** al haber versión nueva aparece un aviso con el botón "Actualizar" (`src/components/pwa/PWAManager.jsx`).
- **Instalación:** botón "Instalar app" en el menú lateral. En iPhone/iPad: Safari → Compartir → Añadir a pantalla de inicio.
- **Sin conexión:** solo se guarda la interfaz. Datos y sesión (`/api/`) siempre van a la red; sin red se muestra "No se pudo conectar".
- **Probar en local:** el service worker solo existe en el build: `npm run build && npm run preview`, y revisar DevTools → Application.

## Reportes corporativos

- **Imprimir:** todos los botones "Imprimir" usan el mismo membrete (empresa, título, período, fecha, usuario y pie confidencial con
  número de página) desde `src/lib/corporate.js`.
- **Exportar PDF:** Reporte Diario y Reportes generan un PDF con indicadores, tablas con totales y paginación. La librería se carga solo al exportar.
- **Exportar CSV:** abre bien en Excel (acentos) y neutraliza fórmulas.
- **Personalizar:** el nombre de la empresa y el color están en `CORPORATE` (`src/lib/corporate.js`).
- El permiso "Exportar" de la matriz de roles controla los botones de CSV y PDF.

Ver también [SECURITY.md](SECURITY.md).


## Versión autoalojada (sin Base44)

La carpeta `server/` contiene una API propia (Node + PostgreSQL) y el despliegue con Docker Compose + HTTPS automático.
Empieza por [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md); la arquitectura está en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) y la migración de datos en
[docs/MIGRACION-BASE44.md](docs/MIGRACION-BASE44.md). La interfaz se compila con `VITE_BACKEND=selfhosted`; sin esa variable sigue funcionando con Base44.
