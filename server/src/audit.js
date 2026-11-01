/** Registro de auditoría de seguridad (solo agrega). Nunca debe romper la petición si falla. */
export function createAudit(db, log) {
  return async function audit(req, action, { entity, recordId, actor, details } = {}) {
    try {
      const a = actor ?? req?.user ?? null;
      await db.query(
        "INSERT INTO audit_log (actor_id, actor_email, action, entity, record_id, ip, details) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [a?.id ?? null, a?.email ?? null, action, entity ?? null, recordId ?? null, req?.ip ?? null, JSON.stringify(details ?? {})]
      );
    } catch (err) {
      log?.error?.({ err }, "no se pudo escribir la auditoría");
    }
  };
}
