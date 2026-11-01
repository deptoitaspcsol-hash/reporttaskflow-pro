// Importa datos exportados de Base44 (JSON o CSV) a una entidad.
//   node scripts/import-records.js <Entidad> <archivo.json|archivo.csv> [--dry-run]
// - Conserva id, created_date, updated_date y created_by si vienen en el archivo.
// - Valida cada registro con schemas/<Entidad>.json y los inserta en una sola transacción (todo o nada).
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadConfig } from "../src/config.js";
import { createDb } from "../src/db.js";
import { loadSchemas } from "../src/schemas.js";
import { parseCSVObjects } from "../src/csv.js";
import { newId, ID_RE } from "../src/ids.js";

const [entity, file, ...flags] = process.argv.slice(2);
const dry = flags.includes("--dry-run");
if (!entity || !file) { console.error("Uso: node scripts/import-records.js <Entidad> <archivo> [--dry-run]"); process.exit(1); }

const def = loadSchemas().get(entity);
if (!def) { console.error(`Entidad desconocida: ${entity}. Disponibles: ${[...loadSchemas().keys()].join(", ")}`); process.exit(1); }

const raw = readFileSync(file, "utf8");
let rows;
if (path.extname(file).toLowerCase() === ".json") {
  const parsed = JSON.parse(raw);
  rows = Array.isArray(parsed) ? parsed : parsed.records || parsed.data || [];
} else {
  rows = parseCSVObjects(raw, (h) => h.trim(), { maxRows: 1e6 }).rows;
  // En CSV todo llega como texto: se convierten los campos numéricos y las listas JSON.
  rows = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => {
    const t = def.fields[k]?.t;
    if (t === "a" || t === "o") { try { return [k, v ? JSON.parse(v) : null]; } catch { return [k, v]; } }
    return [k, v];
  })));
}

const toDate = (v) => (v ? new Date(v) : null);
const problems = [];
const prepared = rows.map((r, i) => {
  const id = r.id && ID_RE.test(String(r.id)) ? String(r.id) : newId();
  const doc = def.normalize(r);
  for (const k of ["_id", "__v"]) delete doc[k];
  const err = def.check(doc);
  if (err) problems.push(`Fila ${i + 1}: ${err}`);
  return { id, doc, created_by: r.created_by ?? null, created: toDate(r.created_date), updated: toDate(r.updated_date) };
});

if (problems.length) {
  console.error(`${problems.length} registro(s) con errores (no se importó nada):\n - ${problems.slice(0, 20).join("\n - ")}`);
  process.exit(1);
}
console.log(`${prepared.length} registro(s) válidos de ${entity}.`);
if (dry) { console.log("--dry-run: no se escribió nada."); process.exit(0); }

const cfg = loadConfig();
const db = createDb(cfg.migrateDatabaseUrl, { max: 1 });
try {
  await db.tx(async (tx) => {
    for (const p of prepared) {
      await tx.query(
        `INSERT INTO records (entity, id, data, created_by, created_date, updated_date)
         VALUES ($1,$2,$3,$4, coalesce($5, now()), coalesce($6, $5, now()))
         ON CONFLICT (entity, id) DO NOTHING`,
        [entity, p.id, p.doc, p.created_by, p.created, p.updated]);
    }
  });
  console.log("Importación terminada.");
} catch (err) {
  console.error("Error (se revirtió todo):", err.code === "23505" ? "valor duplicado en un campo único: " + (err.detail || err.message) : err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
