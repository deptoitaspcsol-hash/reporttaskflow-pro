import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

const CONDITIONS = [
  { value: "excelente", label: "Excelente" },
  { value: "bueno", label: "Bueno" },
  { value: "regular", label: "Regular" },
  { value: "malo", label: "Malo" },
];

export default function AssignmentForm({ open, onClose, equipment, workers, groups, onSave, defaultType = "entrega" }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({
    type: defaultType,
    assigned_to: "worker",
    worker_id: "",
    worker_name: "",
    group_name: "",
    date: today,
    expected_return: "",
    condition_out: "bueno",
    condition_in: "bueno",
    maintenance_cost: "",
    maintenance_provider: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      equipment_id: equipment.id,
      equipment_name: equipment.name,
      equipment_code: equipment.code || "",
      maintenance_cost: form.maintenance_cost !== "" ? Number(form.maintenance_cost) : undefined,
    };
    await base44.entities.EquipmentAssignment.create(data);

    // Update equipment status accordingly
    let newStatus = equipment.status;
    if (form.type === "entrega") newStatus = "asignado";
    else if (form.type === "devolucion") newStatus = "disponible";
    else if (form.type === "mantenimiento") newStatus = "mantenimiento";
    await base44.entities.Equipment.update(equipment.id, { status: newStatus });

    setSaving(false);
    onSave();
  };

  const isEntrega = form.type === "entrega";
  const isDevolucion = form.type === "devolucion";
  const isMant = form.type === "mantenimiento";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEntrega ? "Registrar Entrega" : isDevolucion ? "Registrar Devolución" : "Registrar Mantenimiento"}
            <span className="text-slate-400 font-normal text-sm ml-2">— {equipment?.name}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Tipo de Movimiento</Label>
            <Select value={form.type} onValueChange={v => set("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrega">Entrega</SelectItem>
                <SelectItem value="devolucion">Devolución</SelectItem>
                <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(isEntrega || isDevolucion) && (
            <>
              <div className="space-y-1">
                <Label>Asignar a</Label>
                <Select value={form.assigned_to} onValueChange={v => set("assigned_to", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Trabajador</SelectItem>
                    <SelectItem value="group">Grupo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.assigned_to === "worker" ? (
                <div className="space-y-1">
                  <Label>Trabajador</Label>
                  <Select value={form.worker_id} onValueChange={v => {
                    const w = workers.find(x => x.id === v);
                    set("worker_id", v);
                    set("worker_name", w?.full_name || "");
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>Grupo</Label>
                  <Select value={form.group_name} onValueChange={v => set("group_name", v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {groups.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            {isEntrega && (
              <div className="space-y-1">
                <Label>Devolución Esperada</Label>
                <Input type="date" value={form.expected_return} onChange={e => set("expected_return", e.target.value)} />
              </div>
            )}
          </div>

          {isEntrega && (
            <div className="space-y-1">
              <Label>Condición al Entregar</Label>
              <Select value={form.condition_out} onValueChange={v => set("condition_out", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {isDevolucion && (
            <div className="space-y-1">
              <Label>Condición al Devolver</Label>
              <Select value={form.condition_in} onValueChange={v => set("condition_in", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {isMant && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Costo Mantenimiento</Label>
                <Input type="number" value={form.maintenance_cost} onChange={e => set("maintenance_cost", e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>Proveedor</Label>
                <Input value={form.maintenance_provider} onChange={e => set("maintenance_provider", e.target.value)} placeholder="Taller..." />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Guardando..." : "Registrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}