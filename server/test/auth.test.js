import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestApp, seedUser, client, PASSWORD } from "./helpers.js";
import { sha256 } from "../src/auth/password.js";

let t;
before(async () => {
  t = await startTestApp();
  await seedUser(t.owner, { email: "admin@x.com", role: "admin" });
  await seedUser(t.owner, { email: "visor@x.com", role: "visor" });
  await seedUser(t.owner, { email: "bloqueado@x.com", role: "visor", blocked: true });
});
after(() => t.close());

test("login correcto devuelve el usuario y una cookie httpOnly estricta", async () => {
  const c = client(t.app);
  const r = await c.login("Admin@X.com"); // el correo no distingue mayúsculas
  assert.equal(r.status, 200);
  assert.equal(r.json.user.email, "admin@x.com");
  assert.equal(r.json.user.role, "admin");
  assert.equal(r.json.user.password_hash, undefined);
  const setCookie = String(r.headers["set-cookie"]);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  assert.equal((await c.get("/api/auth/me")).json.email, "admin@x.com");
});

test("la base de datos guarda solo la huella del token, nunca el token", async () => {
  const c = client(t.app);
  await c.login("visor@x.com");
  const token = c.cookie.split("=")[1];
  const { rows } = await t.owner.query("SELECT token_hash FROM sessions");
  assert.ok(rows.length > 0);
  assert.ok(rows.some((r) => Buffer.compare(r.token_hash, sha256(token)) === 0));
  assert.ok(!rows.some((r) => r.token_hash.toString("utf8").includes(token)));
});

test("credenciales incorrectas: mismo mensaje exista o no el usuario", async () => {
  const c = client(t.app);
  const a = await c.login("admin@x.com", "mala-contrasena-1");
  const b = await c.login("noexiste@x.com", "mala-contrasena-1");
  assert.equal(a.status, 401); assert.equal(b.status, 401);
  assert.equal(a.json.message, b.json.message);
});

test("bloqueo temporal tras 5 intentos fallidos (aunque luego se use la contraseña correcta)", async () => {
  await seedUser(t.owner, { email: "victima@x.com", role: "visor" });
  const c = client(t.app);
  for (let i = 0; i < 5; i++) await c.login("victima@x.com", "intento-incorrecto-" + i);
  const r = await c.login("victima@x.com", PASSWORD);
  assert.equal(r.status, 401);
  assert.match(r.json.message, /bloqueada temporalmente/i);
  const { rows } = await t.owner.query("SELECT action FROM audit_log WHERE action = 'auth.lockout'");
  assert.ok(rows.length >= 1);
});

test("un usuario bloqueado no puede iniciar sesión", async () => {
  const r = await client(t.app).login("bloqueado@x.com");
  assert.equal(r.status, 403);
});

test("sin sesión: /me responde 401 y las entidades también", async () => {
  const c = client(t.app);
  assert.equal((await c.get("/api/auth/me")).status, 401);
  assert.equal((await c.get("/api/entities/Worker")).status, 401);
});

test("CSRF: una petición que modifica datos sin el encabezado propio se rechaza", async () => {
  const c = client(t.app, { csrf: false });
  const r = await c.post("/api/auth/login", { email: "admin@x.com", password: PASSWORD });
  assert.equal(r.status, 403);
  assert.equal(r.json.error, "csrf");
});

test("CSRF: un Origin ajeno se rechaza", async () => {
  const c = client(t.app);
  const r = await c.post("/api/auth/login", { email: "admin@x.com", password: PASSWORD }, { headers: { origin: "https://evil.example" } });
  assert.equal(r.status, 403);
});

test("logout invalida la sesión en el servidor (no solo borra la cookie)", async () => {
  const c = client(t.app);
  await c.login("visor@x.com");
  const stolen = c.cookie;
  await c.post("/api/auth/logout", {});
  const replay = client(t.app);
  const r = await replay.call("GET", "/api/auth/me", { headers: { cookie: stolen } });
  assert.equal(r.status, 401);
});

