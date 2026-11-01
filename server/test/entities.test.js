import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startTestApp, seedUser, client } from "./helpers.js";

let t, admin, capt, visor, sup;
before(async () => {
  t = await startTestApp();
  await seedUser(t.owner, { email: "admin@x.com", role: "admin" });
  await seedUser(t.owner, { email: "capt@x.com", role: "capturista" });
  await seedUser(t.owner, { email: "visor@x.com", role: "visor" });
  await seedUser(t.owner, { email: "sup@x.com", role: "supervisor" });
  admin = client(t.app); await admin.login("admin@x.com");
  capt = client(t.app); await capt.login("capt@x.com");
  visor = client(t.app); await visor.login("visor@x.com");
  sup = client(t.app); await sup.login("sup@x.com");
  // Rol personalizado: ve y crea Tareas, ve Reportes, pero NO ve Trabajadores ni Cierres de Pago
  const perms = {};
  for (const m of ["workers","daily_reports","tasks","tasks_assign","tasks_complete","projects","worker_groups","work_types","payment_closings","payment_history","reports"]) {
    perms[m] = { view: false, create: false, edit: false, delete: false, export: false };
  }
  perms.tasks = { view: true, create: true, edit: true, delete: false, export: false };
  perms.reports = { view: true, create: false, edit: false, delete: false, export: false };
  assert.equal((await admin.post("/api/entities/Role", { name: "Supervisor", permissions: perms })).status, 201);
});
after(() => t.close());

const worker = (over = {}) => ({ full_name: "María Hernández", id_number: "ID-1", phone: "555", group: "A", base_salary: 8000, status: "activo", ...over });

test("crear y leer: el servidor pone id, fechas y created_by", async () => {
  const r = await admin.post("/api/entities/Worker", worker());
  assert.equal(r.status, 201);
  assert.match(r.json.id, /^[0-9a-f]{24}$/);
  assert.equal(r.json.created_by, "admin@x.com");
  assert.ok(r.json.created_date && r.json.updated_date);
  const g = await admin.get(`/api/entities/Worker/${r.json.id}`);
  assert.equal(g.json.full_name, "María Hernández");
});

test("el cliente no puede falsificar id, created_by ni fechas", async () => {
  const r = await capt.post("/api/entities/Worker", worker({ id_number: "ID-2", worker_code: "W2", id: "000000000000000000000001", created_by: "otro@x.com", created_date: "2001-01-01" }));
  assert.notEqual(r.json.id, "000000000000000000000001");
  assert.equal(r.json.created_by, "capt@x.com");
  assert.notEqual(r.json.created_date.slice(0, 4), "2001");
});

test("validación: obligatorios, enums, tipos y rangos devuelven 422 con mensaje", async () => {
  assert.equal((await admin.post("/api/entities/Worker", { phone: "1" })).status, 422);                      // falta full_name
  assert.equal((await admin.post("/api/entities/Worker", worker({ id_number: "X", status: "volando" }))).status, 422); // enum
  assert.equal((await admin.post("/api/entities/Worker", worker({ id_number: "Y", base_salary: -5 }))).status, 422);   // mínimo
  assert.equal((await admin.post("/api/entities/DailyReport", { date: "31/10/2026", worker_id: "w" })).status, 422);   // formato fecha
  assert.equal((await admin.post("/api/entities/DailyReport", { date: "2026-10-31", worker_id: "w", progress: 150 })).status, 422);
  const bad = await admin.post("/api/entities/Location", { name: "X", lat: 999, lng: 0 });
  assert.equal(bad.status, 422); assert.match(bad.json.message, /lat/);
});

