import React, { useMemo } from "react";
import { api } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users, ClipboardList,
  TrendingUp, ArrowRight, ListTodo,
  CalendarDays, Zap
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import StatCard from "../components/shared/StatCard";
import PageHeader from "../components/shared/PageHeader";
import GroupProductivityChart from "../components/dashboard/GroupProductivityChart";
import HoursComparisonChart from "../components/dashboard/HoursComparisonChart";
import LaborCostSummary from "../components/dashboard/LaborCostSummary";

export default function Dashboard() {
  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: () => api.entities.Worker.list(),
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api.entities.DailyReport.list("-date", 200),
  });
  const { data: closings = [] } = useQuery({
    queryKey: ["closings"],
    queryFn: () => api.entities.PaymentClosing.list("-created_date", 50),
  });
  const { data: workerGroups = [] } = useQuery({
    queryKey: ["workerGroups"],
    queryFn: () => api.entities.WorkerGroup.list(),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.entities.Task.list("-created_date", 100),
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ["attendanceAll"],
    queryFn: () => api.entities.Attendance.list("-date", 200),
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const activeWorkers = workers.filter(w => w.status !== "inactivo");
  const openReports = reports.filter(r => r.status === "abierto");
  const todayReports = reports.filter(r => r.date === todayStr);
  const todayAmount = todayReports.reduce((s, r) => s + (r.amount || 0), 0);
  const todayAttendance = attendance.filter(r => r.date === todayStr);

  // --- Productivity by group ---
  const groupProductivity = useMemo(() => {
    const map = {};
    // Base: all active groups
    workerGroups.filter(g => g.status !== "inactivo").forEach(g => {
      map[g.name] = { group: g.name, costo: 0, trabajadores: 0, color: g.color };
    });
    // From attendance today
    todayAttendance.forEach(r => {
      const g = r.group || "Sin grupo";
      if (!map[g]) map[g] = { group: g, costo: 0, trabajadores: 0 };
      map[g].costo += r.total_payment || 0;
    });
    // Worker count
    workers.filter(w => w.status !== "inactivo").forEach(w => {
      const g = w.group || "Sin grupo";
      if (!map[g]) map[g] = { group: g, costo: 0, trabajadores: 0 };
      map[g].trabajadores++;
    });
    return Object.values(map)
      .filter(g => g.trabajadores > 0 || g.costo > 0)
      .sort((a, b) => b.costo - a.costo);
  }, [workerGroups, workers, todayAttendance]);

  // --- Hours comparison last 7 days ---
  const hoursData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
      const dayRecords = attendance.filter(r => r.date === date);
      return {
        fecha: format(subDays(new Date(), 6 - i), "dd/MM"),
        regulares: Math.round(dayRecords.reduce((s, r) => s + (r.regular_hours || 0), 0) * 10) / 10,
        extras: Math.round(dayRecords.reduce((s, r) => s + (r.extra_hours || 0), 0) * 10) / 10,
      };
    });
  }, [attendance]);

  const recentReports = reports.slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Panel de Control"
        subtitle={format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
        actions={
          <Link to={createPageUrl("DailyReports")}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <ClipboardList className="w-4 h-4" /> Nuevo Reporte
            </Button>
          </Link>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Trabajadores Activos" value={activeWorkers.length} icon={Users} color="blue" />
        <StatCard title="Producción Hoy" value={`$${todayAmount.toLocaleString()}`} icon={TrendingUp} color="emerald" subtitle={`${todayReports.length} reportes`} />
        <StatCard title="Asistencia Hoy" value={todayAttendance.filter(r => r.status === "presente").length} icon={CalendarDays} color="amber" subtitle={`${todayAttendance.filter(r => r.status === "ausente").length} ausentes`} />
        <StatCard title="Tareas Activas" value={tasks.filter(t => t.status === "en_progreso").length} icon={ListTodo} color="violet" subtitle={`${tasks.filter(t => t.status === "pendiente").length} pendientes`} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2">
          <GroupProductivityChart data={groupProductivity} />
        </div>
        <div>
          <LaborCostSummary todayAttendance={todayAttendance} />
        </div>
      </div>

      <div className="mb-6">
        <HoursComparisonChart data={hoursData} />
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent reports */}
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Reportes Recientes</h2>
            <Link to={createPageUrl("DailyReports")}>
              <Button variant="ghost" size="sm" className="text-emerald-600 gap-1">
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentReports.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No hay reportes aún</div>
            )}
            {recentReports.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{r.worker_name}</p>
                  <p className="text-xs text-slate-400">{r.work_type_name} · {r.location || "Sin ubicación"}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-semibold text-slate-800">${(r.amount || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{r.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Groups summary */}
        <Card className="border-slate-200/80 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Grupos Activos</h2>
          </div>
          <div className="p-5 space-y-3">
            {workerGroups.filter(g => g.status !== "inactivo").length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Sin grupos definidos</p>
            )}
            {workerGroups.filter(g => g.status !== "inactivo").map(g => {
              const gWorkers = workers.filter(w => w.group === g.name && w.status !== "inactivo");
              const gAttend = todayAttendance.filter(r => r.group === g.name && r.status === "presente");
              const gCost = gAttend.reduce((s, r) => s + (r.total_payment || 0), 0);
              const gExtra = gAttend.reduce((s, r) => s + (r.extra_hours || 0), 0);
              return (
                <div key={g.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${g.color || "#10b981"}20` }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color || "#10b981" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{g.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{gWorkers.length} trabaj.</span>
                      {gExtra > 0 && <span className="text-amber-500 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{gExtra.toFixed(1)}h ext.</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    {gCost > 0 ? (
                      <>
                        <p className="text-sm font-semibold text-emerald-700">${gCost.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">hoy</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-300">Sin registro</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}