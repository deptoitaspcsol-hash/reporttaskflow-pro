import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "schemas");
export const SYSTEM_FIELDS = ["id", "created_date", "updated_date", "created_by"];

const TYPES = { s: "string", n: "number", b: "boolean", a: "array", o: "object", d: "string" };
const DATE_RE = "^\\d{4}-\\d{2}-\\d{2}$";

/** Convierte la definición compacta de schemas/*.json en JSON Schema. */
function toJsonSchema(def) {
  const properties = {};
  const required = [];
  for (const [name, f] of Object.entries(def.fields)) {
    const type = TYPES[f.t];
    const prop = { type: [type, "null"] };
    if (f.t === "d") prop.pattern = DATE_RE;
    if (f.t === "s") prop.maxLength = f.max ?? 2000;
    if (f.t === "n") { if (f.min !== undefined) prop.minimum = f.min; if (f.max !== undefined) prop.maximum = f.max; }
    if (f.t === "a") { prop.maxItems = 2000; if (f.items) prop.items = { type: TYPES[f.items] }; }
    if (f.enum) prop.enum = [...f.enum, null];
    properties[name] = prop;
    if (f.req) required.push(name);
  }
  // additionalProperties: true a propósito: la interfaz guarda algunos campos auxiliares (p. ej. formGroup).
  // Los campos conocidos se validan estrictamente; el tamaño total lo limita el servidor.
  return { type: "object", properties, required, additionalProperties: true };
}

export function loadSchemas(dir = DIR) {
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  const entities = new Map();

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const def = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    const fields = def.fields;
    const validate = ajv.compile(toJsonSchema(def));
    const known = new Set([...Object.keys(fields), ...SYSTEM_FIELDS]);

    entities.set(def.entity, {
      ...def,
      known,
      validate,
      /** Limpia lo que la interfaz envía "vacío" para que no choque con los tipos. */
      normalize(data, { forPatch = false } = {}) {
        const out = {};
        for (const [k, v] of Object.entries(data || {})) {
          if (SYSTEM_FIELDS.includes(k)) continue; // los controla el servidor
          const f = fields[k];
          if (f && v === "" && (f.t === "n" || f.t === "d")) { if (forPatch) out[k] = null; continue; }
          if (f && f.t === "n" && typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) { out[k] = Number(v); continue; }
          if (f && f.t === "b" && typeof v === "string") { out[k] = v === "true"; continue; }
          out[k] = v;
        }
        return out;
      },
      /** @returns {string|null} mensaje de error legible o null si es válido */
      check(doc) {
        if (validate(doc)) return null;
        return validate.errors
          .map((e) => `${(e.instancePath || "/").replace(/^\//, "") || "(registro)"} ${e.message}`)
          .slice(0, 5)
          .join("; ");
      },
    });
  }
  return entities;
}