test("normalización: números como texto y campos vacíos que envía la interfaz se aceptan", async () => {
  const r = await admin.post("/api/entities/Equipment", { name: "Moto", code: "EQ-1", purchase_cost: "1500.50", current_value: "", purchase_date: "" });
  assert.equal(r.status, 201);
  assert.equal(r.json.purchase_cost, 1500.5);
  assert.equal(r.json.current_value, undefined);
  // campos auxiliares desconocidos (la interfaz manda "formGroup") no rompen el guardado
  const d = await admin.post("/api/entities/DailyReport", { date: "2026-10-31", worker_id: "w1", formGroup: "A", quantity: "5", amount: 500 });
  assert.equal(d.status, 201); assert.equal(d.json.quantity, 5);
});

test("filter: igualdad, $in, null, orden numérico y por fecha, y límite", async () => {
  for (const [n, g, s] of [["Ana", "A", 3000], ["Beto", "B", 12000], ["Carla", "A", 900]]) {
    await admin.post("/api/entities/Worker", worker({ full_name: n, id_number: "F-" + n, worker_code: "F" + n, group: g, base_salary: s }));
  }
  const a = await admin.post("/api/entities/Worker/query", { where: { group: "A" } });
  assert.ok(a.json.every((w) => w.group === "A") && a.json.length >= 3);
  const inn = await admin.post("/api/entities/Worker/query", { where: { full_name: { $in: ["Ana", "Beto"] } } });
  assert.deepEqual(inn.json.map((w) => w.full_name).sort(), ["Ana", "Beto"]);
  const sorted = await admin.post("/api/entities/Worker/query", { where: { id_number: { $in: ["F-Ana", "F-Beto", "F-Carla"] } }, sort: "-base_salary" });
  assert.deepEqual(sorted.json.map((w) => w.base_salary), [12000, 3000, 900]); // numérico, no alfabético
  const lim = await admin.get("/api/entities/Worker?sort=full_name&limit=2");
  assert.equal(lim.json.length, 2);
});

test("inyección SQL: nombres y valores maliciosos no tocan la base", async () => {
  const evil = ["x' OR '1'='1", "'; DROP TABLE records; --", '"; DELETE FROM users; --'];
  for (const v of evil) {
    const r = await admin.post("/api/entities/Worker/query", { where: { group: v } });
    assert.equal(r.status, 200); assert.equal(r.json.length, 0);
  }
  assert.equal((await admin.post("/api/entities/Worker/query", { where: { "group'; DROP TABLE records;--": "A" } })).status, 400);
  assert.equal((await admin.get("/api/entities/Worker?sort=" + encodeURIComponent("full_name; DROP TABLE records"))).status, 400);
  assert.equal((await admin.get("/api/entities/Worker?limit=1;DROP")).status, 200);
  assert.equal((await admin.get("/api/entities/..%2f..%2fetc")).status, 404);
  assert.equal((await t.owner.query("SELECT count(*)::int AS n FROM records")).rows[0].n > 0, true);
});

test("PATCH fusiona campos, permite vaciar con '' y respeta la validación", async () => {
  const w = (await admin.post("/api/entities/Worker", worker({ id_number: "P-1", worker_code: "P1" }))).json;
  const u = await admin.patch(`/api/entities/Worker/${w.id}`, { phone: "999", base_salary: "" });
  assert.equal(u.status, 200);
  assert.equal(u.json.phone, "999");
  assert.equal(u.json.full_name, "María Hernández");      // lo no enviado se conserva
  assert.equal(u.json.base_salary, undefined);            // "" borra el número
  assert.equal((await admin.patch(`/api/entities/Worker/${w.id}`, { status: "invalido" })).status, 422);
  assert.equal((await admin.patch(`/api/entities/Worker/${"0".repeat(24)}`, { phone: "1" })).status, 404);
});

test("unicidad aplicada por el servidor: nombre y código de labor no se repiten (sin distinguir mayúsculas)", async () => {
  const a = await admin.post("/api/entities/WorkType", { name: "Siembra", unit: "ha", rate: 100, code: "SIE" });
  assert.equal(a.status, 201);
  assert.equal((await admin.post("/api/entities/WorkType", { name: "siembra", unit: "ha", rate: 90 })).status, 409);
  assert.equal((await admin.post("/api/entities/WorkType", { name: "Otra", unit: "ha", rate: 90, code: "sie" })).status, 409);
});

