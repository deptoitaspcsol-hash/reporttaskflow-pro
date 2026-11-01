import { sha256, randomToken } from "./password.js";

const ABSOLUTE_MAX_DAYS = 30; // aunque se use a diario, la sesión caduca a los 30 días

export function createSessions(db, cfg) {
  const ttlMs = cfg.sessionTtlHours * 3600 * 1000;

  return {
    cookieName: cfg.cookieSecure ? "__Host-labores_sid" : "labores_sid",

    async create(userId, req) {
      const token = randomToken(32);
      await db.query(
        "INSERT INTO sessions (token_hash, user_id, expires_at, ip, user_agent) VALUES ($1,$2,$3,$4,$5)",
        [sha256(token), userId, new Date(Date.now() + ttlMs), req.ip ?? null, String(req.headers["user-agent"] || "").slice(0, 300)]
      );
      return token;
    },

    /** Devuelve el usuario dueño de la sesión, o null si no existe, caducó o la cuenta está bloqueada. */
    async lookup(token) {
      if (!token || token.length > 200) return null;
      const { rows } = await db.query(
        `SELECT s.id AS sid, s.last_seen_at, u.id, u.email, u.full_name, u.role, u.blocked, u.job_title, u.department
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = $1 AND s.expires_at > now()
            AND s.created_at > now() - ($2 || ' days')::interval`,
        [sha256(token), String(ABSOLUTE_MAX_DAYS)]
      );
      const row = rows[0];
      if (!row || row.blocked) return null;
      // Renovación deslizante, como mucho una vez cada 5 minutos para no escribir en cada petición.
      if (Date.now() - new Date(row.last_seen_at).getTime() > 5 * 60 * 1000) {
        db.query("UPDATE sessions SET last_seen_at = now(), expires_at = $2 WHERE id = $1", [row.sid, new Date(Date.now() + ttlMs)]).catch(() => {});
      }
      const { sid: _sid, last_seen_at: _ls, ...user } = row;
      return user;
    },

    destroy: (token) => db.query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]),
    destroyAllForUser: (userId) => db.query("DELETE FROM sessions WHERE user_id = $1", [userId]),
    purgeExpired: () => db.query("DELETE FROM sessions WHERE expires_at < now() OR created_at < now() - interval '30 days'"),
  };
}
