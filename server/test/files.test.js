import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { startTestApp, seedUser, client, multipart } from "./helpers.js";

let t, admin, visor;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(64, 65)]);

before(async () => {
  t = await startTestApp({ maxUploadBytes: 50 * 1024 });
  await seedUser(t.owner, { email: "admin@x.com", role: "admin" });
  await seedUser(t.owner, { email: "visor@x.com", role: "visor" });
  admin = client(t.app); await admin.login("admin@x.com");
  visor = client(t.app); await visor.login("visor@x.com");
});
after(() => t.close());

const upload = (c, name, content) => { const m = multipart(name, content); return c.call("POST", "/api/files", { payload: m.payload, headers: m.headers }); };

test("subir una imagen y descargarla con sesión", async () => {
  const r = await upload(admin, "foto campo.png", PNG);
  assert.equal(r.status, 201);
  assert.match(r.json.file_url, /^\/api\/files\/[0-9a-f]{24}\/foto%20campo\.png$/);
  const g = await admin.get(r.json.file_url);
  assert.equal(g.status, 200);
  assert.equal(g.headers["content-type"], "image/png");
  assert.equal(g.headers["x-content-type-options"], "nosniff");
  assert.match(g.headers["content-security-policy"], /sandbox/);
  assert.match(g.headers["content-disposition"], /^inline/);
  assert.equal(Buffer.compare(g.rawBody, PNG), 0);
});

test("los archivos son privados: sin sesión no se entregan", async () => {
  const r = await upload(admin, "doc.pdf", PDF);
  assert.equal((await client(t.app).get(r.json.file_url)).status, 401);
});

test("un PDF se descarga como adjunto (no se abre dentro de la aplicación)", async () => {
  const r = await upload(admin, "reporte.pdf", PDF);
  const g = await visor.get(r.json.file_url);
  assert.match(g.headers["content-disposition"], /^attachment/);
});

test("tipos no permitidos: SVG, ejecutables y HTML", async () => {
  for (const name of ["x.svg", "virus.exe", "pagina.html", "script.js", "sin_extension"]) {
    assert.equal((await upload(admin, name, "contenido")).status, 415, name);
  }
});

test("el contenido debe coincidir con la extensión (un .exe renombrado a .pdf se rechaza)", async () => {
  assert.equal((await upload(admin, "falso.pdf", Buffer.from("MZ\x90\x00 programa"))).status, 415);
  assert.equal((await upload(admin, "falso.png", PDF)).status, 415);
  assert.equal((await upload(admin, "binario.txt", Buffer.from([0x41, 0x00, 0x42]))).status, 415);
  assert.equal((await upload(admin, "ok.txt", "texto normal con acentos: áéíóú")).status, 201);
});

test("tamaño máximo y archivos vacíos", async () => {
  assert.equal((await upload(admin, "grande.png", Buffer.concat([PNG, Buffer.alloc(80 * 1024)]))).status, 413);
  assert.equal((await upload(admin, "vacio.txt", "")).status, 400);
  assert.equal(readdirSync(t.cfg.uploadDir + "/tmp").length, 0, "no deben quedar temporales");
});

test("un visor no puede subir archivos; sin sesión tampoco", async () => {
  assert.equal((await upload(visor, "a.png", PNG)).status, 403);
  assert.equal((await upload(client(t.app), "a.png", PNG)).status, 401);
});

test("nombres con rutas o caracteres raros se limpian y no escapan del directorio", async () => {
  const r = await upload(admin, "../../etc/passwd.txt", "x");
  assert.equal(r.status, 201);
  assert.ok(!r.json.name.includes("/"));
  assert.equal((await admin.get("/api/files/..%2f..%2fetc/passwd")).status, 404);
  const { rows } = await t.owner.query("SELECT storage_key FROM files");
  assert.ok(rows.every((x) => /^\d{4}\/\d{2}\/[0-9a-f]{24}\.\w+$/.test(x.storage_key)));
});