test("bulkCreate es atómico: si un registro falla no se guarda ninguno", async () => {
  const before = (await admin.get("/api/entities/WorkerGroup")).json.length;
  const r = await admin.post("/api/entities/WorkerGroup/bulk", [{ name: "G1" }, { name: "G2" }, { name: "g1" }]); // duplicado
  assert.equal(r.status, 409);
  assert.equal((await admin.get("/api/entities/WorkerGroup")).json.length, before);
  const ok = await admin.post("/api/entities/WorkerGroup/bulk", [{ name: "G1" }, { name: "G2" }]);
  assert.equal(ok.status, 201); assert.equal(ok.json.length, 2);
  assert.equal((await admin.post("/api/entities/WorkerGroup/bulk", [])).status, 400);
});

test("permisos del sistema: visor solo lee; capturista crea y edita pero no elimina; admin todo", async () => {
  assert.equal((await visor.get("/api/entities/WorkType")).status, 200);
  assert.equal((await visor.post("/api/entities/WorkType", { name: "Nueva", unit: "ha", rate: 1 })).status, 403);
  const c = await capt.post("/api/entities/WorkType", { name: "Riego", unit: "ha", rate: 5 });
  assert.equal(c.status, 201);
  assert.equal((await capt.patch(`/api/entities/WorkType/${c.json.id}`, { rate: 6 })).status, 200);
  assert.equal((await capt.del(`/api/entities/WorkType/${c.json.id}`)).status, 403);
  assert.equal((await visor.del(`/api/entities/WorkType/${c.json.id}`)).status, 403);
  assert.equal((await admin.del(`/api/entities/WorkType/${c.json.id}`)).status, 200);
});

test("roles personalizados: la matriz se cumple en el servidor (no solo en pantalla)", async () => {
  assert.equal((await sup.post("/api/entities/Task", { title: "Fertilizar" })).status, 201);   // tasks.create = sí
  assert.equal((await sup.get("/api/entities/Task")).status, 200);
  assert.equal((await sup.get("/api/entities/PaymentClosing")).status, 403);                   // payment_closings.view = no
  assert.equal((await sup.post("/api/entities/Project", { name: "P" })).status, 403);
  assert.equal((await sup.post("/api/entities/Role", { name: "Mio", permissions: {} })).status, 403);
  assert.equal((await sup.get("/api/entities/DailyReport")).status, 200);                      // reports.view lo permite
  assert.equal((await sup.post("/api/entities/DailyReport", { date: "2026-10-31", worker_id: "w" })).status, 403);
});

test("campos sensibles (cédula, teléfono, salario) se ocultan a quien no puede ver Trabajadores", async () => {
  const list = await sup.get("/api/entities/Worker");        // el supervisor ve Tareas, por eso puede leer nombres
  assert.equal(list.status, 200);
  assert.ok(list.json.length > 0);
  for (const w of list.json) {
    assert.ok(w.full_name);
    assert.equal(w.id_number, undefined); assert.equal(w.phone, undefined); assert.equal(w.base_salary, undefined);
  }
  assert.ok((await capt.get("/api/entities/Worker")).json.some((w) => w.id_number)); // capturista sí los ve
});

test("el historial de cambios es inmutable: ni la API ni la base de datos lo permiten", async () => {
  const h = await capt.post("/api/entities/Historial", { entity_type: "Worker", entity_id: "w1", action: "actualizado", field: "phone", old_value: "1", new_value: "2" });
  assert.equal(h.status, 201);
  assert.equal((await admin.patch(`/api/entities/Historial/${h.json.id}`, { new_value: "borrado" })).status, 403);
  assert.equal((await admin.del(`/api/entities/Historial/${h.json.id}`)).status, 403);
  await assert.rejects(t.db.query("UPDATE records SET data = '{}' WHERE entity = 'Historial'"), /no se puede modificar/);
  await assert.rejects(t.db.query("DELETE FROM records WHERE entity = 'Historial'"), /no se puede modificar/);
});

