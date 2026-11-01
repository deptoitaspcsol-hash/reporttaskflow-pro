import { randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { loadConfig } from "../src/config.js";
import { createDb } from "../src/db.js";
import { migrate } from "../src/migrate.js";
import { buildApp } from "../src/app.js";
import { hashPassword } from "../src/auth/password.js";
import { newId } from "../src/ids.js";

// Requiere un PostgreSQL con un rol propietario con CREATEDB y un rol "app_rw" (ver README del servidor).
const ADMIN_URL = process.env.TEST_PG_ADMIN_URL || "postgres://labores_owner:owner_pw@127.0.0.1:54329/postgres";
const host = (db) => `postgres://%s:%s@127.0.0.1:54329/${db}`;

export const PASSWORD = "Contrasena-Segura-123";

/** Crea una base de datos nueva, migra con el propietario y arranca la API con el rol limitado app_rw. */
export async function startTestApp(overrides = {}) {
  const dbName = "labores_t_" + randomBytes(5).toString("hex");
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.end();

  const ownerUrl = host(dbName).replace("%s", "labores_owner").replace("%s", "owner_pw");
  const appUrl = host(dbName).replace("%s", "app_rw").replace("%s", "app_pw");

  const owner = createDb(ownerUrl, { max: 2 });
  await migrate(owner, { log: () => {} });

  const cfg = {
    ...loadConfig({ DATABASE_URL: appUrl, MIGRATE_DATABASE_URL: ownerUrl, PUBLIC_URL: "http://localhost:3000", NODE_ENV: "test", LOG_LEVEL: "silent" }),
    uploadDir: mkdtempSync(path.join(tmpdir(), "labores-up-")),
    loginRatePerMinute: 1000, // las pruebas hacen muchos inicios de sesión desde la misma IP
    ...overrides,
  };
  const db = createDb(appUrl, { max: 5 });
  const app = await buildApp({ cfg, db });
  await app.ready();

  return {
    app, db, owner, cfg, dbName,
    async close() {
      await app.close(); await db.end(); await owner.end();
      const a = new pg.Client({ connectionString: ADMIN_URL });
      await a.connect(); await a.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`); await a.end();
    },
  };
}

/** Inserta un usuario con contraseña ya definida (atajo para las pruebas). */
export async function seedUser(owner, { email, role = "visor", password = PASSWORD, blocked = false, full_name = null } = {}) {
  const id = newId();
  await owner.query("INSERT INTO users (id, email, full_name, role, blocked, password_hash) VALUES ($1,$2,$3,$4,$5,$6)",
    [id, email, full_name || email.split("@")[0], role, blocked, await hashPassword(password)]);
  return id;
}

/** Cliente HTTP de pruebas (usa app.inject) que conserva la cookie de sesión y manda los encabezados anti-CSRF. */
export function client(app, { csrf = true } = {}) {
  let cookie = "";
  const call = async (method, url, { body, headers = {}, payload, raw } = {}) => {
    const h = { ...(csrf ? { "x-requested-with": "labores" } : {}), ...(cookie ? { cookie } : {}), ...headers };
    if (body !== undefined) h["content-type"] = "application/json";
    const res = await app.inject({ method, url, headers: h, payload: raw ?? (body !== undefined ? JSON.stringify(body) : payload) });
    const set = res.headers["set-cookie"];
    if (set) {
      const line = (Array.isArray(set) ? set : [set]).find((c) => /sid=/.test(c));
      if (line) cookie = /sid=;|Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(line) ? "" : line.split(";")[0];
    }
    let json; try { json = res.json(); } catch { json = undefined; }
    return { status: res.statusCode, json, headers: res.headers, body: res.body, rawBody: res.rawPayload };
  };
  return {
    get: (u, o) => call("GET", u, o), post: (u, body, o) => call("POST", u, { body, ...o }),
    patch: (u, body, o) => call("PATCH", u, { body, ...o }), del: (u, o) => call("DELETE", u, o),
    call, get cookie() { return cookie; }, clearCookie() { cookie = ""; },
    async login(email, password = PASSWORD) { return call("POST", "/api/auth/login", { body: { email, password } }); },
  };
}

export function multipart(filename, content, { field = "file" } = {}) {
  const boundary = "----labores" + randomBytes(6).toString("hex");
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { payload: Buffer.concat([head, Buffer.isBuffer(content) ? content : Buffer.from(content), tail]), headers: { "content-type": `multipart/form-data; boundary=${boundary}` } };
}
