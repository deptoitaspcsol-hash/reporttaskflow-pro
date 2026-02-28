import { useEffect, useRef } from "react";
import { differenceInDays, parseISO, isValid } from "date-fns";
import { toast } from "sonner";

const STORAGE_KEY = "task_notifications_shown";

function getShownKeys() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function markShown(key) {
  const shown = getShownKeys();
  shown[key] = new Date().toISOString().slice(0, 10); // date-keyed so it resets daily
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shown));
}

function wasShownToday(key) {
  const shown = getShownKeys();
  return shown[key] === new Date().toISOString().slice(0, 10);
}

export function useTaskNotifications(tasks = [], prevTasksRef) {
  const initialCheckDone = useRef(false);

  // Check for due-soon tasks once on load
  useEffect(() => {
    if (!tasks.length || initialCheckDone.current) return;
    initialCheckDone.current = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tasks.forEach(task => {
      if (!task.end_date || ["completada", "cancelada"].includes(task.status)) return;

      const end = parseISO(task.end_date);
      if (!isValid(end)) return;

      const daysLeft = differenceInDays(end, today);

      if (daysLeft === 1) {
        const key = `due_1d_${task.id}`;
        if (!wasShownToday(key)) {
          toast.warning(`⏰ Tarea vence mañana: "${task.title}"`, {
            description: task.worker_name ? `Asignada a ${task.worker_name}` : task.group_name || undefined,
            duration: 7000,
          });
          markShown(key);
        }
      } else if (daysLeft === 0) {
        const key = `due_today_${task.id}`;
        if (!wasShownToday(key)) {
          toast.error(`🚨 Tarea vence HOY: "${task.title}"`, {
            description: task.worker_name ? `Asignada a ${task.worker_name}` : task.group_name || undefined,
            duration: 8000,
          });
          markShown(key);
        }
      } else if (daysLeft < 0) {
        const key = `overdue_${task.id}`;
        if (!wasShownToday(key)) {
          toast.error(`❌ Tarea vencida: "${task.title}"`, {
            description: `Venció hace ${Math.abs(daysLeft)} día(s)`,
            duration: 8000,
          });
          markShown(key);
        }
      }
    });
  }, [tasks]);

  // Detect status changes on mutations
  const checkStatusChange = (oldTask, newData) => {
    if (!oldTask || !newData) return;
    if (oldTask.status !== newData.status) {
      const statusLabels = {
        pendiente: "Pendiente",
        en_progreso: "En Progreso",
        completada: "Completada",
        cancelada: "Cancelada",
      };
      const label = statusLabels[newData.status] || newData.status;

      if (newData.status === "completada") {
        toast.success(`✅ Tarea completada: "${oldTask.title}"`, { duration: 5000 });
      } else if (newData.status === "cancelada") {
        toast.info(`🚫 Tarea cancelada: "${oldTask.title}"`, { duration: 5000 });
      } else {
        toast.info(`🔄 Estado actualizado a "${label}": "${oldTask.title}"`, { duration: 4000 });
      }
    }

    // Notify on new assignment
    if (
      (oldTask.worker_names?.join() !== newData.worker_names?.join() ||
       oldTask.group_name !== newData.group_name) &&
      (newData.worker_names?.length || newData.group_name)
    ) {
      const assignee = newData.worker_names?.length
        ? newData.worker_names.join(", ")
        : newData.group_name;
      toast.info(`👤 Tarea asignada a: ${assignee}`, {
        description: `"${newData.title || oldTask.title}"`,
        duration: 5000,
      });
    }
  };

  return { checkStatusChange };
}