import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Phone, IdCard, Search, Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";

const defaultWorker = { full_name: "", worker_code: "", id_number: "", phone: "", group: "", work_area: "", hire_date: "", base_salary: "", status: "activo", photo_url: "" };

const generateWorkerCode = (fullName, idNumber) => {
  const nameParts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.map(p => p.charAt(0).toUpperCase()).join("");
  const idSuffix = idNumber ? String(idNumber).replace(/\D/g, "").slice(-4) : "";
  if (initials && idSuffix) return `${initials}-${idSuffix}`;
  return initials;
};

export default function Workers() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultWorker);
  const [search, setSearch] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const photoInputRef = React.useRef(null);
  const queryClient = useQueryClient();

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: () => base44.entities.Worker.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Worker.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workers"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Worker.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workers"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Worker.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workers"] }),
  });

  const closeForm = () => {
    stopCamera();
    setShowForm(false);
    setEditing(null);
    setForm(defaultWorker);
    setShowCamera(false);
  };

  const startCamera = async () => {
    setShowCamera(true);
    setTimeout(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }, 100);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      stopCamera();
      setUploadingPhoto(true);
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, photo_url: file_url }));
      setUploadingPhoto(false);
    }, "image/jpeg", 0.85);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photo_url: file_url }));
    setUploadingPhoto(false);
  };

  const handleEdit = (w) => {
    setEditing(w);
    setForm({
      full_name: w.full_name,
      worker_code: w.worker_code || "",
      id_number: w.id_number || "",
      phone: w.phone || "",
      group: w.group || "",
      work_area: w.work_area || "",
      hire_date: w.hire_date || "",
      base_salary: w.base_salary ?? "",
      status: w.status || "activo",
      photo_url: w.photo_url || ""
    });
    setShowForm(true);
  };

  const handleNameOrIdChange = (newName, newId) => {
    const resolvedName = newName !== undefined ? newName : form.full_name;
    const resolvedId = newId !== undefined ? newId : form.id_number;
    const code = generateWorkerCode(resolvedName, resolvedId);
    setForm(f => ({ ...f, full_name: newName !== undefined ? newName : f.full_name, id_number: newId !== undefined ? newId : f.id_number, worker_code: code }));
  };

  const handleSubmit = () => {
    if (!form.full_name.trim()) return;
    const data = { ...form, base_salary: form.base_salary !== "" ? Number(form.base_salary) : undefined };
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const groups = [...new Set(workers.map(w => w.group).filter(Boolean))];
  const filtered = workers.filter(w =>
    w.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    w.group?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Trabajadores"
        subtitle={`${workers.filter(w => w.status !== "inactivo").length} activos`}
        actions={
          <Button onClick={() => { setForm(defaultWorker); setEditing(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="w-4 h-4" /> Nuevo Trabajador
          </Button>
        }
      />

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por nombre o grupo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Users} title="Sin trabajadores" description="Agrega tu primer trabajador para comenzar" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(w => (
            <Card key={w.id} className="p-5 border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                    {w.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{w.full_name}</p>
                    {w.group && <p className="text-xs text-slate-400">{w.group}</p>}
                  </div>
                </div>
                <Badge variant="secondary" className={w.status === "activo" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}>
                  {w.status || "activo"}
                </Badge>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                {w.worker_code && <div className="flex items-center gap-2"><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{w.worker_code}</span></div>}
                {w.id_number && <div className="flex items-center gap-2"><IdCard className="w-3.5 h-3.5" /> {w.id_number}</div>}
                {w.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {w.phone}</div>}
                {w.work_area && <div className="flex items-center gap-2"><span className="text-slate-400">Área:</span> {w.work_area}</div>}
                {w.base_salary && <div className="flex items-center gap-2"><span className="text-emerald-600 font-medium">${Number(w.base_salary).toLocaleString()}</span></div>}
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(w)} className="text-slate-500 gap-1">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(w.id)} className="text-red-500 hover:text-red-600 gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Trabajador" : "Nuevo Trabajador"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre Completo *</Label>
                <Input
                  value={form.full_name}
                  onChange={e => handleNameOrIdChange(e.target.value, undefined)}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <Label>Código de Trabajador</Label>
                <Input
                  value={form.worker_code}
                  onChange={e => setForm({...form, worker_code: e.target.value})}
                  placeholder="Auto-generado"
                  className="bg-slate-50 font-mono text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cédula / ID</Label>
                <Input
                  value={form.id_number}
                  onChange={e => handleNameOrIdChange(undefined, e.target.value)}
                  placeholder="Identificación"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Teléfono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha de Ingreso</Label>
                <Input type="date" value={form.hire_date} onChange={e => setForm({...form, hire_date: e.target.value})} />
              </div>
              <div>
                <Label>Salario Base</Label>
                <Input type="number" value={form.base_salary} onChange={e => setForm({...form, base_salary: e.target.value})} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Área de Trabajo</Label>
                <Input value={form.work_area} onChange={e => setForm({...form, work_area: e.target.value})} placeholder="Ej: Campo Norte" list="areas-list" />
                <datalist id="areas-list">
                  {[...new Set(workers.map(w => w.work_area).filter(Boolean))].map(a => <option key={a} value={a} />)}
                </datalist>
              </div>
              <div>
                <Label>Grupo</Label>
                <Input value={form.group} onChange={e => setForm({...form, group: e.target.value})} placeholder="Ej: Cuadrilla A" list="groups-list" />
                <datalist id="groups-list">
                  {groups.map(g => <option key={g} value={g} />)}
                </datalist>
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