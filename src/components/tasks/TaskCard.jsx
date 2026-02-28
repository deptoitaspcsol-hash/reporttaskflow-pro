import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User, Users, Paperclip, Pencil, Trash2, History, CheckCircle2 } from "lucide-react";
import TaskDueDate from "./TaskDueDate";
import TaskPriorityBadge from "./TaskPriorityBadge";

const STATUS_CONFIG = {
  pendiente:   { label: "Pendiente",   className: "bg-amber-100 text-amber-700 border-amber-200" },
  en_progreso: { label: "En Progreso", className: "bg-blue-100 text-blue-700 border-blue-200" },
  completada:  { label: "Completada",  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelada:   { label: "Cancelada",   className: "bg-slate-100 text-slate-500 border-slate-200" },
};

const PRIORITY_CONFIG = {
  baja:  { label: "Baja",  className: "bg-slate-100 text-slate-500" },
  media: { label: "Media", className: "bg-yellow-100 text-yellow-700" },
  alta:  { label: "Alta",  className: "bg-red-100 text-red-700" },
};

export default function TaskCard({ task, onEdit, onDelete, onHistory, onAttachments }) {
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pendiente;
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;

  return (
    <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">{task.title}</h3>
            {task.work_type_name && (
              <p className="text-xs text-slate-500 mt-0.5">{task.work_type_name}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-600" onClick={onAttachments} title="Archivos adjuntos">
              <Paperclip className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-600" onClick={onHistory} title="Ver historial">
              <History className="w-3.5 h-3.5" />
            </Button>
            {onEdit && task.status !== "completada" && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700" onClick={() => { const newTask = { ...task, status: "completada" }; onEdit(newTask); }} title="Marcar como completada">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {onEdit && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(task)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => onDelete(task.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge className={`text-xs border ${status.className}`}>{status.label}</Badge>
          <TaskPriorityBadge priority={task.priority} />
          {task.end_date && <TaskDueDate endDate={task.end_date} status={task.status} compact />}
        </div>

        <div className="space-y-1.5 text-xs text-slate-500">
          {task.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{task.location}</span>
            </div>
          )}
          {(task.worker_names?.length || task.group_name) && (
            <div className="flex items-center gap-1.5">
              {task.assigned_to === "group" ? <Users className="w-3.5 h-3.5 shrink-0" /> : <User className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{task.assigned_to === "group" ? task.group_name : (task.worker_names || []).join(", ") || task.worker_name}</span>
            </div>
          )}
          {task.start_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{task.start_date}{task.end_date ? ` → ${task.end_date}` : ""}</span>
            </div>
          )}
          {(task.attachments || []).length > 0 && (
            <div className="flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 shrink-0" />
              <span>{task.attachments.length} adjunto(s)</span>
            </div>
          )}
        </div>

        {task.estimated_cost > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-400">Costo estimado</span>
            <span className="text-sm font-semibold text-slate-700">${Number(task.estimated_cost).toLocaleString()}</span>
          </div>
        )}
      </div>
    </Card>
  );
}