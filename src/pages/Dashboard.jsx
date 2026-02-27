import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Briefcase, ClipboardList, CreditCard, TrendingUp, MapPin, ArrowRight, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import StatCard from "../components/shared/StatCard";
import PageHeader from "../components/shared/PageHeader";

export default function Dashboard() {
  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: () => base44.entities.Worker.list(),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: () => base44.entities.DailyReport.list("-date", 200),
  });

  const { data: closings = [] } = useQuery({
    queryKey: ["closings"],
    queryFn: () => base44.entities.PaymentClosing.list("-created_date", 50),
  });

  const activeWorkers = workers.filter((w) => w.status !== "inactivo");
  const openReports = reports.filter((r) => r.status === "abierto");
  const totalOpen = openReports.reduce((s, r) => s + (r.amount || 0), 0);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayReports = reports.filter((r) => r.date === todayStr);
  const todayAmount = todayReports.reduce((s, r) => s + (r.amount || 0), 0);

  const recentReports = reports.slice(0, 8);

  // Locations summary
  const locationMap = {};
  openReports.forEach((r) => {
    if (r.location) {
      if (!locationMap[r.location]) locationMap[r.location] = { count: 0, amount: 0 };
      locationMap[r.location].count++;
      locationMap[r.location].amount += r.amount || 0;
    }
  });
  const topLocations = Object.entries(locationMap)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Panel de Control"
        subtitle={format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
        actions={
          <Link to={createPageUrl("DailyReports")}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <ClipboardList className="w-4 h-4" />
              Nuevo Reporte
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Trabajadores Activos" value={activeWorkers.length} icon={Users} color="blue" />
        <StatCard title="Hoy" value={`$${todayAmount.toLocaleString()}`} icon={TrendingUp} color="emerald" subtitle={`${todayReports.length} tareas`} />
        <StatCard title="Reportes Abiertos" value={openReports.length} icon={ClipboardList} color="amber" subtitle={`$${totalOpen.toLocaleString()}`} />
        <StatCard title="Cierres Realizados" value={closings.length} icon={CreditCard} color="violet" />
      </div>

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
            {recentReports.map((r) => (
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

        {/* Locations */}
        <Card className="border-slate-200/80 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Ubicaciones Activas</h2>
          </div>
          <div className="p-5 space-y-4">
            {topLocations.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Sin datos de ubicaciones</p>
            )}
            {topLocations.map(([loc, data]) => (
              <div key={loc} className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{loc}</p>
                  <p className="text-xs text-slate-400">{data.count} tareas</p>
                </div>
                <p className="text-sm font-semibold text-slate-700">${data.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}