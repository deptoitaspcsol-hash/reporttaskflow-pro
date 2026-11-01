# Seguridad

Los permisos, la validación y la auditoría se aplican **en el servidor** (`server/`); la interfaz solo los refleja. Los controles de la
tabla están verificados con 50 pruebas automáticas contra PostgreSQL real y comprobaciones en navegador.

| Riesgo | Cómo se controla |
|---|---|
| Alguien llama a la API saltándose la pantalla | Cada petición exige sesión y permiso por entidad y acción (matriz de roles, también para roles personalizados) |
| Escalada de privilegios (un usuario se hace admin) | Solo un admin puede cambiar `role` o `blocked`; no puede cambiar su propio rol, bloquearse ni dejar el sistema sin administrador; el rol debe existir |
| Robo de contraseñas en la base de datos | scrypt (N=2^15) con sal por usuario; nunca se devuelven hashes por la API |
| Robo de la sesión | Cookie `__Host-` HttpOnly, Secure, SameSite=Strict; en la base solo la huella SHA-256 del token; el cierre de sesión y el bloqueo la invalidan al instante; caducidad de 7 días deslizante y 30 absolutos |
| Fuerza bruta | 10 intentos/min por IP, bloqueo de la cuenta 15 min tras 5 fallos, mismo mensaje y mismo tiempo exista o no el correo |
| CSRF | Encabezado propio obligatorio en peticiones que modifican datos + verificación de `Origin` + SameSite=Strict |
| Inyección SQL | Consultas parametrizadas; los campos de filtro y orden se validan contra el esquema (probado con cargas maliciosas) |
| Datos inválidos | Validación por esquema (tipos, rangos, enums, fechas), límites de tamaño, unicidad aplicada con índices |
| Datos personales (cédula, teléfono, salario) | Se ocultan en el servidor a roles sin permiso sobre Trabajadores |
| Archivos peligrosos | Lista blanca por extensión **y** firma del contenido; sin SVG/HTML; privados (requieren sesión); servidos con `nosniff` y CSP `sandbox`; PDF/Office solo como descarga; tope de 10 MB |
| Manipulación de la bitácora | `audit_log` e `Historial` son de solo agregar, por trigger en la base de datos |
| Compromiso de la API → base de datos | La API usa el rol `app_rw`: sin DDL (no puede borrar ni alterar tablas) y sin UPDATE/DELETE sobre la auditoría |
| XSS | CSP estricta (`script-src 'self'`) verificada en navegador real, React escapa el contenido, impresión desde iframe sin scripts |
| CSV con fórmulas | Las exportaciones neutralizan `=`, `+`, `-`, `@`; las cargas masivas limitan tamaño (2 MB) y filas (1000) |
| Exposición de servicios | Solo Caddy publica puertos; la base de datos está en una red interna; contenedores sin root, de solo lectura y sin capacidades |
| Interfaz | El menú oculta lo que el rol no puede ver y las rutas sin permiso muestran «Acceso restringido»; esto es comodidad, no seguridad: manda el servidor |

## Lo que sigue siendo responsabilidad de TI

- Mantener actualizados el sistema operativo y las imágenes (`docker compose pull && docker compose up -d --build`, al menos mensual).
- **Respaldos fuera del servidor** y probar la restauración (`docs/DESPLIEGUE.md`).
- Proteger el archivo `.env` (permisos 600, no subirlo a Git) y el acceso SSH al servidor (llaves, sin contraseña).
- Revisar periódicamente la lista de usuarios y bloquear a quien ya no trabaja en la empresa.

## Pendientes conocidos

- **Sin verificación en dos pasos (2FA).** Si el acceso es desde internet, considera ponerlo detrás de una VPN (WireGuard/Tailscale).
- **Sin auditoría externa ni pruebas de carga.** Conviene una revisión independiente antes de exponerlo a internet con datos reales.
- `react-router-dom` 6.x tiene un aviso de gravedad moderada (redirección abierta). La aplicación solo usa rutas internas fijas, por lo que la exposición es
  baja; la solución es pasar a la versión 7, un cambio mayor que conviene probar antes.
- Las advertencias restantes de `npm audit` son de herramientas de desarrollo (ESLint, workbox-build) y no llegan al navegador.
- Los datos de los trabajadores son datos personales: define con el área legal el aviso de privacidad y el plazo de conservación.
