import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, UserPlus, Briefcase, Ban, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PageHeader from "../components/shared/PageHeader";
import RoleBadge from "../components/shared/RoleBadge";
import { useRole } from "../components/shared/useRole";
import { toast } from "sonner";
import { isValidEmail } from "@/lib/security";

export default function UserManagement() {
  const { isAdmin, isLoading: roleLoading, user: me } = useRole();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("visor");
  const [inviteJobTitle, setInviteJobTitle] = useState("");
  const [inviting, setInviting] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  // Roles personalizados (los crea "Roles y Permisos"): antes no se podían elegir desde aquí.
  const { data: customRoles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => base44.entities.Role.list(),
    enabled: isAdmin,
    retry: false,
  });
  const roleOptions = [
    { value: "admin", label: "Admin" },
    { value: "capturista", label: "Capturista" },
    { value: "visor", label: "Visor" },
    ...customRoles
      .map((r) => ({ value: String(r.name || "").toLowerCase(), label: r.name }))
      .filter((r) => r.value && !["admin", "capturista", "visor"].includes(r.value)),
  ];

  const adminCount = users.filter((u) => u.role === "admin" && !u.blocked).length;
  const isSelf = (u) => !!me && (u.id === me.id || u.email === me.email);

  // Protecciones para no quedarse sin administradores ni bloquear la propia cuenta.
  const requestRoleChange = (u, role) => {
    if (isSelf(u)) return toast.error("No puedes cambiar tu propio rol.");
    if (u.role === "admin" && role !== "admin" && adminCount <= 1) {
      return toast.error("Debe quedar al menos un administrador activo.");
    }
    updateRoleMutation.mutate({ id: u.id, role });
  };
  const requestBlockToggle = (u) => {
    if (isSelf(u)) return toast.error("No puedes bloquear tu propia cuenta.");
    if (!u.blocked && u.role === "admin" && adminCount <= 1) {
      return toast.error("No puedes bloquear al único administrador activo.");
    }
    toggleBlockMutation.mutate({ id: u.id, blocked: !u.blocked });
  };

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Rol actualizado");
    },
    onError: () => toast.error("No se pudo actualizar el rol."),
  });

  const toggleBlockMutation = useMutation({
    mutationFn: ({ id, blocked }) => base44.entities.User.update(id, { blocked }),
    onSuccess: (_, { blocked }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(blocked ? "Usuario bloqueado" : "Usuario desbloqueado");
    },
    onError: () => toast.error("No se pudo actualizar el usuario."),
  });

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      toast.error("Escribe un correo electrónico válido.");
      return;
    }
    setInviting(true);
    try {
      // inviteUser siempre envía el correo de invitación. Solo acepta "admin" o "user".
      await base44.users.inviteUser(email, inviteRole === "admin" ? "admin" : "user");

      // El usuario tarda un momento en aparecer: se reintenta (antes era un solo setTimeout fijo
      // y, si no aparecía a tiempo, el rol y el puesto elegidos se perdían sin avisar).
      let newUser = null;
      for (let attempt = 0; attempt < 6 && !newUser; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const all = await base44.entities.User.list();
        newUser = all.find((u) => String(u.email || "").toLowerCase() === email);
      }
      if (newUser) {
        await base44.entities.User.update(newUser.id, {
          role: inviteRole,
          ...(inviteJobTitle.trim() ? { job_title: inviteJobTitle.trim() } : {}),
        });
        toast.success(`Invitación enviada a ${email}`);
      } else {
        toast.warning(`Invitación enviada a ${email}, pero no se pudo asignar el rol. Asígnalo manualmente cuando aparezca.`);
      }
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setInviteEmail("");
      setInviteRole("visor");
      setInviteJobTitle("");
      setShowInvite(false);
    } catch {
      toast.error("No se pudo enviar la invitación. Revisa el correo e intenta de nuevo.");
    } finally {
      setInviting(false);
    }
  };

  if (roleLoading) return null;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-500">
        <Shield className="w-12 h-12 text-slate-300" />
        <p className="text-lg font-medium">Acceso restringido</p>
        <p className="text-sm">Solo los administradores pueden gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Gestión de Usuarios"
        subtitle={`${users.length} usuarios registrados`}
        actions={
          <Button onClick={() => setShowInvite(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <UserPlus className="w-4 h-4" /> Agregar Usuario
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <Card key={u.id} className={`p-5 shadow-sm ${u.blocked ? "border-red-200 bg-red-50/30" : "border-slate-200/80"}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm">
                  {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{u.full_name || "Sin nombre"}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                  {u.job_title && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3 h-3" />{u.job_title}
                    </p>
                  )}
                </div>
              </div>
              <RoleBadge role={u.role || "visor"} />
            </div>
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Cambiar rol</Label>
                <Select
                  value={u.role || "visor"}
                  onValueChange={(val) => requestRoleChange(u, val)}
                  disabled={isSelf(u)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={`w-full gap-2 text-xs ${u.blocked ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-red-200 text-red-600 hover:bg-red-50"}`}
                disabled={isSelf(u)}
                title={isSelf(u) ? "No puedes bloquear tu propia cuenta" : undefined}
                onClick={() => requestBlockToggle(u)}
              >
                {u.blocked ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Desbloquear usuario</>
                ) : (
                  <><Ban className="w-3.5 h-3.5" /> Bloquear usuario</>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Agregar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Correo electrónico *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div>
              <Label>Puesto de trabajo</Label>
              <Input
                value={inviteJobTitle}
                onChange={e => setInviteJobTitle(e.target.value)}
                placeholder="Ej: Supervisor de campo, Contador..."
              />
            </div>
            <div>
              <Label>Rol de acceso</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — acceso total</SelectItem>
                  <SelectItem value="capturista">Capturista — crear y editar</SelectItem>
                  <SelectItem value="visor">Visor — solo lectura</SelectItem>
                  {roleOptions.slice(3).map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label} — rol personalizado</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2.5">
              El usuario recibirá un correo de invitación para acceder.
            </p>
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
              <p><strong className="text-violet-700">Admin:</strong> Acceso total, puede eliminar y gestionar usuarios.</p>
              <p><strong className="text-blue-700">Capturista:</strong> Puede crear y editar registros, no puede eliminar.</p>
              <p><strong className="text-slate-600">Visor:</strong> Solo puede ver la información, sin modificaciones.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {inviting ? "Enviando..." : "Enviar invitación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}