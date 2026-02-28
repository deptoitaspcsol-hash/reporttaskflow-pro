import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, Pencil, Trash2, Users, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/shared/PageHeader";
import PermissionsMatrix, { MODULES, ACTIONS } from "../components/roles/PermissionsMatrix";
import { useRole } from "../components/shared/useRole";
import { toast } from "sonner";

const ROLE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

const defaultPermissions = () =>
  Object.fromEntries(MODULES.map(m => [m.key, Object.fromEntries(ACTIONS.map(a => [a.key, false]))]));

const SYSTEM_ROLES = [
  {
    id: "sys-admin", name: "Admin", description: "Acceso total al sistema", color: "#6366f1", is_system: true,
    permissions: Object.fromEntries(MODULES.map(m => [m.key, Object.fromEntries(ACTIONS.map(a => [a.key, true]))]))
  },
  {
    id: "sys-capturista", name: "Capturista", description: "Crear y editar registros, sin eliminar", color: "#10b981", is_system: true,
    permissions: Object.fromEntries(MODULES.map(m => [m.key, { view: true, create: true, edit: true, delete: false, export: true }]))
  },
  {
    id: "sys-visor", name: "Visor", description: "Solo lectura", color: "#94a3b8", is_system: true,
    permissions: Object.fromEntries(MODULES.map(m => [m.key, { view: true, create: false, edit: false, delete: false, export: false }]))
  },
];

export default function RoleManagement() {
  const { isAdmin, isLoading: roleLoading } = useRole();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedRole, setExpandedRole] = useState(null);
  const [showAssign, setShowAssign] = useState(null); // role id
  const [form, setForm] = useState({ name: "", description: "", color: ROLE_COLORS[0], permissions: defaultPermissions() });
  const queryClient = useQueryClient();

  const { data: customRoles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => base44.entities.Role.list("-created_date"),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const allRoles = [...SYSTEM_ROLES, ...customRoles];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); closeForm(); toast.success("Rol creado"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); closeForm(); toast.success("Rol actualizado"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); toast.success("Rol eliminado"); },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleName }) => base44.entities.User.update(userId, { role: roleName }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("Rol asignado"); },
  });

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ name: "", description: "", color: ROLE_COLORS[0], permissions: defaultPermissions() });
  };

  const handleEdit = (role) => {
    setEditing(role);
    setForm({ name: role.name, description: role.description || "", color: role.color || ROLE_COLORS[0], permissions: role.permissions || defaultPermissions() });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return; }
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const countPerms = (permissions) => {
    if (!permissions) return 0;
    return Object.values(permissions).reduce((sum, mod) => sum + Object.values(mod).filter(Boolean).length, 0);
  };

  const getUsersWithRole = (roleName) => users.filter(u => u.role === roleName);

  if (roleLoading) return null;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-500">
        <Shield className="w-12 h-12 text-slate-300" />
        <p className="text-lg font-medium">Acceso restringido</p>
        <p className="text-sm">Solo los administradores pueden gestionar roles.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Administración de Roles"
        subtitle={`${allRoles.length} roles · ${customRoles.length} personalizados`}
        actions={
          <Button onClick={() => { closeForm(); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="w-4 h-4" /> Nuevo Rol
          </Button>
        }
      />

      <div className="space-y-3">
        {allRoles.map(role => {
          const isExpanded = expandedRole === role.id;
          const roleUsers = getUsersWithRole(role.name.toLowerCase());
          const permCount = countPerms(role.permissions);
          const total = MODULES.length * ACTIONS.length;

          return (
            <Card key={role.id} className="border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Color dot */}
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: role.color || "#94a3b8" }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{role.name}</span>
                    {role.is_system && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Sistema</Badge>}
                  </div>
                  {role.description && <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-500">Permisos</p>
                    <p className="text-sm font-semibold text-slate-700">{permCount}/{total}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-500">Usuarios</p>
                    <p className="text-sm font-semibold text-slate-700">{roleUsers.length}</p>
                  </div>
                  {!role.is_system && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(role)} className="text-slate-400 hover:text-slate-700 h-8 w-8">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(role.id)} className="text-slate-400 hover:text-red-500 h-8 w-8">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                    className="text-slate-400 h-8 w-8"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                  {/* Permissions matrix read-only */}
                  <PermissionsMatrix permissions={role.permissions} onChange={() => {}} readOnly />

                  {/* Users with this role */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" /> Usuarios con este rol
                      </p>
                      {!role.is_system && (
                        <Button variant="outline" size="sm" onClick={() => setShowAssign(role)} className="text-xs gap-1">
                          <Plus className="w-3 h-3" /> Asignar usuario
                        </Button>
                      )}
                    </div>
                    {roleUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Ningún usuario asignado a este rol.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {roleUsers.map(u => (
                          <div key={u.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-700">
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold">
                              {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            {u.full_name || u.email}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) closeForm(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Rol" : "Nuevo Rol"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre del rol *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Supervisor de Campo" />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descripción..." />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Color identificador</Label>
              <div className="flex gap-2 flex-wrap">
                {ROLE_COLORS.map(c => (
                  <button
                    key={c}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ backgroundColor: c, borderColor: form.color === c ? "#1e293b" : "transparent" }}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                  >
                    {form.color === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Permisos por módulo</Label>
              <p className="text-xs text-slate-500 mb-3">Haz clic en el nombre del módulo para marcar/desmarcar todos. Haz clic en el encabezado de columna para marcar/desmarcar en todos los módulos.</p>
              <PermissionsMatrix
                permissions={form.permissions}
                onChange={(perms) => setForm(f => ({ ...f, permissions: perms }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              {editing ? "Guardar cambios" : "Crear rol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign user to role dialog */}
      <Dialog open={!!showAssign} onOpenChange={(v) => { if (!v) setShowAssign(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar usuarios — {showAssign?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
            {users.map(u => {
              const hasRole = u.role === showAssign?.name.toLowerCase();
              return (
                <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{u.full_name || u.email}</p>
                    <p className="text-xs text-slate-400">{u.role || "visor"}</p>
                  </div>
                  <Button
                    variant={hasRole ? "secondary" : "outline"}
                    size="sm"
                    className={`text-xs gap-1 ${hasRole ? "text-emerald-700 bg-emerald-50" : ""}`}
                    onClick={() => assignRoleMutation.mutate({ userId: u.id, roleName: showAssign?.name.toLowerCase() })}
                  >
                    {hasRole ? <><Check className="w-3 h-3" /> Asignado</> : "Asignar"}
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}