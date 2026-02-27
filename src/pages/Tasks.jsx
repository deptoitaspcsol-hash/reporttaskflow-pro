import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Search, ListTodo } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import TaskCard from "../components/tasks/TaskCard";
import TaskForm from "../components/tasks/TaskForm";

const STATUSES = [
  { value: "all", label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En Progreso" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
];

const STATUS_COLORS = {
  pendiente:   "bg-amber-100 text-amber-700",
  en_progreso: "bg-blue-100 text-blue-700",
  completada:  "bg-emerald-100 text-emerald-700",
  cancelada:   "bg-slate-100 text-slate-500",
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); setShowForm(false); setEditingTask(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const handleSubmit = (data) => {
    if (editingTask) updateMutation.mutate({ id: editingTask.id, data });
    else createMutation.mutate(data);
  };

  const handleEdit = (task) => { setEditingTask(task); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditingTask(null); };

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.worker_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.group_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.location?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Group by status columns (kanban style)
  const columns = ["pendiente", "en_progreso", "completada", "cancelada"];
  const columnLabels = { pendiente: "Pendiente", en_progreso: "En Progreso", completada: "Completada", cancelada: "Cancelada" };

  const grouped = columns.reduce((acc, s) => {
    acc[s] = filtered.filter(t => t.status === s);
    return acc;
  }, {});

  // Summary counts
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === "pendiente").length;
  const inProgress = tasks.filter(t => t.status === "en_progreso").length;
  const done = tasks.filter(t => t.status === "completada").length;

  return (
    <div>
      <PageHeader
        title="Tareas"
        subtitle={`${total} tareas registradas`}
        actions={
          <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="w-4 h-4" /> Nueva Tarea
          </Button>
        }
      />

      {/* Summary bar */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {[
          { label: "Total", count: total, color: "bg-slate-100 text-slate-700" },
          { label: "Pendientes", count: pending, color: "bg-amber-100 text-amber-700" },
          { label: "En Progreso", count: inProgress, color: "bg-blue-100 text-blue-700" },
          { label: "Completadas", count: done, color: "bg-emerald-100 text-emerald-700" },
        ].map(s => (
          <div key={s.label} className={`px-4 py-2 rounded-lg text-sm font-medium ${s.color}`}>
            {s.count} {s.label}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por título, trabajador, ubicación..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban columns */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Cargando tareas...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ListTodo} title="No hay tareas" description="Crea la primera tarea para comenzar." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(filterStatus === "all" ? columns : [filterStatus]).map(col => (
            <div key={col}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-sm font-semibold ${STATUS_COLORS[col]}`}>
                <span>{columnLabels[col]}</span>
                <span className="ml-auto bg-white/60 rounded-full px-2 py-0.5 text-xs font-bold">
                  {grouped[col]?.length || 0}
                </span>
              </div>
              <div className="space-y-3">
                {(grouped[col] || []).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Sin tareas</p>
                )}
                {(grouped[col] || []).map(task => (
                  <TaskCard key={task.id} task={task} onEdit={handleEdit} onDelete={deleteMutation.mutate} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) handleClose(); }}>
        <DialogContent className="max-w-2xl">
          <TaskForm task={editingTask} onSubmit={handleSubmit} onCancel={handleClose} />
        </DialogContent>
      </Dialog>
    </div>
  );
}