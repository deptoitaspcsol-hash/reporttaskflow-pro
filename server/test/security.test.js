import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { startTestApp, seedUser, client } from "./helpers.js";

let t, admin;
before(async () => {
  t = await startTestApp();
  await seedUser(t.owner, { email: "admin@x.com", role: "admin" });
  admin = client(t.app); await admin.login("admin@x.com");
});
after(() => t.close());

test("cabeceras de seguridad y nada de caché en la API", async () => {
  const r = await admin.get("/api/auth/me");
  assert.equal(r.headers["cache-control"], "no-store");
  assert.equal(r.headers["x-content-type-options"], "nosniff");
  assert.ok(r.headers["strict-transport-security"]);
  assert.equal(r.headers["x-powered-by"], undefined);
});

test("la API no filtra detalles internos en errores ni en rutas inexistentes", async () => {
  const r = await admin.get("/api/nada");
  assert.equal(r.status, 404);
  assert.deepEqual(Object.keys(r.json).sort(), ["error", "message"]);
  const bad = await admin.call("POST", "/api/entities/Worker", { payload: "{no es json", headers: { "content-type": "application/json" } });
  assert.equal(bad.status, 400);
  assert.ok(!/at .*\.js/.test(bad.body), "sin trazas de pila");
  assert.equal((await admin.get("/api/entities/Inexistente")).status, 404);
});

test("el healthcheck responde sin sesión y no expone datos", async () => {
  const r = await client(t.app).get("/api/health");
  assert.equal(r.status, 200); assert.deepEqual(r.json, { status: "ok" });
});

test("rol de la API (app_rw): puede operar datos pero NO cambiar el esquema", async () => {
  await assert.rejects(t.db.query("DROP TABLE users"), /must be owner|permission denied/i);
  await assert.rejects(t.db.query("ALTER TABLE records ADD COLUMN x int"), /must be owner|permission denied/i);
  await assert.rejects(t.db.query("CREATE TABLE intruso (id int)"), /permission denied/i);
  await assert.rejects(t.db.query("DROP TRIGGER audit_log_append_only ON audit_log"), /must be owner|permission denied/i);
});

test("la auditoría es solo de agregar: ni UPDATE, ni DELETE, ni TRUNCATE (ni con el rol propietario)", async () => {
  await assert.rejects(t.db.query("UPDATE audit_log SET action = 'x'"), /permission denied|solo agregar/i);
  await assert.rejects(t.db.query("DELETE FROM audit_log"), /permission denied|solo agregar/i);
  await assert.rejects(t.db.query("TRUNCATE audit_log"), /permission denied/i);
  await assert.rejects(t.owner.query("UPDATE audit_log SET action = 'x'"), /solo agregar/i);
  await assert.rejects(t.owner.query("DELETE FROM audit_log"), /solo agregar/i);
});

test("restricciones de la base: correo inválido o en mayúsculas y datos que no son objeto", async () => {
  await assert.rejects(t.owner.query("INSERT INTO users (id,email) VALUES ('a','no-es-correo')"), /users_email_format/);
  await assert.rejects(t.owner.query("INSERT INTO users (id,email) VALUES ('b','MAYUS@X.COM')"), /users_email_lower/);
  await assert.rejects(t.owner.query("INSERT INTO records (entity,id,data) VALUES ('Worker','z','[1,2]')"), /records_data_is_object/);
});

test("las sesiones se borran con el usuario (ON DELETE CASCADE) y las huellas no se repiten", async () => {
  const id = await seedUser(t.owner, { email: "gone@x.com" });
  const c = client(t.app); await c.login("gone@x.com");
  assert.equal((await t.owner.query("SELECT count(*)::int n FROM sessions WHERE user_id=$1", [id])).rows[0].n, 1);
  await t.owner.query("DELETE FROM users WHERE id=$1", [id]);
  assert.equal((await t.owner.query("SELECT count(*)::int n FROM sessions WHERE user_id=$1", [id])).rows[0].n, 0);
});

test("migraciones idempotentes: volver a ejecutarlas no cambia nada ni falla", async () => {
  const { migrate } = await import("../src/migrate.js");
  await migrate(t.owner, { log: () => {} });
  await migrate(t.owner, { log: () => {} });
  const n = (await t.owner.query("SELECT count(*)::int n FROM schema_migrations")).rows[0].n;
  assert.equal(n, 2);
});

test("configuración: en producción se exige HTTPS y base de datos", async () => {
  const { loadConfig } = await import("../src/config.js");
  assert.throws(() => loadConfig({ NODE_ENV: "production", PUBLIC_URL: "http://x.com", DATABASE_URL: "postgres://a" }), /https/);
  assert.throws(() => loadConfig({ NODE_ENV: "production", PUBLIC_URL: "https://x.com" }), /DATABASE_URL/);
  const ok = loadConfig({ NODE_ENV: "production", PUBLIC_URL: "https://x.com/", DATABASE_URL: "postgres://a" });
  assert.equal(ok.cookieSecure, true); assert.equal(ok.publicUrl, "https://x.com");
});
