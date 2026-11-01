import { createWriteStream, createReadStream } from "node:fs";
import { mkdir, rename, rm, stat, open } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { badRequest, notFound, HttpError } from "../errors.js";
import { newId, ID_RE } from "../ids.js";
import { isAllowed } from "../policy.js";

// Lista blanca por extensión → tipo MIME fijado por el servidor (nunca el que declara el cliente).
// Se excluye SVG a propósito (puede llevar scripts).
const TYPES = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp",
  pdf: "application/pdf", txt: "text/plain; charset=utf-8",
  doc: "application/msword", xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
const INLINE = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

/** El contenido debe coincidir con la extensión (evita un .exe renombrado a .pdf). */
async function matchesSignature(file, ext) {
  const fh = await open(file, "r");
  try {
    const buf = Buffer.alloc(16);
    const { bytesRead } = await fh.read(buf, 0, 16, 0);
    const b = buf.subarray(0, bytesRead);
    const starts = (...bytes) => bytes.every((x, i) => b[i] === x);
    switch (ext) {
      case "jpg": case "jpeg": return starts(0xff, 0xd8, 0xff);
      case "png": return starts(0x89, 0x50, 0x4e, 0x47);
      case "gif": return starts(0x47, 0x49, 0x46, 0x38);
      case "webp": return b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
      case "pdf": return b.subarray(0, 5).toString() === "%PDF-";
      case "doc": case "xls": return starts(0xd0, 0xcf, 0x11, 0xe0);
      case "docx": case "xlsx": return starts(0x50, 0x4b, 0x03, 0x04);
      case "txt": {
        const sample = Buffer.alloc(8192);
        const r = await fh.read(sample, 0, 8192, 0);
        return !sample.subarray(0, r.bytesRead).includes(0);
      }
      default: return false;
    }
  } finally { await fh.close(); }
}

const cleanName = (n) => String(n || "archivo").replace(/[\\/]+/g, "_").replace(/[\u0000-\u001f<>:"|?*]/g, "").trim().slice(0, 120) || "archivo";

export default async function fileRoutes(app) {
  const { cfg, db, audit } = app;

  app.post("/api/files", { config: { rateLimit: { max: 60, timeWindow: "1 hour" } } }, async (req, reply) => {
    await app.requireAuth(req);
    // Subir archivos requiere poder crear o editar algo (un "visor" solo consulta).
    if (!isAllowed(req.user.role, await app.authz.permsFor(req.user.role), "@writer", "create")) throw new HttpError(403, "No tienes permiso para subir archivos.", "forbidden");
    const part = await req.file();
    if (!part) throw badRequest("No se recibió ningún archivo.");

    const original = cleanName(part.filename);
    const ext = path.extname(original).slice(1).toLowerCase();
    if (!TYPES[ext]) { part.file.resume(); throw new HttpError(415, "Tipo de archivo no permitido.", "unsupported_type"); }

    const id = newId();
    const now = new Date();
    const key = path.posix.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"), `${id}.${ext}`);
    const finalPath = path.join(cfg.uploadDir, key);
    const tmpPath = path.join(cfg.uploadDir, "tmp", `${id}.part`);
    await mkdir(path.dirname(tmpPath), { recursive: true });
    await mkdir(path.dirname(finalPath), { recursive: true });

    const hash = createHash("sha256");
    let size = 0;
    part.file.on("data", (chunk) => { size += chunk.length; hash.update(chunk); });
    try {
      await pipeline(part.file, createWriteStream(tmpPath, { mode: 0o640 }));
      if (part.file.truncated) throw new HttpError(413, `El archivo supera ${Math.round(cfg.maxUploadBytes / 1048576)} MB.`, "too_large");
      if (size === 0) throw badRequest("El archivo está vacío.");
      if (!(await matchesSignature(tmpPath, ext))) throw new HttpError(415, "El contenido del archivo no corresponde a su tipo.", "bad_signature");
      await rename(tmpPath, finalPath);
    } catch (err) {
      await rm(tmpPath, { force: true });
      throw err;
    }

    await db.query("INSERT INTO files (id, original_name, mime, size, sha256, storage_key, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id, original, TYPES[ext], size, hash.digest("hex"), key, req.user.email]);
    await audit(req, "file.upload", { entity: "File", recordId: id, details: { name: original, size } });
    reply.code(201);
    return { id, name: original, size, mime: TYPES[ext], file_url: `/api/files/${id}/${encodeURIComponent(original)}` };
  });

  // Los archivos son PRIVADOS: solo se entregan con sesión iniciada (antes eran URLs públicas).
  app.get("/api/files/:id/:name", async (req, reply) => {
    await app.requireAuth(req);
    if (!ID_RE.test(req.params.id)) throw notFound();
    const { rows } = await db.query("SELECT original_name, mime, size, storage_key FROM files WHERE id = $1", [req.params.id]);
    const f = rows[0];
    if (!f) throw notFound();
    const root = path.resolve(cfg.uploadDir);
    const full = path.resolve(root, f.storage_key);
    if (!full.startsWith(root + path.sep)) throw notFound(); // defensa extra contra rutas manipuladas
    await stat(full).catch(() => { throw notFound(); });

    const inline = INLINE.has(f.mime);
    reply
      .header("content-type", f.mime)
      .header("content-length", f.size)
      .header("x-content-type-options", "nosniff")
      .header("content-security-policy", "default-src 'none'; sandbox")
      .header("cache-control", "private, max-age=3600")
      .header("content-disposition", `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.original_name)}`);
    return reply.send(createReadStream(full));
  });
}
