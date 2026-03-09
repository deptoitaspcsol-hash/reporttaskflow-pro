import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import { useRole } from "../components/shared/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import BulkUploadWorkTypes from "../components/workTypes/BulkUploadWorkTypes";

const defaultWork = { code: "", name: "", description: "", unit: "", rate: 0, category: "", labor_type: "", cost_center: "", cost_center_2: "" };

export default function WorkTypes() {
  const { canWrite, canDelete } = useRole();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultWork);
  const queryClient = useQueryClient();

  const { data: workTypes = [], isLoading } = useQuery({
    queryKey: ["workTypes"],
    queryFn: () => base44.entities.WorkType.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkType.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workTypes"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkType.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workTypes"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkType.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workTypes"] }),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(defaultWork); };

  const handleEdit = (wt) => {
    setEditing(wt);
    setForm({ code: wt.code || "", name: wt.name, description: wt.description || "", unit: wt.unit, rate: wt.rate, category: wt.category || "", labor_type: wt.labor_type || "", cost_center: wt.cost_center || "", cost_center_2: wt.cost_center_2 || "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.unit.trim()) return;
    const data = { ...form, rate: Number(form.rate) };
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  return (
    <div>
      <PageHeader
        title="Tipos de Labores"
        subtitle={`${workTypes.length} labores registradas`}
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <BulkUploadWorkTypes onDone={() => queryClient.invalidateQueries({ queryKey: ["workTypes"] })} />
              <Button onClick={() => { setForm(defaultWork); setEditing(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="w-4 h-4" /> Nueva Labor
              </Button>
            </div>
          ) : null
        }
      />

      {workTypes.length === 0 && !isLoading ? (
        <EmptyState icon={Briefcase} title="Sin labores" description="Define los tipos de labores y sus tarifas" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workTypes.map(wt => (
            <Card key={wt.id} className="p-5 border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-800">{wt.name}</p>
                  <div className="flex gap-2 flex-wrap mt-0.5">
                    {wt.code && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">{wt.code}</span>}
                    {wt.category && <span className="text-xs text-slate-400">{wt.category}</span>}
                    {wt.cost_center && <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-white">CC {wt.cost_center}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="font-bold text-sm">{wt.rate?.toLocaleString()}</span>
                  <span className="text-xs text-emerald-600">/{wt.unit}</span>
                </div>
              </div>
              {wt.description && <p className="text-xs text-slate-500 mt-2">{wt.description}</p>}
              {(canWrite || canDelete) && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  {canWrite && (
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(wt)} className="text-slate-500 gap-1">
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(wt.id)} className="text-red-500 hover:text-red-600 gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Labor" : "Nueva Labor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código de Labor</Label>
                <Input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Ej: LAB-001" />
              </div>
              <div>
                <Label>Nombre de la Labor *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Limpieza de terreno" />
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descripción breve" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unidad de medida *</Label>
                <Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="Ej: metros, horas" />
              </div>
              <div>
                <Label>Tarifa por unidad *</Label>
                <Input type="number" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoría</Label>
                <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Ej: Construcción" />
              </div>
              <div>
                <Label>Tipo de Labor</Label>
                <Input value={form.labor_type} onChange={e => setForm({...form, labor_type: e.target.value})} placeholder="Ej: Destajo, Jornal" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Centro de Costo</Label>
                <Select value={form.cost_center} onValueChange={(val) => setForm({...form, cost_center: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Ninguno</SelectItem>
                    <SelectItem value="1">Centro 1</SelectItem>
                    <SelectItem value="2">Centro 2</SelectItem>
                    <SelectItem value="3">Centro 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Centro de Costo 2</Label>
                <Select value={form.cost_center_2} onValueChange={(val) => setForm({...form, cost_center_2: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Ninguno</SelectItem>
                    <SelectItem value="1">Centro 1</SelectItem>
                    <SelectItem value="2">Centro 2</SelectItem>
                    <SelectItem value="3">Centro 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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