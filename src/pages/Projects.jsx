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
import { Plus, Pencil, Trash2, FolderOpen, ListTodo, Calendar } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import { toast } from "sonner";

const PROJECT_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

const defaultForm = () => ({
  name: "", description: "", color: PROJECT_COLORS[0],
  status: "activo", start_date: "", end_date: "", notes: ""
});

export default function Projects() {
  const { canWrite, canDelete } = useRole("projects");
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm());

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.entities.Project.list("-created_date"),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.entities.Task.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Project.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); closeForm(); toast.success("Proyecto creado"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Project.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); closeForm(); toast.success("Proyecto actualizado"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Project.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); toast.success("Proyecto eliminado"); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(defaultForm()); };

  const handleEdit = (project) => {
    setEditing(project);
    setForm({ name: project.name, description: project.description || "", color: project.color || PROJECT_COLORS[0], status: project.status || "activo", start_date: project.start_date || "", end_date: project.end_date || "", notes: project.notes || "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return; }
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const getProjectStats = (projectId) => {
    const projectTasks = tasks.filter(t => t.project_id === projectId);
    return {
      total: projectTasks.length,
      pendiente: projectTasks.filter(t => t.status === "pendiente").length,
      en_progreso: projectTasks.filter(t => t.status === "en_progreso").length,
      completada: projectTasks.filter(t => t.status === "completada").length,
    };
  };

  return (
    <div>
      <PageHeader
        title="Proyectos"
        subtitle={`${projects.length} proyectos registrados`}
        actions={
          canWrite && (
            <Button onClick={() => { closeForm(); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" /> Nuevo Proyecto
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Cargando proyectos...</div>
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No hay proyectos" description="Crea el primer proyecto para organizar las tareas." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const stats = getProjectStats(project.id);
            const pct = stats.total > 0 ? Math.round((stats.completada / stats.total) * 100) : 0;
            return (
              <Card key={project.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Color strip */}
                <div className="h-1.5 w-full" style={{ backgroundColor: project.color || "#6366f1" }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${project.color || "#6366f1"}20` }}>
                        <FolderOpen className="w-4.5 h-4.5" style={{ color: project.color || "#6366f1" }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{project.name}</h3>
                        <Badge variant={project.status === "activo" ? "outline" : "secondary"} className="text-[10px] mt-0.5">
                          {project.status === "activo" ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700" onClick={() => handleEdit(project)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => deleteMutation.mutate(project.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {project.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description}</p>
                  )}

                  {(project.start_date || project.end_date) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      {project.start_date}{project.end_date ? ` → ${project.end_date}` : ""}
                    </div>
                  )}

                  {/* Task stats */}
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span className="flex items-center gap-1"><ListTodo className="w-3.5 h-3.5" /> {stats.total} tareas</span>
                      <span className="font-medium" style={{ color: project.color || "#6366f1" }}>{pct}% completado</span>
                    </div>
                    {stats.total > 0 && (
                      <>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: project.color || "#6366f1" }} />
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span className="text-amber-600">{stats.pendiente} pendientes</span>
                          <span className="text-blue-600">{stats.en_progreso} en curso</span>
                          <span className="text-emerald-600">{stats.completada} listas</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) closeForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Proyecto" : "Nuevo Proyecto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del proyecto" />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Breve descripción..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha inicio</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fecha fin</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-1">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap pt-1">
                  {PROJECT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: form.color === c ? "#1e293b" : "transparent" }}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              {editing ? "Guardar cambios" : "Crear proyecto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}