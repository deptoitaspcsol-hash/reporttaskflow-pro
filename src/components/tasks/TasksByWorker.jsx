import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TaskCard from "./TaskCard";
import EmptyState from "../shared/EmptyState";
import { Users } from "lucide-react";

export default function TasksByWorker({ tasks, onEdit, onDelete, onHistory, onAttachments }) {
  // Group tasks by worker
  const grouped = {};
  tasks.forEach(task => {
    if (!task.worker_names || task.worker_names.length === 0) {
      // Unassigned tasks
      if (!grouped["Sin asignar"]) grouped["Sin asignar"] = [];
      grouped["Sin asignar"].push(task);
    } else {
      task.worker_names.forEach(workerName => {
        if (!grouped[workerName]) grouped[workerName] = [];
        grouped[workerName].push(task);
      });
    }
  });

  if (Object.keys(grouped).length === 0) {
    return <EmptyState icon={Users} title="No hay tareas" description="Crea la primera tarea para comenzar." />;
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([workerName, workerTasks]) => (
        <div key={workerName}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
              {workerName === "Sin asignar" ? "?" : workerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{workerName}</h3>
              <p className="text-xs text-slate-500">{workerTasks.length} tarea(s)</p>
            </div>
            <div className="ml-auto flex gap-1">
              {["pendiente", "en_progreso", "completada"].map(status => {
                const count = workerTasks.filter(t => t.status === status).length;
                if (count === 0) return null;
                return (
                  <Badge key={status} variant="outline" className="text-xs">
                    {count} {status === "pendiente" ? "pendiente" : status === "en_progreso" ? "en curso" : "hecho"}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {workerTasks.map(task => (
              <div key={task.id} onClick={() => onEdit?.(task)}>
                <TaskCard
                  task={task}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onHistory={onHistory}
                  onAttachments={onAttachments}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}