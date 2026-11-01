import React, { useState } from "react";
import { api } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import { useRole } from "../components/shared/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import BulkUploadWorkTypes from "../components/workTypes/BulkUploadWorkTypes";
import CreatableSelect from "../components/workTypes/CreatableSelect";

const defaultWork = { code: "", name: "", description: "", unit: "", rate: 0, category: "", labor_type: "", cost_center: "", cost_center_2: "" };

const DEFAULT_LABOR_TYPES = ["Destajo", "Jornal", "Servicio", "Contrato"];
const DEFAULT_COST_CENTERS = ["1", "2", "3"];

export default function WorkTypes() {
  const { canWrite, canDelete } = useRole("work_types");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultWork);
  const [laborTypeOptions, setLaborTypeOptions] = useState(DEFAULT_LABOR_TYPES);
  const [costCenter1Options, setCostCenter1Options] = useState(DEFAULT_COST_CENTERS);
  const [costCenter2Options, setCostCenter2Options] = useState(DEFAULT_COST_CENTERS);
  const [formErrors, setFormErrors] = useState({});
  const queryClient = useQueryClient();

  const { data: workTypes = [], isLoading } = useQuery({
    queryKey: ["workTypes"],
    queryFn: () => api.entities.WorkType.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.WorkType.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workTypes"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.WorkType.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workTypes"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.WorkType.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workTypes"] }),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(defaultWork); setFormErrors({}); };

  const handleEdit = (wt) => {
    setEditing(wt);
    setForm({ code: wt.code || "", name: wt.name, description: wt.description || "", unit: wt.unit, rate: wt.rate, category: wt.category || "", labor_type: wt.labor_type || "", cost_center: wt.cost_center || "", cost_center_2: wt.cost_center_2 || "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "El nombre es requerido";
    if (!form.unit.trim()) errors.unit = "La unidad es requerida";

    const othersWithSameName = workTypes.filter(wt => wt.id !== editing?.id && wt.name.trim().toLowerCase() === form.name.trim().toLowerCase());
    if (othersWithSameName.length > 0) errors.name = "Ya existe una labor con ese nombre";

    if (form.code.trim()) {
      const othersWithSameCode = workTypes.filter(wt => wt.id !== editing?.id && wt.code?.trim().toLowerCase() === form.code.trim().toLowerCase());
      if (othersWithSameCode.length > 0) errors.code = "Ya existe una labor con ese código";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

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
              <BulkUploadWorkTypes existingWorkTypes={workTypes} onDone={() => queryClient.invalidateQueries({ queryKey: ["workTypes"] })} />
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
                <Input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Ej: LAB-001" className={formErrors.code ? "border-red-400" : ""} />
                {formErrors.code && <p className="text-xs text-red-500 mt-1">{formErrors.code}</p>}
              </div>
              <div>
                <Label>Nombre de la Labor *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Limpieza de terreno" className={formErrors.name ? "border-red-400" : ""} />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descripción breve" />
            </div>
            <div>
              <Label>Unidad de medida *</Label>
              <Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="Ej: metros, horas" className={formErrors.unit ? "border-red-400" : ""} />
              {formErrors.unit && <p className="text-xs text-red-500 mt-1">{formErrors.unit}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoría</Label>
                <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Ej: Construcción" />
              </div>
              <div>
                <Label>Tipo de Labor</Label>
                <CreatableSelect
                  value={form.labor_type}
                  onValueChange={(val) => setForm({...form, labor_type: val})}
                  options={laborTypeOptions}
                  setOptions={setLaborTypeOptions}
                  placeholder="Seleccionar tipo"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Centro de Costo 1</Label>
                <CreatableSelect
                  value={form.cost_center}
                  onValueChange={(val) => setForm({...form, cost_center: val})}
                  options={costCenter1Options}
                  setOptions={setCostCenter1Options}
                  placeholder="Seleccionar"
                />
              </div>
              <div>
                <Label>Centro de Costo 2</Label>
                <CreatableSelect
                  value={form.cost_center_2}
                  onValueChange={(val) => setForm({...form, cost_center_2: val})}
                  options={costCenter2Options}
                  setOptions={setCostCenter2Options}
                  placeholder="Seleccionar"
                />
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