test("usuarios: un usuario normal solo ve datos básicos; el admin ve más y nunca hay contraseñas", async () => {
  const v = (await visor.get("/api/entities/User")).json;
  assert.ok(v.length >= 4);
  for (const u of v) { assert.equal(u.blocked, undefined); assert.equal(u.password_hash, undefined); assert.equal(u.last_login_at, undefined); }
  const a = (await admin.get("/api/entities/User")).json;
  assert.ok(a.every((u) => "blocked" in u && u.password_hash === undefined));
});

test("usuarios: no se puede cambiar el propio rol, bloquearse, ni dejar al sistema sin administrador", async () => {
  const me = (await admin.get("/api/auth/me")).json;
  assert.equal((await admin.patch(`/api/entities/User/${me.id}`, { role: "visor" })).status, 403);
  assert.equal((await admin.patch(`/api/entities/User/${me.id}`, { blocked: true })).status, 403);
  assert.equal((await admin.del(`/api/entities/User/${me.id}`)).status, 403);
  // un segundo admin intenta degradar al primero siendo el único otro admin: debe quedar al menos uno
  const id2 = await seedUser(t.owner, { email: "admin2@x.com", role: "admin" });
  const a2 = client(t.app); await a2.login("admin2@x.com");
  assert.equal((await a2.patch(`/api/entities/User/${me.id}`, { role: "visor" })).status, 200); // quedan admin2 → ok
  assert.equal((await a2.patch(`/api/entities/User/${id2}`, { role: "visor" })).status, 403);   // es él mismo
  await t.owner.query("UPDATE users SET role = 'admin' WHERE id = $1", [me.id]);                // restaurar para los demás tests
});

test("usuarios: solo admin modifica; campos peligrosos y roles inexistentes se rechazan", async () => {
  const target = (await admin.get("/api/entities/User")).json.find((u) => u.email === "visor@x.com");
  assert.equal((await visor.patch(`/api/entities/User/${target.id}`, { role: "admin" })).status, 403);   // escalada de privilegios
  assert.equal((await capt.patch(`/api/entities/User/${target.id}`, { role: "admin" })).status, 403);
  assert.equal((await admin.patch(`/api/entities/User/${target.id}`, { password_hash: "x" })).status, 400);
  assert.equal((await admin.patch(`/api/entities/User/${target.id}`, { extra: { a: 1 } })).status, 400);
  assert.equal((await admin.patch(`/api/entities/User/${target.id}`, { role: "dios" })).status, 400);
  assert.equal((await admin.patch(`/api/entities/User/${target.id}`, { job_title: "Contador" })).status, 200);
  assert.equal((await admin.post("/api/entities/User", { email: "a@b.com", role: "admin" })).status, 405);
});

test("auditoría: quedan registradas altas, cambios y bajas con quién y cuándo", async () => {
  const { rows } = await t.owner.query("SELECT action, actor_email, entity FROM audit_log WHERE action LIKE 'record.%' OR action LIKE 'user.%'");
  const actions = new Set(rows.map((r) => r.action));
  for (const a of ["record.create", "record.update", "record.delete", "user.update"]) assert.ok(actions.has(a), "falta " + a);
  assert.ok(rows.some((r) => r.actor_email === "admin@x.com"));
});

test("un rol creado después se aplica de inmediato (sin esperar la caché)", async () => {
  await seedUser(t.owner, { email: "nuevo@x.com", role: "auditor" });
  const n = client(t.app); await n.login("nuevo@x.com");
  assert.equal((await n.get("/api/entities/WorkType")).status, 200);               // rol sin definición → visor
  const perms = Object.fromEntries(["work_types"].map((m) => [m, { view: true, create: true, edit: false, delete: false, export: false }]));
  await admin.post("/api/entities/Role", { name: "Auditor", permissions: perms });
  assert.equal((await n.post("/api/entities/WorkType", { name: "Auditada", unit: "u", rate: 1 })).status, 201);
});
