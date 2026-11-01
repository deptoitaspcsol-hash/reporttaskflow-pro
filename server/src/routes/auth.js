import { HttpError, badRequest, forbidden } from "../errors.js";
import { hashPassword, verifyPassword, DUMMY_HASH, passwordProblem, sha256, randomToken } from "../auth/password.js";
import { newId } from "../ids.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normEmail = (v) => String(v ?? "").trim().toLowerCase();
const publicUser = (u) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role, blocked: !!u.blocked, job_title: u.job_title, department: u.department });

export default async function authRoutes(app) {
  const { cfg, db, sessions, audit, mail } = app;

  const setCookie = (reply, token) =>
    reply.setCookie(sessions.cookieName, token, {
      httpOnly: true, secure: cfg.cookieSecure, sameSite: "strict", path: "/", maxAge: cfg.sessionTtlHours * 3600,
    });
  const clearCookie = (reply) => reply.clearCookie(sessions.cookieName, { path: "/", secure: cfg.cookieSecure, httpOnly: true, sameSite: "strict" });

  const bodySchema = (props, required) => ({ body: { type: "object", additionalProperties: false, required, properties: props } });
  const str = (max) => ({ type: "string", maxLength: max });

  // ---- Inicio de sesión -------------------------------------------------------------------------
  app.post("/api/auth/login", {
    schema: bodySchema({ email: str(200), password: str(300) }, ["email", "password"]),
    config: { rateLimit: { max: cfg.loginRatePerMinute, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const email = normEmail(req.body.email);
    const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = rows[0];

    // Siempre se calcula un hash (aunque el usuario no exista) para no revelar qué correos están registrados.
    const hash = user?.password_hash || DUMMY_HASH;
    const locked = user?.locked_until && new Date(user.locked_until) > new Date();
    const ok = await verifyPassword(req.body.password, hash);

    if (!user || !user.password_hash || !ok || locked) {
      if (user && !locked) {
        const attempts = user.failed_attempts + 1;
        const lock = attempts >= cfg.loginMaxAttempts ? new Date(Date.now() + cfg.lockoutMinutes * 60000) : null;
        await db.query("UPDATE users SET failed_attempts = $2, locked_until = $3 WHERE id = $1", [user.id, lock ? 0 : attempts, lock]);
        if (lock) await audit(req, "auth.lockout", { actor: user, details: { minutes: cfg.lockoutMinutes } });
      }
      await audit(req, "auth.login_failed", { actor: user ? { id: user.id, email: user.email } : { email }, details: { reason: locked ? "locked" : "bad_credentials" } });
      throw new HttpError(401, locked
        ? `Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ${cfg.lockoutMinutes} minutos.`
        : "Correo o contraseña incorrectos.", "bad_credentials");
    }
    if (user.blocked) {
      await audit(req, "auth.login_blocked", { actor: user });
      throw forbidden("Tu cuenta está bloqueada. Contacta al administrador.");
    }

    await db.query("UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1", [user.id]);
    const token = await sessions.create(user.id, req);
    setCookie(reply, token);
    await audit(req, "auth.login", { actor: user });
    return { user: publicUser(user) };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    const token = req.cookies?.[sessions.cookieName];
    if (token) await sessions.destroy(token);
    if (req.user) await audit(req, "auth.logout");
    clearCookie(reply);
    return { ok: true };
  });

  app.get("/api/auth/me", async (req) => {
    await app.requireAuth(req);
    return publicUser(req.user);
  });

  // ---- Cambiar la propia contraseña ----------------------------------------------------------------
  app.post("/api/auth/change-password", {
    schema: bodySchema({ current_password: str(300), new_password: str(300) }, ["current_password", "new_password"]),
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    await app.requireAuth(req);
    const { rows } = await db.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    if (!(await verifyPassword(req.body.current_password, rows[0]?.password_hash))) throw new HttpError(403, "La contraseña actual no es correcta.", "bad_credentials");
    const problem = passwordProblem(req.body.new_password, req.user);
    if (problem) throw badRequest(problem);
    await db.query("UPDATE users SET password_hash = $2, password_changed_at = now(), updated_date = now() WHERE id = $1", [req.user.id, await hashPassword(req.body.new_password)]);
    // Cierra las demás sesiones (por si la contraseña anterior estaba comprometida) y conserva la actual.
    await db.query("DELETE FROM sessions WHERE user_id = $1", [req.user.id]);
    setCookie(reply, await sessions.create(req.user.id, req));
    await audit(req, "auth.password_changed");
    return { ok: true };
  });

  // ---- Invitación / restablecimiento por enlace -----------------------------------------------------
  app.post("/api/auth/forgot", {
    schema: bodySchema({ email: str(200) }, ["email"]),
    config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
  }, async (req) => {
    const email = normEmail(req.body.email);
    const { rows } = await db.query("SELECT id, email, blocked, password_hash FROM users WHERE email = $1", [email]);
    const u = rows[0];
    if (u && !u.blocked) {
      const link = await createToken(u.id, "reset");
      await mail.send({ to: u.email, subject: "Restablecer tu contraseña – Control de Labores",
        text: `Para elegir una nueva contraseña abre este enlace (vence en ${cfg.resetTtlMinutes} minutos):\n\n${link}\n\nSi no lo pediste, ignora este mensaje.` }).catch((e) => req.log.error({ err: e }, "correo"));
      await audit(req, "auth.reset_requested", { actor: u });
    }
    return { ok: true }; // misma respuesta exista o no el correo
  });

  app.post("/api/auth/set-password", {
    schema: bodySchema({ token: str(200), password: str(300) }, ["token", "password"]),
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const { rows } = await db.query(
      `SELECT t.id AS tid, u.id, u.email, u.blocked FROM user_tokens t JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > now()`, [sha256(req.body.token)]);
    const t = rows[0];
    if (!t || t.blocked) throw new HttpError(400, "El enlace no es válido o ya venció. Pide uno nuevo.", "bad_token");
    const problem = passwordProblem(req.body.password, t);
    if (problem) throw badRequest(problem);
    await db.tx(async (tx) => {
      await tx.query("UPDATE user_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [t.id]);
      await tx.query("UPDATE users SET password_hash = $2, password_changed_at = now(), failed_attempts = 0, locked_until = NULL, updated_date = now() WHERE id = $1", [t.id, await hashPassword(req.body.password)]);
      await tx.query("DELETE FROM sessions WHERE user_id = $1", [t.id]);
    });
    setCookie(reply, await sessions.create(t.id, req));
    await audit(req, "auth.password_set", { actor: t });
    return { ok: true };
  });

  // ---- Alta de usuarios (solo administradores) -------------------------------------------------------
  app.post("/api/users/invite", {
    schema: bodySchema({ email: str(200), role: str(60), full_name: str(200), job_title: str(200) }, ["email"]),
    config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
  }, async (req) => {
    await app.requireAuth(req);
    if (req.user.role !== "admin") throw forbidden("Solo los administradores pueden agregar usuarios.");
    const email = normEmail(req.body.email);
    if (!EMAIL_RE.test(email)) throw badRequest("Correo electrónico no válido.");
    let role = String(req.body.role || "visor").toLowerCase();
    if (role === "user") role = "visor"; // "user" es el rol básico de Base44
    if (!(await app.authz.roleExists(role))) throw badRequest("El rol no existe.");

    const exists = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (exists.rows[0]) throw new HttpError(409, "Ese correo ya está registrado.", "conflict");
    const id = newId();
    await db.query("INSERT INTO users (id, email, full_name, role, job_title) VALUES ($1,$2,$3,$4,$5)",
      [id, email, req.body.full_name ?? null, role, req.body.job_title ?? null]);

    const link = await createToken(id, "invite");
    const sent = await mail.send({ to: email, subject: "Te invitaron a Control de Labores",
      text: `Se creó una cuenta para ti.\n\nElige tu contraseña aquí (el enlace vence en ${cfg.inviteTtlHours} horas):\n\n${link}\n` }).catch((e) => { req.log.error({ err: e }, "correo"); return false; });
    await audit(req, "user.invite", { entity: "User", recordId: id, details: { email, role, mail_sent: !!sent } });
    // Si no hay SMTP (o falló), el administrador recibe el enlace para entregarlo por otro medio.
    return { id, email, role, mail_sent: !!sent, ...(sent ? {} : { invite_url: link }) };
  });

  async function createToken(userId, purpose) {
    const token = randomToken(32);
    const ttl = purpose === "invite" ? cfg.inviteTtlHours * 60 : cfg.resetTtlMinutes;
    await db.query("UPDATE user_tokens SET used_at = now() WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL", [userId, purpose]);
    await db.query("INSERT INTO user_tokens (user_id, purpose, token_hash, expires_at) VALUES ($1,$2,$3,$4)",
      [userId, purpose, sha256(token), new Date(Date.now() + ttl * 60000)]);
    return `${cfg.publicUrl}/login?token=${token}&mode=${purpose === "invite" ? "invite" : "reset"}`;
  }
}
