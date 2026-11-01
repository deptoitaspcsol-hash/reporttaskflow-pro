// Autorización en el SERVIDOR. Es la misma matriz que muestra "Roles y Permisos" en la interfaz,
// pero aquí sí se hace cumplir: ya no basta con ocultar un botón.

export const MODULES = [
  "workers", "daily_reports", "tasks", "tasks_assign", "tasks_complete", "projects",
  "worker_groups", "work_types", "payment_closings", "payment_history", "reports",
];
const ACTIONS = ["view", "create", "edit", "delete", "export"];

const matrix = (fn) => Object.fromEntries(MODULES.map((m) => [m, Object.fromEntries(ACTIONS.map((a) => [a, fn(a)]))]));

export const SYSTEM_ROLES = {
  admin: matrix(() => true),
  capturista: matrix((a) => a !== "delete"),
  visor: matrix((a) => a === "view"),
};
export const isSystemRole = (name) => Object.hasOwn(SYSTEM_ROLES, name);

const PERM_ACTION = { read: "view", create: "create", edit: "edit", delete: "delete" };

/**
 * Reglas (schemas/*.json → "policy"):
 *   ["workers", ...]  basta tener el permiso de la acción en cualquiera de esos módulos
 *   "@any"     cualquier usuario autenticado
 *   "@writer"  quien pueda crear o editar en algún módulo (admin, capturista, roles personalizados con esos permisos)
 *   "@deleter" quien pueda eliminar en algún módulo
 *   "@admin"   solo administradores
 *   "@never"   nadie (solo se agrega; p. ej. el historial)
 */
export function isAllowed(role, perms, rule, action) {
  if (rule === undefined || rule === "@never") return false;
  if (rule === "@admin") return role === "admin";
  if (role === "admin") return true;
  if (rule === "@any") return true;
  if (rule === "@writer") return hasAny(perms, ["create", "edit"]);
  if (rule === "@deleter") return hasAny(perms, ["delete"]);
  const a = PERM_ACTION[action];
  return Array.isArray(rule) && rule.some((m) => perms?.[m]?.[a] === true);
}

function hasAny(perms, actions) {
  return MODULES.some((m) => actions.some((a) => perms?.[m]?.[a] === true));
}

export const hasModulePermission = (role, perms, module, action = "view") =>
  role === "admin" || perms?.[module]?.[action] === true;

/** Resuelve los permisos de un rol; los roles personalizados se leen de la entidad Role (con caché breve). */
export function createAuthorizer(db, { ttlMs = 15000 } = {}) {
  let cache = { at: 0, byName: new Map() };

  async function loadCustomRoles() {
    if (Date.now() - cache.at < ttlMs) return cache.byName;
    const { rows } = await db.query("SELECT data FROM records WHERE entity = 'Role'");
    cache = { at: Date.now(), byName: new Map(rows.map((r) => [String(r.data.name || "").toLowerCase(), r.data.permissions || {}])) };
    return cache.byName;
  }

  return {
    invalidate() { cache.at = 0; },
    /** Rol desconocido o sin definición → mínimo privilegio (visor). */
    async permsFor(role) {
      if (isSystemRole(role)) return SYSTEM_ROLES[role];
      const custom = await loadCustomRoles();
      return custom.get(role) || SYSTEM_ROLES.visor;
    },
    async roleExists(role) {
      return isSystemRole(role) || (await loadCustomRoles()).has(role);
    },
  };
}
