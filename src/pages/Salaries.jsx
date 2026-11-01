import React, { useState } from "react";
import { api } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "../components/shared/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, DollarSign, Users } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import { toast } from "sonner";

const PERIODS = [
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
];

const defaultForm = () => ({
  name: "", description: "", amount: "", period: "mensual", category: "", status: "activo"
});

export default function Salaries() {
  const { canWrite, canDelete } = useRole();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm());

  const { data: scales = [], isLoading } = useQuery({
    queryKey: ["salaryScales"],
    queryFn: () => api.entities.SalaryScale.list("-created_date"),
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: () => api.entities.Worker.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.SalaryScale.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["salaryScales"] }); closeForm(); toast.success("Escala salarial creada"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.SalaryScale.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["salaryScales"] }); closeForm(); toast.success("Escala actualizada"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.SalaryScale.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["salaryScales"] }); toast.success("Escala eliminada"); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(defaultForm()); };

  const handleEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description || "", amount: s.amount, period: s.period || "mensual", category: s.category || "", status: s.status || "activo" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error("El monto debe ser mayor a 0"); return; }
    const data = { ...form, amount: Number(form.amount) };
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const getWorkerCount = (scaleId) => workers.filter(w => w.salary_scale_id === scaleId).length;

  const periodLabel = (p) => PERIODS.find(x => x.value === p)?.label || p;

  const categories = [...new Set(scales.map(s => s.category).filter(Boolean))];

  return (
    <div>
      <PageHeader
        title="Escalas Salariales"
        subtitle={`${scales.filter(s => s.status === "activo").length} escalas activas`}
        actions={
          canWrite && (
            <Button onClick={() => { closeForm(); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" /> Nueva Escala
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Cargando...</div>
      ) : scales.length === 0 ? (
        <EmptyState icon={DollarSign} title="Sin escalas salariales" description="Crea tu primera escala para gestionar los salarios." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scales.map(scale => {
            const wCount = getWorkerCount(scale.id);
            return (
              <Card key={scale.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-1.5 bg-emerald-500 w-full" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{scale.name}</h3>
                      {scale.category && <p className="text-xs text-slate-500 mt-0.5">{scale.category}</p>}
                    </div>
                    <Badge variant={scale.status === "activo" ? "outline" : "secondary"} className={`shrink-0 text-xs ${scale.status === "activo" ? "text-emerald-700 border-emerald-200 bg-emerald-50" : ""}`}>
                      {scale.status === "activo" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>

                  {scale.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{scale.description}</p>}

                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-2xl font-bold text-emerald-700">${Number(scale.amount).toLocaleString()}</span>
                    <span className="text-xs text-slate-400">/ {periodLabel(scale.period)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <Users className="w-3.5 h-3.5" />
                    <span>{wCount} trabajador(es) asignado(s)</span>
                  </div>

                  {canWrite && (
                    <div className="flex gap-1 mt-3 pt-2 border-t border-slate-100">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(scale)} className="text-slate-500 gap-1 flex-1">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(scale.id)} className="text-red-500 hover:text-red-600 gap-1 flex-1">
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

      <Dialog open={showForm} onOpenChange={v => { if (!v) closeForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Escala Salarial" : "Nueva Escala Salarial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Operario de Campo" />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Descripción del puesto o categoría..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Monto *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="pl-9" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Periodo</Label>
                <Select value={form.period} onValueChange={v => setForm(f => ({ ...f, period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ej: Campo, Admin" list="cat-list" />
                <datalist id="cat-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              {editing ? "Guardar cambios" : "Crear escala"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}