# Seguridad

Este documento resume qué se protege en el código de la app y, sobre todo, **qué debe configurarse en Base44**, porque
nada de lo que hace el navegador puede sustituir las reglas de acceso del servidor.

## Lo que hace esta app (cliente)

- **Roles y permisos aplicados en pantalla.** La matriz de "Roles y Permisos" ahora se respeta: los roles personalizados
  ya no se tratan como "visor", el menú oculta lo que el rol no puede ver y el acceso directo por URL a una sección sin
  permiso muestra "Acceso restringido" (`src/components/shared/useRole.jsx`, `src/Layout.jsx`). Sin rol reconocido se aplica
  el mínimo privilegio (visor).
- **No quedarse sin administradores.** No se puede cambiar el propio rol, bloquearse a uno mismo ni quitar o bloquear al
  único administrador activo (Usuarios y Roles y Permisos).
- **Adjuntos.** Solo se aceptan jpg, png, gif, webp, pdf, doc(x), xls(x) y txt de hasta 10 MB (se excluye SVG, que puede
  llevar scripts). Los enlaces guardados solo se abren si son `http(s)`; uno con `javascript:` ya no es ejecutable
  (`src/lib/security.js`).
- **Exportaciones CSV.** Se neutralizan las "inyecciones de fórmulas": un nombre o nota que empiece con `=`, `+`, `-` o `@`
  se exporta como texto para que Excel no lo ejecute (`src/lib/csv.js`). Las cargas masivas usan un lector CSV que respeta
  comillas y limita el archivo a 2 MB y 1000 filas.
- **Impresión.** Se hace desde un iframe aislado (`sandbox` sin scripts) en lugar de `document.write` en una ventana nueva,
  que además fallaba si el navegador bloqueaba el popup.
- **Invitaciones.** Se valida el correo, se reintenta la asignación de rol y se avisa si falla (antes se perdía en silencio).
- **PWA.** El service worker nunca guarda en caché `/api/` (datos, nóminas, sesión); solo la interfaz y las imágenes.
- **Dependencias.** Pasaron de 23 vulnerabilidades (1 crítica, 11 altas) a un solo aviso moderado en producción (`react-router`, ver Pendientes). Se quitaron `react-quill`
  y `zod`, que no se usaban.

## Lo que debes revisar en Base44 (no se puede hacer desde el código)

Los permisos de la pantalla son una comodidad; **cualquiera con sesión puede llamar a la API directamente**. Revisa las reglas
de acceso (row/field level security) de cada entidad:

| Entidad | Qué comprobar |
|---|---|
| `User` | Solo un administrador puede modificar `role` y `blocked`. Si un usuario puede editar su propio registro, podría ascenderse a admin. |
| `Role` | Solo administradores pueden crear, editar o borrar roles. |
| `Worker` | Contiene cédula (`id_number`), teléfono y salario base: restringir lectura a quien lo necesite. |
| `PaymentClosing`, `Salary*` | Lectura y escritura solo para roles de finanzas / admin. |
| `DailyReport`, `Attendance`, `Task`, `Project` | Escritura solo para admin y capturista; eliminación solo admin. |
| `Historial` | Solo creación; sin edición ni borrado (es la bitácora de auditoría). |
| Archivos subidos | Confirmar si las URLs son públicas; si contienen datos sensibles, usar archivos privados con URL firmada. |

También conviene: activar la verificación en dos pasos para administradores y revisar periódicamente la lista de usuarios.

## Pendientes conocidos

- `react-router-dom` 6.x tiene un aviso de gravedad moderada (redirección abierta). La app solo usa rutas internas fijas, por lo
  que la exposición es baja; la solución es pasar a la versión 7, un cambio mayor que conviene probar en la vista previa de Base44.
- Las advertencias restantes de `npm audit` son de herramientas de desarrollo (ESLint, workbox-build) y no llegan al navegador.
- El token de sesión del SDK de Base44 se guarda en `localStorage` (diseño de la plataforma). Una cabecera `Content-Security-Policy`
  reduciría el riesgo de robo por XSS, pero debe configurarse en el hosting; una etiqueta `<meta>` podría romper el editor de Base44.
