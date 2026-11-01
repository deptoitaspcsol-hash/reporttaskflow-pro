import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadConfig } from "./config.js";
import { createDb } from "./db.js";
import { loadSchemas } from "./schemas.js";

const MIGRATIONS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const ident = (s) => s.replace(/[^a-z0-9_]/gi, "_").toLowerCase();

/**
 * Crea/actualiza el esquema. Es idempotente: se puede ejecutar en cada arranque.
 * Usa un candado asesor para que dos instancias no migren a la vez.
 */
export async function migrate(db, { log = console.log } = {}) {
  await db.tx(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(727274)");
    await tx.query("CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const done = new Set((await tx.query("SELECT id FROM schema_migrations")).rows.map((r) => r.id));

    for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
      if (done.has(file)) continue;
      log(`[migrate] aplicando ${file}`);
      await tx.query(readFileSync(path.join(MIGRATIONS, file), "utf8"));
      await tx.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
    }

    await syncIndexes(tx, log);
  });
}

/**
 * Índices por entidad según schemas/*.json:
 *  - "indexes": acelera filtros y ordenamientos habituales.
 *  - "unique":  evita duplicados (p. ej. dos labores con el mismo nombre), ahora aplicado por el servidor.
 */
async function syncIndexes(tx, log) {
  for (const [entity, def] of loadSchemas()) {
    const e = ident(entity);
    for (const field of def.indexes || []) {
      const f = ident(field);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_${e}_${f} ON records ((data->'${f}')) WHERE entity = '${entity}'`);
    }
    for (const field of def.unique || []) {
      const f = ident(field);
      await tx.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_${e}_${f} ON records ((lower(data->>'${f}'))) ` +
        `WHERE entity = '${entity}' AND coalesce(data->>'${f}', '') <> ''`
      );
    }
  }
  log("[migrate] índices al día");
}

// Ejecución directa: node src/migrate.js
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const cfg = loadConfig();
  const db = createDb(cfg.migrateDatabaseUrl, { max: 2, application_name: "labores-migrate" });
  migrate(db)
    .then(() => { console.log("[migrate] listo"); return db.end(); })
    .catch(async (err) => { console.error("[migrate] error:", err.message); await db.end().catch(() => {}); process.exit(1); });
}
