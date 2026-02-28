import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, UserPlus, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import PageHeader from "../components/shared/PageHeader";
import RoleBadge from "../components/shared/RoleBadge";
import { useRole } from "../components/shared/useRole";
import { toast } from "sonner";

export default function UserManagement() {
  const { isAdmin, isLoading: roleLoading } = useRole();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("visor");
  const [inviting, setInviting] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Rol actualizado");
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail.trim(), inviteRole === "admin" ? "admin" : "user");
    // After invite, update role if not admin (since inviteUser only supports 'user'/'admin')
    toast.success(`Invitación enviada a ${inviteEmail}`);
    setInviteEmail("");
    setInviteRole("visor");
    setShowInvite(false);
    setInviting(false);
    queryClient.invalidateQueries({ queryKey: ["users"] });
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
            <Mail className="w-4 h-4" /> Invitar Usuario
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <Card key={u.id} className="p-5 border-slate-200/80 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm">
                  {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{u.full_name || "Sin nombre"}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
              </div>
              <RoleBadge role={u.role || "visor"} />
            </div>
            <div className="pt-3 border-t border-slate-100">
              <Label className="text-xs text-slate-500 mb-1 block">Cambiar rol</Label>
              <Select
                value={u.role || "visor"}
                onValueChange={(val) => updateRoleMutation.mutate({ id: u.id, role: val })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="capturista">Capturista</SelectItem>
                  <SelectItem value="visor">Visor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        ))}
      </div>

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invitar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Correo electrónico</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div>
              <Label>Rol inicial</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — acceso total</SelectItem>
                  <SelectItem value="capturista">Capturista — crear y editar</SelectItem>
                  <SelectItem value="visor">Visor — solo lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
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