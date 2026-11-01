# Pasar los datos de Base44 al servidor propio

1. **Exporta** cada entidad desde el panel de Base44 (formato JSON o CSV). Entidades: `Worker`, `WorkerGroup`, `WorkType`, `SalaryScale`,
   `Project`, `Task`, `DailyReport`, `Attendance`, `PaymentClosing`, `Equipment`, `EquipmentAssignment`, `Location`, `Historial`, `Role`.
   Los **usuarios** no se importan: invítalos de nuevo desde *Usuarios* (cada uno elegirá su contraseña).
2. **Copia** los archivos al servidor, por ejemplo a `/opt/labores/import/`.
3. **Prueba sin escribir nada** (`--dry-run`): valida cada registro con el esquema y lista los problemas.

   ```bash
   docker compose run --rm -v $PWD/import:/import:ro -e MIGRATE_DATABASE_URL="postgres://labores_owner:$DB_OWNER_PASSWORD@db:5432/labores" \
     api node scripts/import-records.js Worker /import/Worker.json --dry-run
   ```
4. **Importa** quitando `--dry-run`. Es **todo o nada** por archivo (una transacción) y conserva `id`, `created_date`, `updated_date` y `created_by`.
   Importa en este orden para que las referencias (por id) sigan siendo válidas: `Role`, `WorkerGroup`, `SalaryScale`, `Worker`, `WorkType`, `Project`,
   `Task`, `DailyReport`, `Attendance`, `PaymentClosing`, `Equipment`, `EquipmentAssignment`, `Location`, `Historial`.
5. **Archivos adjuntos y fotos**: las URLs antiguas apuntan a Base44. Descarga los archivos mientras sigas teniendo acceso y vuelve a subirlos,
   o conserva las URLs mientras la cuenta de Base44 siga activa (se seguirán viendo, pero no estarán bajo tu control).

Si el dry-run reporta errores (p. ej. un campo con un tipo distinto al esperado o un nombre repetido), corrige el archivo o ajusta el esquema en
`server/schemas/<Entidad>.json` y vuelve a probar. Los esquemas se obtuvieron leyendo el código, no desde Base44, así que es normal afinar algunos.
