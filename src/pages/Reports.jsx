import React, { useState, useRef, useMemo } from "react";
import { api } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Users, MapPin, Briefcase, UsersRound, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import PageHeader from "../components/shared/PageHeader";
import PrintButton from "../components/shared/PrintButton";
import { useRole } from "../components/shared/useRole";
import { exportCorporatePDF, formatMoney } from "@/lib/corporate";
import { toast } from "sonner";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

export default function Reports() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [groupFilter, setGroupFilter] = useState("all");
  const printRef = useRef();
  const { canExport, user } = useRole("reports");

  const { data: reports = [] } = useQuery({ queryKey: ["reports"], queryFn: () => api.entities.DailyReport.list("-date", 2000) });
  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: () => api.entities.Worker.list() });
  const { data: workerGroups = [] } = useQuery({ queryKey: ["workerGroups"], queryFn: () => api.entities.WorkerGroup.list() });

  const filtered = useMemo(() =>
    reports.filter(r => {
      if (r.date < dateFrom || r.date > dateTo) return false;
      if (groupFilter !== "all" && r.group !== groupFilter) return false;
      return true;
    }), [reports, dateFrom, dateTo, groupFilter]);

  const groups = [...new Set(workers.map(w => w.group).filter(Boolean))];

  // By group
  const byGroup = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const grp = r.group || "Sin grupo";
      if (!map[grp]) map[grp] = { name: grp, total: 0, tasks: 0, workers: new Set() };
      map[grp].total += r.amount || 0;
      map[grp].tasks++;
      map[grp].workers.add(r.worker_name);
    });
    return Object.values(map).map(g => ({ ...g, workerCount: g.workers.size })).sort((a, b) => b.total - a.total);
  }, [filtered]);
  const totalAmount = filtered.reduce((s, r) => s + (r.amount || 0), 0);

  // By worker
  const byWorker = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!map[r.worker_name]) map[r.worker_name] = { name: r.worker_name, total: 0, tasks: 0 };
      map[r.worker_name].total += r.amount || 0;
      map[r.worker_name].tasks++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // By work type
  const byWorkType = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!map[r.work_type_name]) map[r.work_type_name] = { name: r.work_type_name, total: 0, tasks: 0 };
      map[r.work_type_name].total += r.amount || 0;
      map[r.work_type_name].tasks++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // By location
  const byLocation = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const loc = r.location || "Sin ubicación";
      if (!map[loc]) map[loc] = { name: loc, total: 0, tasks: 0 };
      map[loc].total += r.amount || 0;
      map[loc].tasks++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // PDF con las cuatro vistas completas (la impresión solo toma la pestaña activa).
  const exportPDF = async () => {
    const money = { header: "Monto", key: "total", money: true };
    try {
      await exportCorporatePDF({
        fileName: `reporte_labores_${dateFrom}_${dateTo}.pdf`,
        title: "Reporte de Labores",
        subtitle: `Grupo: ${groupFilter === "all" ? "Todos" : groupFilter}`,
        period: `${dateFrom} — ${dateTo}`,
        generatedBy: user?.full_name || user?.email,
        summary: [
          { label: "Monto total", value: formatMoney(totalAmount) },
          { label: "Tareas", value: String(filtered.length) },
          { label: "Trabajadores", value: String(byWorker.length) },
        ],
        sections: [
          { heading: "Por grupo", columns: [{ header: "Grupo", key: "name" }, { header: "Trabajadores", key: "workerCount", align: "right" }, { header: "Tareas", key: "tasks", align: "right" }, money], rows: byGroup, totals: { tasks: filtered.length, total: totalAmount } },
          { heading: "Por trabajador", columns: [{ header: "Trabajador", key: "name" }, { header: "Tareas", key: "tasks", align: "right" }, money], rows: byWorker, totals: { tasks: filtered.length, total: totalAmount } },
          { heading: "Por labor", columns: [{ header: "Labor", key: "name" }, { header: "Tareas", key: "tasks", align: "right" }, money], rows: byWorkType, totals: { tasks: filtered.length, total: totalAmount } },
          { heading: "Por ubicación", columns: [{ header: "Ubicación", key: "name" }, { header: "Tareas", key: "tasks", align: "right" }, money], rows: byLocation, totals: { tasks: filtered.length, total: totalAmount } },
        ],
      });
    } catch {
      toast.error("No se pudo generar el PDF. Intenta de nuevo.");
    }
  };

  const setQuickRange = (months) => {
    const d = subMonths(now, months);
    setDateFrom(format(startOfMonth(d), "yyyy-MM-dd"));
    setDateTo(months === 0 ? format(endOfMonth(now), "yyyy-MM-dd") : format(endOfMonth(d), "yyyy-MM-dd"));
  };

  return (
    <div>
      <PageHeader
        title="Reportes y Estadísticas"
        subtitle={`$${totalAmount.toLocaleString()} en ${filtered.length} tareas`}
        actions={
          <div className="flex gap-2">
            {canExport && (
              <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
                <FileText className="w-4 h-4" /> Exportar PDF
              </Button>
            )}
            <PrintButton
              contentRef={printRef}
              title="Reporte de Labores"
              subtitle={`Grupo: ${groupFilter === "all" ? "Todos" : groupFilter} · ${formatMoney(totalAmount)} en ${filtered.length} tareas`}
              period={`${dateFrom} — ${dateTo}`}
            />
          </div>
        }
      />

      {/* Filters */}
      <Card className="p-4 mb-6 border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-36">
            <Label className="text-xs text-slate-500">Desde</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="w-36">
            <Label className="text-xs text-slate-500">Hasta</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="w-36">
            <Label className="text-xs text-slate-500">Grupo</Label>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setQuickRange(0)}>Este mes</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange(1)}>Mes pasado</Button>
          </div>
        </div>
      </Card>

      <div ref={printRef}>
        <div className="print-header hidden mb-4">
          <h2 className="text-lg font-bold">Reporte de Labores</h2>
          <p className="text-sm text-slate-500">Período: {dateFrom} — {dateTo} | Grupo: {groupFilter === "all" ? "Todos" : groupFilter}</p>
        </div>

        <Tabs defaultValue="groups" className="space-y-6">
          <TabsList>
            <TabsTrigger value="groups" className="gap-1"><UsersRound className="w-3.5 h-3.5" /> Por Grupo</TabsTrigger>
            <TabsTrigger value="workers" className="gap-1"><Users className="w-3.5 h-3.5" /> Por Trabajador</TabsTrigger>
            <TabsTrigger value="worktypes" className="gap-1"><Briefcase className="w-3.5 h-3.5" /> Por Labor</TabsTrigger>
            <TabsTrigger value="locations" className="gap-1"><MapPin className="w-3.5 h-3.5" /> Por Ubicación</TabsTrigger>
          </TabsList>

          <TabsContent value="groups">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-5 border-slate-200/80 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4">Rendimiento por Grupo</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byGroup}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `$${v.toLocaleString()}`} />
                    <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Grupo</TableHead>
                      <TableHead className="text-xs text-right">Trabaj.</TableHead>
                      <TableHead className="text-xs text-right">Tareas</TableHead>
                      <TableHead className="text-xs text-right">Monto Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byGroup.map((g, i) => {
                      const groupMeta = workerGroups.find(wg => wg.name === g.name);
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {groupMeta?.color && (
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: groupMeta.color }} />
                              )}
                              <span className="text-sm font-medium">{g.name}</span>
                            </div>
                            {groupMeta?.supervisor_name && (
                              <p className="text-xs text-slate-400 mt-0.5 ml-4">{groupMeta.supervisor_name}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-right">{g.workerCount}</TableCell>
                          <TableCell className="text-sm text-right">{g.tasks}</TableCell>
                          <TableCell className="text-sm text-right font-semibold">${g.total.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-emerald-50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right">{filtered.length}</TableCell>
                      <TableCell className="text-right">${totalAmount.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="workers">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-5 border-slate-200/80 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4">Montos por Trabajador</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byWorker.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tickFormatter={v => `$${v.toLocaleString()}`} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                    <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Trabajador</TableHead>
                      <TableHead className="text-xs text-right">Tareas</TableHead>
                      <TableHead className="text-xs text-right">Monto Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byWorker.map((w, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">{w.name}</TableCell>
                        <TableCell className="text-sm text-right">{w.tasks}</TableCell>
                        <TableCell className="text-sm text-right font-semibold">${w.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-emerald-50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">{filtered.length}</TableCell>
                      <TableCell className="text-right">${totalAmount.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="worktypes">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-5 border-slate-200/80 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4">Distribución por Labor</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={byWorkType} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {byWorkType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Labor</TableHead>
                      <TableHead className="text-xs text-right">Tareas</TableHead>
                      <TableHead className="text-xs text-right">Monto Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byWorkType.map((w, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">{w.name}</TableCell>
                        <TableCell className="text-sm text-right">{w.tasks}</TableCell>
                        <TableCell className="text-sm text-right font-semibold">${w.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="locations">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-5 border-slate-200/80 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4">Montos por Ubicación</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byLocation.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `$${v.toLocaleString()}`} />
                    <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Ubicación</TableHead>
                      <TableHead className="text-xs text-right">Tareas</TableHead>
                      <TableHead className="text-xs text-right">Monto Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byLocation.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">{l.name}</TableCell>
                        <TableCell className="text-sm text-right">{l.tasks}</TableCell>
                        <TableCell className="text-sm text-right font-semibold">${l.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}