import { badRequest, forbidden, notFound, conflict, invalid, HttpError } from "../errors.js";
import { newId, ID_RE } from "../ids.js";
import { isAllowed, hasModulePermission } from "../policy.js";
import { SYSTEM_FIELDS } from "../schemas.js";

const SORTABLE_SYSTEM = new Set(["id", "created_date", "updated_date", "created_by"]);

export default async function entityRoutes(app) {
  const { db, cfg, schemas, authz, audit } = app;

  // ---- utilidades -------------------------------------------------------------------------------
  const def = (name) => {
    if (name === "User") return null;
    const d = schemas.get(name);
    if (!d) throw notFound("La entidad no existe.");
    return d;
  };

  async function guard(req, d, action) {
    await app.requireAuth(req);
    const perms = await authz.permsFor(req.user.role);
    if (!isAllowed(req.user.role, perms, d.policy[action], action)) throw forbidden();
    return perms;
  }

  /** Quita los campos sensibles a quien no tiene el permiso del módulo (p. ej. salarios y cédulas). */
  const mask = (d, user, perms, rows) => {
    if (!d.sensitive || hasModulePermission(user.role, perms, d.sensitive.module, "view")) return rows;
    return rows.map((r) => { for (const f of d.sensitive.fields) delete r[f]; return r; });
  };

  const toApi = (row) => ({ id: row.id, created_date: row.created_date, updated_date: row.updated_date, created_by: row.created_by, ...row.data });

  function checkId(id) { if (!ID_RE.test(id)) throw badRequest("Identificador no válido."); }

  /** Traduce {where, sort, limit, skip} a SQL parametrizado: ningún valor del cliente se concatena. */
  function buildQuery(d, { where, sort, limit, skip } = {}) {
    const params = [d.entity];
    const conds = ["entity = $1"];
    const add = (v) => { params.push(v); return `$${params.length}`; };

    for (const [key, value] of Object.entries(where ?? {})) {
      if (!d.known.has(key)) throw badRequest(`Campo desconocido en el filtro: ${key}`);
      if (key === "id" || key === "created_by") {
        if (typeof value !== "string") throw badRequest(`Filtro no válido para ${key}`);
        conds.push(`${key} = ${add(value)}`);
      } else if (key === "created_date" || key === "updated_date") {
        throw badRequest(`No se puede filtrar por ${key}`);
      } else if (value === null) {
        conds.push(`(data->>${add(key)}) IS NULL`);
      } else if (typeof value === "object" && !Array.isArray(value) && Array.isArray(value.$in)) {
        if (value.$in.length > 500) throw badRequest("$in admite hasta 500 valores.");
        conds.push(`(data->${add(key)}) = ANY(${add(value.$in.map((v) => JSON.stringify(v)))}::jsonb[])`);
      } else if (["string", "number", "boolean"].includes(typeof value)) {
        conds.push(`data @> ${add(JSON.stringify({ [key]: value }))}::jsonb`);
      } else {
        throw badRequest(`Valor de filtro no soportado para ${key}`);
      }
    }

    let order = "created_date DESC, id";
    if (sort) {
      const desc = String(sort).startsWith("-");
      const field = String(sort).replace(/^[-+]/, "");
      if (!d.known.has(field)) throw badRequest(`No se puede ordenar por ${field}`);
      const expr = SORTABLE_SYSTEM.has(field) ? field : `data->${add(field)}`;
      order = `${expr} ${desc ? "DESC" : "ASC"} NULLS LAST, id`;
    }
    const lim = Math.min(Math.max(parseInt(limit, 10) || cfg.listDefaultLimit, 1), cfg.listMaxLimit);
    const off = Math.max(parseInt(skip, 10) || 0, 0);
    return { sql: `SELECT id, data, created_by, created_date, updated_date FROM records WHERE ${conds.join(" AND ")} ORDER BY ${order} LIMIT ${lim} OFFSET ${off}`, params };
  }

  async function runList(req, name, opts) {
    if (name === "User") return listUsers(req, opts);
    const d = def(name);
    const perms = await guard(req, d, "read");
    const { sql, params } = buildQuery(d, opts);
    const { rows } = await db.query(sql, params);
    return mask(d, req.user, perms, rows.map(toApi));
  }

  // ---- lectura -----------------------------------------------------------------------------------
  // list(sort, limit)  ->  GET /api/entities/:entity?sort=-created_date&limit=500
  app.get("/api/entities/:entity", async (req) => {
    const { sort, limit, skip } = req.query;
    return runList(req, req.params.entity, { sort, limit, skip });
  });

  // filter(query, sort, limit)  ->  POST /api/entities/:entity/query  (el filtro va en el cuerpo, no en la URL)
  app.post("/api/entities/:entity/query", {
    schema: { body: { type: "object", properties: { where: { type: "object" }, sort: { type: "string", maxLength: 60 }, limit: { type: "integer" }, skip: { type: "integer" } } } },
  }, async (req) => runList(req, req.params.entity, req.body ?? {}));

  app.get("/api/entities/:entity/:id", async (req) => {
    const { entity, id } = req.params;
    checkId(id);
    if (entity === "User") return getUser(req, id);
    const d = def(entity);
    const perms = await guard(req, d, "read");
    const { rows } = await db.query("SELECT id, data, created_by, created_date, updated_date FROM records WHERE entity = $1 AND id = $2", [entity, id]);
    if (!rows[0]) throw notFound();
    return mask(d, req.user, perms, [toApi(rows[0])])[0];
  });

  // ---- escritura ---------------------------------------------------------------------------------
  function prepare(d, body, opts) {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw badRequest("Se esperaba un objeto.");
    return d.normalize(body, opts);
  }

  app.post("/api/entities/:entity", async (req, reply) => {
    const { entity } = req.params;
    if (entity === "User") throw new HttpError(405, "Para agregar usuarios usa la invitación (Gestión de usuarios).", "method_not_allowed");
    const d = def(entity);
    await guard(req, d, "create");
    const doc = prepare(d, req.body);
    const err = d.check(doc);
    if (err) throw invalid(err);
    const id = newId();
    const { rows } = await db.query(
      "INSERT INTO records (entity, id, data, created_by) VALUES ($1,$2,$3,$4) RETURNING id, data, created_by, created_date, updated_date",
      [entity, id, doc, req.user.email]);
    if (entity === "Role") authz.invalidate();
    await audit(req, "record.create", { entity, recordId: id });
    reply.code(201);
    return toApi(rows[0]);
  });

  app.post("/api/entities/:entity/bulk", async (req, reply) => {
    const { entity } = req.params;
    if (entity === "User") throw new HttpError(405, "No disponible.", "method_not_allowed");
    const d = def(entity);
    await guard(req, d, "create");
    if (!Array.isArray(req.body) || req.body.length === 0) throw badRequest("Se esperaba una lista de registros.");
    if (req.body.length > cfg.bulkMax) throw badRequest(`Máximo ${cfg.bulkMax} registros por carga.`);
    const docs = req.body.map((item, i) => {
      const doc = prepare(d, item);
      const err = d.check(doc);
      if (err) throw invalid(`Registro ${i + 1}: ${err}`);
      return doc;
    });
    // Todo o nada: si uno falla (p. ej. un duplicado), no se guarda ninguno.
    const created = await db.tx(async (tx) => {
      const out = [];
      for (const doc of docs) {
        const { rows } = await tx.query(
          "INSERT INTO records (entity, id, data, created_by) VALUES ($1,$2,$3,$4) RETURNING id, data, created_by, created_date, updated_date",
          [entity, newId(), doc, req.user.email]);
        out.push(toApi(rows[0]));
      }
      return out;
    });
    await audit(req, "record.bulk_create", { entity, details: { count: created.length } });
    reply.code(201);
    return created;
  });

  app.patch("/api/entities/:entity/:id", async (req) => {
    const { entity, id } = req.params;
    checkId(id);
    if (entity === "User") return updateUser(req, id);
    const d = def(entity);
    const perms = await guard(req, d, "edit");
    const patch = prepare(d, req.body, { forPatch: true });

    const updated = await db.tx(async (tx) => {
      const cur = await tx.query("SELECT data FROM records WHERE entity = $1 AND id = $2 FOR UPDATE", [entity, id]);
      if (!cur.rows[0]) throw notFound();
      const merged = { ...cur.rows[0].data, ...patch };
      // null / "" significa "dejar el campo vacío": se quita del registro en lugar de guardar un null.
      for (const k of Object.keys(merged)) if (merged[k] === null) delete merged[k];
      const err = d.check(merged);
      if (err) throw invalid(err);
      const { rows } = await tx.query(
        "UPDATE records SET data = $3, updated_date = now() WHERE entity = $1 AND id = $2 RETURNING id, data, created_by, created_date, updated_date",
        [entity, id, merged]);
      return rows[0];
    });
    if (entity === "Role") authz.invalidate();
    await audit(req, "record.update", { entity, recordId: id, details: { fields: Object.keys(patch).filter((k) => !SYSTEM_FIELDS.includes(k)) } });
    return mask(d, req.user, perms, [toApi(updated)])[0];
  });

  app.delete("/api/entities/:entity/:id", async (req) => {
    const { entity, id } = req.params;
    checkId(id);
    if (entity === "User") return deleteUser(req, id);
    const d = def(entity);
    await guard(req, d, "delete");
    const { rowCount } = await db.query("DELETE FROM records WHERE entity = $1 AND id = $2", [entity, id]);
    if (!rowCount) throw notFound();
    if (entity === "Role") authz.invalidate();
    await audit(req, "record.delete", { entity, recordId: id });
    return { ok: true };
  });

  // ---- Entidad especial: User ----------------------------------------------------------------------
  // Los usuarios viven en su propia tabla (con contraseña y sesiones). Aquí se exponen sin datos secretos
  // y con las mismas funciones que usa la interfaz (list/filter/update/delete).
  const USER_COLS = "id, email, full_name, role, blocked, job_title, department, extra, last_login_at, created_date, updated_date";
  const userApi = (u, full) => {
    const base = { id: u.id, email: u.email, full_name: u.full_name, job_title: u.job_title };
    return full ? { ...base, ...(u.extra || {}), role: u.role, blocked: u.blocked, department: u.department, last_login_at: u.last_login_at, created_date: u.created_date, updated_date: u.updated_date }
                : { ...base, role: u.role }; // el rol se necesita para listar "quién es técnico/admin"; no hay nada sensible
  };

  async function listUsers(req, { where, sort, limit } = {}) {
    await app.requireAuth(req);
    const admin = req.user.role === "admin";
    const { rows } = await db.query(`SELECT ${USER_COLS} FROM users ORDER BY created_date DESC LIMIT 5000`);
    let list = rows.map((u) => userApi(u, admin));
    for (const [k, v] of Object.entries(where ?? {})) {
      if (!["id", "email", "role", "blocked", "full_name", "job_title"].includes(k)) throw badRequest(`Campo desconocido en el filtro: ${k}`);
      list = list.filter((u) => u[k] === v);
    }
    if (sort) {
      const desc = String(sort).startsWith("-"); const f = String(sort).replace(/^[-+]/, "");
      if (["created_date", "email", "full_name", "role"].includes(f) && admin) list.sort((a, b) => (String(a[f] ?? "") < String(b[f] ?? "") ? -1 : 1) * (desc ? -1 : 1));
    }
    return list.slice(0, Math.min(parseInt(limit, 10) || 1000, 5000));
  }

  async function getUser(req, id) {
    await app.requireAuth(req);
    const { rows } = await db.query(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]);
    if (!rows[0]) throw notFound();
    return userApi(rows[0], req.user.role === "admin" || req.user.id === id);
  }

  const activeAdmins = async (exceptId) =>
    Number((await db.query("SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND NOT blocked AND id <> $1", [exceptId])).rows[0].n);

  async function updateUser(req, id) {
    await app.requireAuth(req);
    if (req.user.role !== "admin") throw forbidden("Solo los administradores pueden modificar usuarios.");
    const body = req.body ?? {};
    const allowed = ["role", "blocked", "full_name", "job_title", "department"];
    const bad = Object.keys(body).filter((k) => !allowed.includes(k) && !SYSTEM_FIELDS.includes(k));
    if (bad.length) throw badRequest(`Campos no modificables: ${bad.join(", ")}`);

    const cur = (await db.query("SELECT id, email, role, blocked FROM users WHERE id = $1", [id])).rows[0];
    if (!cur) throw notFound();
    const self = id === req.user.id;
    const sets = []; const vals = [id];
    const set = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };

    if ("role" in body) {
      const role = String(body.role).toLowerCase();
      if (self && role !== cur.role) throw forbidden("No puedes cambiar tu propio rol.");
      if (!(await authz.roleExists(role))) throw badRequest("El rol no existe.");
      if (cur.role === "admin" && role !== "admin" && (await activeAdmins(id)) === 0) throw conflict("Debe quedar al menos un administrador activo.");
      if (role !== cur.role) set("role", role);
    }
    if ("blocked" in body) {
      if (typeof body.blocked !== "boolean") throw badRequest("blocked debe ser verdadero o falso.");
      if (self && body.blocked) throw forbidden("No puedes bloquear tu propia cuenta.");
      if (body.blocked && cur.role === "admin" && (await activeAdmins(id)) === 0) throw conflict("No puedes bloquear al único administrador activo.");
      if (body.blocked !== cur.blocked) set("blocked", body.blocked);
    }
    for (const col of ["full_name", "job_title", "department"]) {
      if (col in body) { if (body[col] !== null && typeof body[col] !== "string") throw badRequest(`${col} no es válido.`); set(col, body[col] ? String(body[col]).slice(0, 200) : null); }
    }
    if (sets.length) {
      await db.query(`UPDATE users SET ${sets.join(", ")}, updated_date = now() WHERE id = $1`, vals);
      // Un bloqueo o cambio de rol debe notarse de inmediato: se cierran sus sesiones.
      if ("blocked" in body && body.blocked) await app.sessions.destroyAllForUser(id);
      await audit(req, "user.update", { entity: "User", recordId: id, details: { fields: Object.keys(body), to: { role: body.role, blocked: body.blocked } } });
    }
    return getUser(req, id);
  }

  async function deleteUser(req, id) {
    await app.requireAuth(req);
    if (req.user.role !== "admin") throw forbidden("Solo los administradores pueden eliminar usuarios.");
    if (id === req.user.id) throw forbidden("No puedes eliminar tu propia cuenta.");
    const cur = (await db.query("SELECT role FROM users WHERE id = $1", [id])).rows[0];
    if (!cur) throw notFound();
    if (cur.role === "admin" && (await activeAdmins(id)) === 0) throw conflict("Debe quedar al menos un administrador activo.");
    await db.query("DELETE FROM users WHERE id = $1", [id]);
    await audit(req, "user.delete", { entity: "User", recordId: id });
    return { ok: true };
  }
}
