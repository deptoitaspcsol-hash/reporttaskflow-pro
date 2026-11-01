import React, { useState } from "react";
import { api } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Phone, Shield } from "lucide-react";
import { useRole } from "../components/shared/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";

const GROUP_COLORS = [
  { label: "Esmeralda", value: "#10b981" },
  { label: "Azul", value: "#3b82f6" },
  { label: "Violeta", value: "#8b5cf6" },
  { label: "Ámbar", value: "#f59e0b" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Cian", value: "#06b6d4" },
  { label: "Naranja", value: "#f97316" },
  { label: "Rojo", value: "#ef4444" },
];

const defaultForm = { name: "", supervisor_name: "", supervisor_phone: "", description: "", color: "#10b981", status: "activo" };

export default function WorkerGroups() {
  const { canWrite, canDelete } = useRole("worker_groups");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["workerGroups"],
    queryFn: () => api.entities.WorkerGroup.list("-created_date"),
  });
  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: () => api.entities.Worker.list(),
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api.entities.DailyReport.list("-date", 1000),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.WorkerGroup.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workerGroups"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.WorkerGroup.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workerGroups"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.WorkerGroup.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workerGroups"] }),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(defaultForm); };

  const handleEdit = (g) => {
    setEditing(g);
    setForm({ name: g.name, supervisor_name: g.supervisor_name || "", supervisor_phone: g.supervisor_phone || "", description: g.description || "", color: g.color || "#10b981", status: g.status || "activo" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  // Stats per group
  const getGroupStats = (groupName) => {
    const gWorkers = workers.filter(w => w.group === groupName && w.status !== "inactivo");
    const gReports = reports.filter(r => r.group === groupName);
    const openReports = gReports.filter(r => r.status === "abierto");
    const totalAmount = gReports.reduce((s, r) => s + (r.amount || 0), 0);
    const pendingAmount = openReports.reduce((s, r) => s + (r.amount || 0), 0);
    return { workerCount: gWorkers.length, taskCount: gReports.length, totalAmount, pendingAmount };
  };

  return (
    <div>
      <PageHeader
        title="Grupos de Trabajadores"
        subtitle={`${groups.filter(g => g.status !== "inactivo").length} grupos activos`}
        actions={
          canWrite ? (
            <Button onClick={() => { setForm(defaultForm); setEditing(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" /> Nuevo Grupo
            </Button>
          ) : null
        }
      />

      {groups.length === 0 && !isLoading ? (
        <EmptyState icon={Users} title="Sin grupos" description="Crea grupos para organizar a tus trabajadores" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map(g => {
            const stats = getGroupStats(g.name);
            return (
              <Card key={g.id} className="overflow-hidden border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                {/* Color bar */}
                <div className="h-1.5 w-full" style={{ backgroundColor: g.color || "#10b981" }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${g.color || "#10b981"}20` }}>
                        <Users className="w-5 h-5" style={{ color: g.color || "#10b981" }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{g.name}</h3>
                        <Badge variant="secondary" className={g.status === "activo" ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs" : "bg-slate-100 text-slate-500 text-xs"}>
                          {g.status || "activo"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {g.supervisor_name && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">{g.supervisor_name}</span>
                      </div>
                      {g.supervisor_phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Phone className="w-3.5 h-3.5" />
                          {g.supervisor_phone}
                        </div>
                      )}
                    </div>
                  )}

                  {g.description && (
                    <p className="text-xs text-slate-500 mb-4">{g.description}</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-slate-800">{stats.workerCount}</p>
                      <p className="text-xs text-slate-400">Trabaj.</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-slate-800">{stats.taskCount}</p>
                      <p className="text-xs text-slate-400">Tareas</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${g.color || "#10b981"}15` }}>
                      <p className="text-sm font-bold" style={{ color: g.color || "#10b981" }}>${stats.totalAmount.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">Total</p>
                    </div>
                  </div>

                  {(canWrite || canDelete) && (
                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      {canWrite && (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(g)} className="text-slate-500 gap-1">
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(g.id)} className="text-red-500 hover:text-red-600 gap-1">
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Grupo" : "Nuevo Grupo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre del Grupo *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Cuadrilla A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Responsable / Capataz</Label>
                <Input value={form.supervisor_name} onChange={e => setForm({...form, supervisor_name: e.target.value})} placeholder="Nombre del responsable" />
              </div>
              <div>
                <Label>Teléfono Responsable</Label>
                <Input value={form.supervisor_phone} onChange={e => setForm({...form, supervisor_phone: e.target.value})} placeholder="Teléfono" />
              </div>
            </div>
            <div>
              <Label>Color identificador</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {GROUP_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setForm({...form, color: c.value})}
                    className={`w-7 h-7 rounded-full transition-all ${form.color === c.value ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-105"}`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Notas sobre el grupo..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              {editing ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}