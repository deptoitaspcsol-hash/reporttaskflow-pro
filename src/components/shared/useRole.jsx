import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { MODULES, ACTIONS } from "@/components/roles/PermissionsMatrix";

// Permisos de los roles del sistema (los mismos que muestra la pantalla "Roles y Permisos").
const allOf = (value) =>
  Object.fromEntries(MODULES.map((m) => [m.key, Object.fromEntries(ACTIONS.map((a) => [a.key, value]))]));

const SYSTEM_PERMISSIONS = {
  admin: allOf(true),
  capturista: Object.fromEntries(
    MODULES.map((m) => [m.key, { view: true, create: true, edit: true, delete: false, export: true }])
  ),
  visor: Object.fromEntries(
    MODULES.map((m) => [m.key, { view: true, create: false, edit: false, delete: false, export: false }])
  ),
};

/**
 * Rol y permisos del usuario actual.
 *
 * Antes la matriz de "Roles y Permisos" era solo informativa: cualquier rol personalizado
 * quedaba como "visor". Ahora los roles personalizados se leen de la entidad Role y
 * `can(modulo, acción)` respeta la matriz. Si el rol no existe o no se puede leer, se aplica
 * el mínimo privilegio (visor).
 *
 * `useRole("workers")` hace que canWrite/canDelete valgan solo para ese módulo.
 *
 * IMPORTANTE: esto controla lo que se ve en pantalla. La protección real de los datos debe
 * estar en las reglas del servidor (server/src/policy.js; ver SECURITY.md).
 */
export function useRole(moduleKey) {
  const { data: user, isLoading: userLoading, error: userError, refetch: refetchUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => api.auth.me(),
    staleTime: 60000,
  });

  const role = String(user?.role || "visor").toLowerCase();
  const isSystemRole = role in SYSTEM_PERMISSIONS;

  const { data: customRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.entities.Role.list(),
    enabled: !!user && !isSystemRole,
    staleTime: 60000,
    retry: false,
  });

  const permissions = isSystemRole
    ? SYSTEM_PERMISSIONS[role]
    : customRoles.find((r) => String(r.name || "").toLowerCase() === role)?.permissions
      || SYSTEM_PERMISSIONS.visor;

  const can = (module, action = "view") => !!permissions?.[module]?.[action];
  const canAny = (action) => MODULES.some((m) => can(m.key, action));

  const isAdmin = role === "admin";

  return {
    user,
    userError,
    refetchUser,
    role,
    isLoading: userLoading || (!!user && !isSystemRole && rolesLoading),
    isAdmin,
    isCapturista: role === "capturista",
    isVisor: role === "visor",
    can,
    canWrite: isAdmin || (moduleKey ? can(moduleKey, "create") || can(moduleKey, "edit") : canAny("create") || canAny("edit")),
    canDelete: isAdmin || (moduleKey ? can(moduleKey, "delete") : canAny("delete")),
    canExport: isAdmin || (moduleKey ? can(moduleKey, "export") : canAny("export")),
  };
}