test("bloquear a un usuario cierra sus sesiones al instante", async () => {
  const id = await seedUser(t.owner, { email: "temp@x.com", role: "visor" });
  const u = client(t.app); await u.login("temp@x.com");
  const a = client(t.app); await a.login("admin@x.com");
  assert.equal((await a.patch(`/api/entities/User/${id}`, { blocked: true })).status, 200);
  assert.equal((await u.get("/api/auth/me")).status, 401);
});

test("invitación: solo admin; devuelve enlace sin SMTP; el enlace sirve una sola vez", async () => {
  const v = client(t.app); await v.login("visor@x.com");
  assert.equal((await v.post("/api/users/invite", { email: "nuevo@x.com" })).status, 403);

  const a = client(t.app); await a.login("admin@x.com");
  const inv = await a.post("/api/users/invite", { email: "Nuevo@X.com", role: "capturista", job_title: "Supervisor" });
  assert.equal(inv.status, 200);
  assert.ok(inv.json.invite_url?.includes("/login?token="));
  assert.equal((await a.post("/api/users/invite", { email: "nuevo@x.com" })).status, 409);

  const token = new URL(inv.json.invite_url).searchParams.get("token");
  const n = client(t.app);
  assert.equal((await n.post("/api/auth/set-password", { token, password: "corta" })).status, 400);
  assert.equal((await n.post("/api/auth/set-password", { token, password: "Nueva-Clave-Larga-77" })).status, 200);
  assert.equal((await n.get("/api/auth/me")).json.role, "capturista");
  assert.equal((await client(t.app).post("/api/auth/set-password", { token, password: "Otra-Clave-Larga-88" })).status, 400);
  const { rows } = await t.owner.query("SELECT token_hash FROM user_tokens");
  assert.ok(rows.every((r) => r.token_hash.length === 32), "solo huellas SHA-256");
});

test("invitar con un rol inexistente falla; 'user' (rol básico de Base44) pasa a visor", async () => {
  const a = client(t.app); await a.login("admin@x.com");
  assert.equal((await a.post("/api/users/invite", { email: "r1@x.com", role: "superjefe" })).status, 400);
  const ok = await a.post("/api/users/invite", { email: "r2@x.com", role: "user" });
  assert.equal(ok.json.role, "visor");
});

test("restablecer contraseña: responde igual exista o no el correo", async () => {
  const c = client(t.app);
  const a = await c.post("/api/auth/forgot", { email: "admin@x.com" });
  const b = await c.post("/api/auth/forgot", { email: "fantasma@x.com" });
  assert.equal(a.status, 200); assert.deepEqual(a.json, b.json);
});

test("política de contraseñas y cambio de contraseña", async () => {
  const c = client(t.app); await c.login("visor@x.com");
  assert.equal((await c.post("/api/auth/change-password", { current_password: "equivocada-1234", new_password: "Nueva-Clave-Larga-99" })).status, 403);
  assert.equal((await c.post("/api/auth/change-password", { current_password: PASSWORD, new_password: "visor-visor-1234" })).status, 400); // contiene el correo
  assert.equal((await c.post("/api/auth/change-password", { current_password: PASSWORD, new_password: "Nueva-Clave-Larga-99" })).status, 200);
  assert.equal((await client(t.app).login("visor@x.com", PASSWORD)).status, 401);
  assert.equal((await client(t.app).login("visor@x.com", "Nueva-Clave-Larga-99")).status, 200);
});

test("el limitador de intentos de inicio de sesión responde 429", async () => {
  const strict = await startTestApp({ loginRatePerMinute: 5 });
  try {
    const c = client(strict.app);
    let last;
    for (let i = 0; i < 8; i++) last = await c.login("rate@x.com", "x-intento-" + i);
    assert.equal(last.status, 429);
  } finally { await strict.close(); }
});
