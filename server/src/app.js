import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { HttpError } from "./errors.js";
import { loadSchemas } from "./schemas.js";
import { createAuthorizer } from "./policy.js";
import { createSessions } from "./auth/sessions.js";
import { createMailer } from "./mail.js";
import { createAudit } from "./audit.js";
import authRoutes from "./routes/auth.js";
import entityRoutes from "./routes/entities.js";
import fileRoutes from "./routes/files.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function buildApp({ cfg, db, mailer }) {
  const app = Fastify({
    logger: { level: cfg.logLevel, redact: ["req.headers.cookie", "req.headers.authorization"] },
    trustProxy: cfg.trustProxy,
    bodyLimit: 4 * 1024 * 1024,
  });

  const schemas = loadSchemas();
  const sessions = createSessions(db, cfg);
  const authz = createAuthorizer(db);
  const audit = createAudit(db, app.log);
  const mail = mailer ?? createMailer(cfg, app.log);
  Object.assign(app, { cfg, db, schemas, sessions, authz, audit, mail });

  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-origin" } });
  await app.register(cookie);
  await app.register(rateLimit, { global: true, max: cfg.rateLimitPerMinute, timeWindow: "1 minute" });
  await app.register(multipart, { limits: { fileSize: cfg.maxUploadBytes, files: 1, fields: 5, parts: 8 } });

  // Nada de lo que devuelve la API debe quedar en caché del navegador o de un proxy.
  app.addHook("onSend", async (req, reply) => {
    if (!reply.hasHeader("cache-control")) reply.header("cache-control", "no-store");
  });

  // Protección CSRF: las peticiones que modifican datos deben traer un encabezado propio (que un formulario
  // de otro sitio no puede enviar) y, si el navegador manda Origin, debe ser el de la aplicación.
  app.addHook("onRequest", async (req) => {
    if (SAFE_METHODS.has(req.method)) return;
    if (req.headers["x-requested-with"] !== "labores") throw new HttpError(403, "Petición no permitida.", "csrf");
    const origin = req.headers.origin;
    if (origin && origin !== cfg.publicOrigin && origin !== `${req.protocol}://${req.host}`) {
      throw new HttpError(403, "Origen no permitido.", "csrf");
    }
  });

  // Identifica al usuario a partir de la cookie de sesión.
  app.addHook("onRequest", async (req) => {
    req.user = null;
    const token = req.cookies?.[sessions.cookieName];
    if (token) req.user = await sessions.lookup(token);
  });
  app.decorate("requireAuth", async (req) => {
    if (!req.user) throw new HttpError(401, "Inicia sesión para continuar.", "unauthenticated");
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) return reply.code(err.status).send({ error: err.code, message: err.message });
    if (err.code === "23505") return reply.code(409).send({ error: "conflict", message: "Ya existe un registro con ese valor." });
    if (err.code === "FST_ERR_CTP_BODY_TOO_LARGE" || err.statusCode === 413) return reply.code(413).send({ error: "too_large", message: "El contenido es demasiado grande." });
    if (err.statusCode === 429) return reply.code(429).send({ error: "rate_limited", message: "Demasiados intentos. Espera un momento." });
    if (err.statusCode && err.statusCode < 500) return reply.code(err.statusCode).send({ error: "bad_request", message: "Petición no válida." });
    req.log.error({ err }, "error no controlado");
    return reply.code(500).send({ error: "internal", message: "Error interno del servidor." });
  });
  app.setNotFoundHandler((req, reply) => reply.code(404).send({ error: "not_found", message: "No encontrado." }));

  app.get("/api/health", { config: { rateLimit: false } }, async (req, reply) => {
    try { await db.query("SELECT 1"); return { status: "ok" }; }
    catch { return reply.code(503).send({ status: "db_unavailable" }); }
  });

  await app.register(authRoutes);
  await app.register(entityRoutes);
  await app.register(fileRoutes);

  // Limpieza de sesiones vencidas cada hora.
  const timer = setInterval(() => sessions.purgeExpired().catch(() => {}), 3600 * 1000);
  timer.unref();
  app.addHook("onClose", async () => clearInterval(timer));

  return app;
}
