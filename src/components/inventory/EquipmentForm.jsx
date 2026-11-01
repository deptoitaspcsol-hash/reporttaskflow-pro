import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/api/client";

const CATEGORIES = [
  { value: "herramienta_manual", label: "Herramienta Manual" },
  { value: "herramienta_electrica", label: "Herramienta Eléctrica" },
  { value: "maquinaria", label: "Maquinaria" },
  { value: "vehiculo", label: "Vehículo" },
  { value: "equipo_proteccion", label: "Equipo de Protección" },
  { value: "otro", label: "Otro" },
];

export default function EquipmentForm({ open, onClose, equipment, onSave }) {
  const isEdit = !!equipment?.id;
  const [form, setForm] = useState(equipment || {
    name: "", code: "", category: "herramienta_manual",
    description: "", status: "disponible",
    purchase_date: "", purchase_cost: "", current_value: "", location: "", notes: ""
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = {
      ...form,
      purchase_cost: form.purchase_cost !== "" ? Number(form.purchase_cost) : undefined,
      current_value: form.current_value !== "" ? Number(form.current_value) : undefined,
    };
    if (isEdit) await api.entities.Equipment.update(equipment.id, data);
    else await api.entities.Equipment.create(data);
    setSaving(false);
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Equipo" : "Nuevo Equipo / Herramienta"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="col-span-2 space-y-1">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ej: Motosierra Stihl MS 250" />
          </div>
          <div className="space-y-1">
            <Label>Código / Serie</Label>
            <Input value={form.code || ""} onChange={e => set("code", e.target.value)} placeholder="SN-001" />
          </div>
          <div className="space-y-1">
            <Label>Categoría</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Costo de Compra</Label>
            <Input type="number" value={form.purchase_cost || ""} onChange={e => set("purchase_cost", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label>Valor Actual</Label>
            <Input type="number" value={form.current_value || ""} onChange={e => set("current_value", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label>Fecha de Compra</Label>
            <Input type="date" value={form.purchase_date || ""} onChange={e => set("purchase_date", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Ubicación / Almacén</Label>
            <Input value={form.location || ""} onChange={e => set("location", e.target.value)} placeholder="Bodega A" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Guardando..." : isEdit ? "Actualizar" : "Crear Equipo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}