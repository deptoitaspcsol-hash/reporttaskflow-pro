import React, { useState } from "react";
import { api } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Phone, IdCard, Search, Camera, Upload, X, DollarSign } from "lucide-react";
import { useRole } from "../components/shared/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import BulkUploadWorkers from "../components/workers/BulkUploadWorkers";

const defaultWorker = { full_name: "", worker_code: "", id_number: "", phone: "", group: "", work_area: "", hire_date: "", base_salary: "", salary_scale_id: "", salary_scale_name: "", status: "activo", photo_url: "" };

const generateWorkerCode = (fullName, idNumber) => {
  const nameParts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.map(p => p.charAt(0).toUpperCase()).join("");
  const idSuffix = idNumber ? String(idNumber).replace(/\D/g, "").slice(-4) : "";
  if (initials && idSuffix) return `${initials}-${idSuffix}`;
  return initials;
};

export default function Workers() {
  const { canWrite, canDelete } = useRole("workers");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultWorker);
  const [search, setSearch] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [errors, setErrors] = useState({});
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const photoInputRef = React.useRef(null);
  const queryClient = useQueryClient();

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: () => api.entities.Worker.list("-created_date"),
  });

  const { data: salaryScales = [] } = useQuery({
    queryKey: ["salaryScales"],
    queryFn: () => api.entities.SalaryScale.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Worker.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workers"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Worker.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workers"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Worker.delete(id),
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
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, photo_url: file_url }));
      setUploadingPhoto(false);
    }, "image/jpeg", 0.85);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await api.integrations.Core.UploadFile({ file });
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
      salary_scale_id: w.salary_scale_id || "",
      salary_scale_name: w.salary_scale_name || "",
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
    const newErrors = {};
    if (!form.full_name.trim()) newErrors.full_name = "Requerido";
    if (!form.id_number.trim()) newErrors.id_number = "Requerido";
    if (!form.phone.trim()) newErrors.phone = "Requerido";
    if (!form.hire_date) newErrors.hire_date = "Requerido";
    if (form.base_salary === "" || form.base_salary === null) newErrors.base_salary = "Requerido";
    if (!form.group.trim()) newErrors.group = "Requerido";
    if (!form.photo_url) newErrors.photo_url = "La foto es obligatoria";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
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
          canWrite ? (
            <div className="flex gap-2">
              <BulkUploadWorkers onDone={() => queryClient.invalidateQueries({ queryKey: ["workers"] })} />
              <Button onClick={() => { setForm(defaultWorker); setEditing(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="w-4 h-4" /> Nuevo Trabajador
              </Button>
            </div>
          ) : null
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
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm overflow-hidden">
                    {w.photo_url ? (
                      <img src={w.photo_url} alt={w.full_name} className="w-full h-full object-cover" />
                    ) : (
                      w.full_name?.charAt(0)?.toUpperCase()
                    )}
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
              {(canWrite || canDelete) && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  {canWrite && (
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(w)} className="text-slate-500 gap-1">
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(w.id)} className="text-red-500 hover:text-red-600 gap-1">
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
            <DialogTitle>{editing ? "Editar Trabajador" : "Nuevo Trabajador"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Photo upload section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                {form.photo_url ? (
                  <>
                    <img src={form.photo_url} alt="Foto" className="w-full h-full object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, photo_url: "" }))} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : uploadingPhoto ? (
                  <span className="text-xs text-slate-400">Subiendo...</span>
                ) : (
                  <span className="text-3xl text-slate-300">👤</span>
                )}
              </div>
              {showCamera ? (
                <div className="w-full flex flex-col items-center gap-2">
                  <video ref={videoRef} autoPlay playsInline className="w-full max-w-xs rounded-lg border" />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={capturePhoto} className="bg-emerald-600 hover:bg-emerald-700 gap-1"><Camera className="w-4 h-4" /> Tomar foto</Button>
                    <Button type="button" size="sm" variant="outline" onClick={stopCamera}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} className="gap-1">
                      <Upload className="w-3.5 h-3.5" /> Subir imagen
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={startCamera} disabled={uploadingPhoto} className="gap-1">
                      <Camera className="w-3.5 h-3.5" /> Cámara
                    </Button>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </div>
                  {errors.photo_url && <p className="text-xs text-red-500">{errors.photo_url}</p>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre Completo *</Label>
                <Input
                  value={form.full_name}
                  onChange={e => { handleNameOrIdChange(e.target.value, undefined); setErrors(er => ({...er, full_name: ""})); }}
                  placeholder="Nombre completo"
                  className={errors.full_name ? "border-red-400" : ""}
                />
                {errors.full_name && <p className="text-xs text-red-500 mt-0.5">{errors.full_name}</p>}
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
                <Label>Cédula / ID *</Label>
                <Input
                  value={form.id_number}
                  onChange={e => { handleNameOrIdChange(undefined, e.target.value); setErrors(er => ({...er, id_number: ""})); }}
                  placeholder="Identificación"
                  className={errors.id_number ? "border-red-400" : ""}
                />
                {errors.id_number && <p className="text-xs text-red-500 mt-0.5">{errors.id_number}</p>}
              </div>
              <div>
                <Label>Teléfono *</Label>
                <Input value={form.phone} onChange={e => { setForm({...form, phone: e.target.value}); setErrors(er => ({...er, phone: ""})); }} placeholder="Teléfono" className={errors.phone ? "border-red-400" : ""} />
                {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha de Ingreso *</Label>
                <Input type="date" value={form.hire_date} onChange={e => { setForm({...form, hire_date: e.target.value}); setErrors(er => ({...er, hire_date: ""})); }} className={errors.hire_date ? "border-red-400" : ""} />
                {errors.hire_date && <p className="text-xs text-red-500 mt-0.5">{errors.hire_date}</p>}
              </div>
              <div>
                <Label>Salario Base *</Label>
                <div className="space-y-1.5">
                  {salaryScales.filter(s => s.status === "activo").length > 0 && (
                    <Select
                      value={form.salary_scale_id || "__manual__"}
                      onValueChange={v => {
                        if (v === "__manual__") {
                          setForm(f => ({ ...f, salary_scale_id: "", salary_scale_name: "" }));
                        } else {
                          const scale = salaryScales.find(s => s.id === v);
                          setForm(f => ({ ...f, salary_scale_id: v, salary_scale_name: scale?.name || "", base_salary: scale?.amount ?? f.base_salary }));
                          setErrors(er => ({ ...er, base_salary: "" }));
                        }
                      }}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 mr-1" />
                        <SelectValue placeholder="Elegir escala..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__manual__">Ingresar manualmente</SelectItem>
                        {salaryScales.filter(s => s.status === "activo").map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} — ${Number(s.amount).toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input type="number" value={form.base_salary} onChange={e => { setForm({...form, base_salary: e.target.value, salary_scale_id: "", salary_scale_name: ""}); setErrors(er => ({...er, base_salary: ""})); }} placeholder="0.00" className={errors.base_salary ? "border-red-400" : ""} />
                </div>
                {errors.base_salary && <p className="text-xs text-red-500 mt-0.5">{errors.base_salary}</p>}
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
                <Label>Grupo *</Label>
                <Input value={form.group} onChange={e => { setForm({...form, group: e.target.value}); setErrors(er => ({...er, group: ""})); }} placeholder="Ej: Cuadrilla A" list="groups-list" className={errors.group ? "border-red-400" : ""} />
                <datalist id="groups-list">
                  {groups.map(g => <option key={g} value={g} />)}
                </datalist>
                {errors.group && <p className="text-xs text-red-500 mt-0.5">{errors.group}</p>}
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