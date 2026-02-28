import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Download, ExternalLink } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STATUS_COLORS = {
  pendiente:   "bg-amber-400",
  en_progreso: "bg-blue-400",
  completada:  "bg-emerald-400",
  cancelada:   "bg-slate-300",
};

const STATUS_LIGHT = {
  pendiente:   "bg-amber-50 border-amber-200 text-amber-700",
  en_progreso: "bg-blue-50 border-blue-200 text-blue-700",
  completada:  "bg-emerald-50 border-emerald-200 text-emerald-700",
  cancelada:   "bg-slate-50 border-slate-200 text-slate-500",
};

function generateICS(tasks) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Control de Labores//Tasks//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  tasks.forEach(task => {
    if (!task.start_date) return;
    const start = task.start_date.replace(/-/g, "");
    const end = task.end_date ? task.end_date.replace(/-/g, "") : start;
    const endDt = addDays(parseISO(task.end_date || task.start_date), 1);
    const endFormatted = format(endDt, "yyyyMMdd");
    const uid = `task-${task.id}@controllabores`;
    const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    lines.push(`DTEND;VALUE=DATE:${endFormatted}`);
    lines.push(`SUMMARY:${task.title}`);
    if (task.description) lines.push(`DESCRIPTION:${task.description.replace(/\n/g, "\\n")}`);
    if (task.location) lines.push(`LOCATION:${task.location}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function googleCalendarUrl(task) {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const start = task.start_date?.replace(/-/g, "") || "";
  const end = task.end_date
    ? format(addDays(parseISO(task.end_date), 1), "yyyyMMdd")
    : format(addDays(parseISO(task.start_date), 1), "yyyyMMdd");
  const params = new URLSearchParams({
    text: task.title,
    dates: `${start}/${end}`,
    details: [task.description, task.work_type_name, task.worker_name || task.group_name].filter(Boolean).join(" | "),
    location: task.location || "",
  });
  return `${base}&${params}`;
}

export default function TaskCalendarView({ tasks, onEditTask }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const getTasksForDay = (day) =>
    tasks.filter(task => {
      if (!task.start_date) return false;
      const start = parseISO(task.start_date);
      const end = task.end_date ? parseISO(task.end_date) : start;
      return isWithinInterval(day, { start, end });
    });

  const handleExportICS = (tasksToExport) => {
    const ics = generateICS(tasksToExport);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tareas.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const tasksWithDates = tasks.filter(t => t.start_date);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-slate-800 capitalize min-w-40 text-center">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-slate-500" onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-3.5 h-3.5" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExportICS(tasksWithDates)}>
              <Download className="w-4 h-4 mr-2" />
              Descargar .ics (Outlook / Apple)
            </DropdownMenuItem>
            {tasksWithDates.slice(0, 5).map(task => (
              <DropdownMenuItem key={task.id} asChild>
                <a href={googleCalendarUrl(task)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  <span className="truncate max-w-48">Google: {task.title}</span>
                </a>
              </DropdownMenuItem>
            ))}
            {tasksWithDates.length === 0 && (
              <DropdownMenuItem disabled>No hay tareas con fechas</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-xs text-slate-500">
        {[
          { status: "pendiente", label: "Pendiente" },
          { status: "en_progreso", label: "En Progreso" },
          { status: "completada", label: "Completada" },
          { status: "cancelada", label: "Cancelada" },
        ].map(s => (
          <div key={s.status} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[s.status]}`} />
            {s.label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 bg-slate-50">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayTasks = getTasksForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <div
                key={i}
                className={`min-h-[80px] p-1.5 border-b border-r border-slate-100 ${!isCurrentMonth ? "bg-slate-50/60" : ""} ${i % 7 === 6 ? "border-r-0" : ""}`}
              >
                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                  isToday ? "bg-emerald-600 text-white" : isCurrentMonth ? "text-slate-700" : "text-slate-300"
                }`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                      className={`w-full text-left text-xs px-1.5 py-0.5 rounded border truncate ${STATUS_LIGHT[task.status]} hover:opacity-80 transition-opacity`}
                    >
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-xs text-slate-400 pl-1">+{dayTasks.length - 3} más</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Task Detail */}
      {selectedTask && (
        <div className={`border rounded-xl p-4 ${STATUS_LIGHT[selectedTask.status]}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-slate-800">{selectedTask.title}</h3>
                <Badge className={`text-xs border ${STATUS_LIGHT[selectedTask.status]}`}>
                  {selectedTask.status?.replace("_", " ")}
                </Badge>
              </div>
              {selectedTask.work_type_name && <p className="text-sm text-slate-600">{selectedTask.work_type_name}</p>}
              {selectedTask.location && <p className="text-sm text-slate-500">{selectedTask.location}</p>}
              <p className="text-sm text-slate-500 mt-1">
                📅 {selectedTask.start_date}{selectedTask.end_date ? ` → ${selectedTask.end_date}` : ""}
              </p>
              {selectedTask.description && <p className="text-sm text-slate-600 mt-1">{selectedTask.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" asChild>
                <a href={googleCalendarUrl(selectedTask)} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Google
                </a>
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExportICS([selectedTask])} className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
                .ics
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { onEditTask(selectedTask); setSelectedTask(null); }}>
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedTask(null)}>✕</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}