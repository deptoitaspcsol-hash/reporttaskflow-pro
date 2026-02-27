import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Paperclip, X, Upload, Loader2, Check } from "lucide-react";

const STATUSES = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En Progreso" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
];

const PRIORITIES = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

export default function TaskForm({ task, onSubmit, onCancel }) {
  const [form, setForm] = useState(task || {
    title: "", description: "", location: "", assigned_to: "worker",
    worker_ids: [], worker_names: [], worker_id: "", worker_name: "",
    group_name: "", work_type_id: "", work_type_name: "",
    start_date: "", end_date: "", estimated_cost: "",
    status: "pendiente", priority: "media", attachments: [], notes: "",
  });
  const [uploading, setUploading] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");

  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: () => base44.entities.Worker.list(),
  });
  const { data: workTypes = [] } = useQuery({
    queryKey: ["workTypes"],
    queryFn: () => base44.entities.WorkType.list(),
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["workerGroups"],
    queryFn: () => base44.entities.WorkerGroup.list(),
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleWorker = (id) => {
    const w = workers.find(w => w.id === id);
    set("worker_id", id);
    set("worker_name", w?.full_name || "");
  };

  const handleWorkType = (id) => {
    const wt = workTypes.find(w => w.id === id);
    set("work_type_id", id);
    set("work_type_name", wt?.name || "");
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [...(form.attachments || [])];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    set("attachments", urls);
    setUploading(false);
  };

  const removeAttachment = (idx) => {
    const updated = [...(form.attachments || [])];
    updated.splice(idx, 1);
    set("attachments", updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : undefined });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{task ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto px-1">
        {/* Title */}
        <div className="space-y-1">
          <Label>Título *</Label>
          <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Nombre de la tarea" required />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label>Descripción</Label>
          <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} placeholder="Detalle la tarea..." />
        </div>

        {/* Work Type & Location */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Labor</Label>
            <Select value={form.work_type_id} onValueChange={handleWorkType}>
              <SelectTrigger><SelectValue placeholder="Tipo de labor" /></SelectTrigger>
              <SelectContent>
                {workTypes.map(wt => <SelectItem key={wt.id} value={wt.id}>{wt.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Ubicación</Label>
            <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Ej: Lote Norte" />
          </div>
        </div>

        {/* Assigned to */}
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
            <Select value={form.worker_id} onValueChange={handleWorker}>
              <SelectTrigger><SelectValue placeholder="Seleccionar trabajador" /></SelectTrigger>
              <SelectContent>
                {workers.filter(w => w.status !== "inactivo").map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1">
            <Label>Grupo</Label>
            <Select value={form.group_name} onValueChange={v => set("group_name", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
              <SelectContent>
                {groups.filter(g => g.status !== "inactivo").map(g => (
                  <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Fecha inicio *</Label>
            <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Fecha fin estimada</Label>
            <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} />
          </div>
        </div>

        {/* Cost, Status, Priority */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Costo estimado</Label>
            <Input type="number" value={form.estimated_cost} onChange={e => set("estimated_cost", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Prioridad</Label>
            <Select value={form.priority} onValueChange={v => set("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Observaciones adicionales..." />
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label>Archivos / Fotos</Label>
          <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-500 hover:bg-slate-50 transition-colors">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Subiendo..." : "Adjuntar archivos o fotos"}
            <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
          {(form.attachments || []).length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {form.attachments.map((url, i) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
                return (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-square flex items-center justify-center">
                    {isImage ? (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-2">
                        <Paperclip className="w-5 h-5 text-slate-400" />
                        <span className="text-xs text-slate-400 truncate w-full text-center">Archivo {i + 1}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {task ? "Guardar cambios" : "Crear tarea"}
        </Button>
      </DialogFooter>
    </form>
  );
}