import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart3, Users, MapPin, Briefcase, UsersRound } from "lucide-react";
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

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

export default function Reports() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [groupFilter, setGroupFilter] = useState("all");
  const printRef = useRef();

  const { data: reports = [] } = useQuery({ queryKey: ["reports"], queryFn: () => base44.entities.DailyReport.list("-date", 2000) });
  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: () => base44.entities.Worker.list() });
  const { data: workerGroups = [] } = useQuery({ queryKey: ["workerGroups"], queryFn: () => base44.entities.WorkerGroup.list() });

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
        actions={<PrintButton contentRef={printRef} />}
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