import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { History, Search, Eye, CheckCircle2, DollarSign, Calendar, User, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import PrintButton from "../components/shared/PrintButton";
import StatCard from "../components/shared/StatCard";

export default function PaymentHistory() {
  const [search, setSearch] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [showDetail, setShowDetail] = useState(null);
  const printRef = useRef();

  const { data: closings = [], isLoading } = useQuery({
    queryKey: ["closings"],
    queryFn: () => base44.entities.PaymentClosing.list("-closing_date", 1000),
  });

  const paid = closings.filter((c) => c.status === "pagado");

  const filtered = useMemo(() => {
    return paid.filter((c) => {
      const matchSearch =
        !search ||
        c.worker_name?.toLowerCase().includes(search.toLowerCase());
      const matchFrom = !periodFrom || c.closing_date >= periodFrom || c.period_end >= periodFrom;
      const matchTo = !periodTo || c.closing_date <= periodTo || c.period_start <= periodTo;
      return matchSearch && matchFrom && matchTo;
    });
  }, [paid, search, periodFrom, periodTo]);

  const totalPaid = filtered.reduce((s, c) => s + (c.total_amount || 0), 0);
  const totalTasks = filtered.reduce((s, c) => s + (c.total_tasks || 0), 0);
  const uniqueWorkers = new Set(filtered.map((c) => c.worker_id)).size;

  // Group by worker for summary
  const byWorker = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      if (!map[c.worker_name]) map[c.worker_name] = { name: c.worker_name, total: 0, payments: 0, tasks: 0 };
      map[c.worker_name].total += c.total_amount || 0;
      map[c.worker_name].payments++;
      map[c.worker_name].tasks += c.total_tasks || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const clearFilters = () => { setSearch(""); setPeriodFrom(""); setPeriodTo(""); };

  return (
    <div>
      <PageHeader
        title="Historial de Pagos"
        subtitle={`${filtered.length} pagos realizados`}
        actions={<PrintButton contentRef={printRef} />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Pagado" value={`$${totalPaid.toLocaleString()}`} icon={DollarSign} color="emerald" />
        <StatCard title="Pagos Realizados" value={filtered.length} icon={CheckCircle2} color="blue" />
        <StatCard title="Trabajadores Pagados" value={uniqueWorkers} icon={User} color="violet" />
        <StatCard title="Tareas Cubiertas" value={totalTasks} icon={TrendingUp} color="amber" />
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6 border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <Label className="text-xs text-slate-500">Buscar trabajador</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Nombre del trabajador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-40">
            <Label className="text-xs text-slate-500">Período desde</Label>
            <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
          </div>
          <div className="w-40">
            <Label className="text-xs text-slate-500">Período hasta</Label>
            <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
          </div>
          {(search || periodFrom || periodTo) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
              Limpiar
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={History} title="Sin pagos registrados" description="Los cierres marcados como 'pagado' aparecerán aquí" />
      ) : (
        <div ref={printRef} className="space-y-6">
          <div className="print-header hidden mb-4">
            <h2 className="text-lg font-bold">Historial de Pagos</h2>
            <p className="text-sm text-slate-500">
              {periodFrom && periodTo ? `Período: ${periodFrom} — ${periodTo}` : "Todos los períodos"} | {search ? `Trabajador: ${search}` : "Todos los trabajadores"}
            </p>
          </div>

          {/* Summary by worker */}
          {byWorker.length > 1 && (
            <Card className="border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-semibold text-slate-800 text-sm">Resumen por Trabajador</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="text-xs">Trabajador</TableHead>
                    <TableHead className="text-xs text-right">Pagos</TableHead>
                    <TableHead className="text-xs text-right">Tareas</TableHead>
                    <TableHead className="text-xs text-right">Total Cobrado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byWorker.map((w, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-xs">
                            {w.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{w.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-right">{w.payments}</TableCell>
                      <TableCell className="text-sm text-right">{w.tasks}</TableCell>
                      <TableCell className="text-sm text-right font-semibold text-emerald-700">${w.total.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-emerald-50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{filtered.length}</TableCell>
                    <TableCell className="text-right">{totalTasks}</TableCell>
                    <TableCell className="text-right text-emerald-800">${totalPaid.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Payment list */}
          <Card className="border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 text-sm">Detalle de Pagos</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <div key={c.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm shrink-0">
                    {c.worker_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{c.worker_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {c.period_start} — {c.period_end}
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{c.total_tasks} tareas</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-slate-900">${(c.total_amount || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-400">
                      Pagado: {c.closing_date || c.created_date?.slice(0, 10)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Pagado
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setShowDetail(c)} className="text-slate-500 gap-1 shrink-0">
                    <Eye className="w-3.5 h-3.5" /> Ver
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={(open) => { if (!open) setShowDetail(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalle del Pago</span>
              <PrintButton contentRef={printRef} label="Imprimir" />
            </DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div>
              {/* Header info */}
              <div className="grid grid-cols-2 gap-4 mb-5 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div>
                  <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Trabajador</p>
                  <p className="font-bold text-slate-800 mt-0.5">{showDetail.worker_name}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Pagado</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-0.5">${showDetail.total_amount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Período cubierto</p>
                  <p className="text-sm font-semibold text-slate-700">{showDetail.period_start} — {showDetail.period_end}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Fecha de pago</p>
                  <p className="text-sm font-semibold text-slate-700">{showDetail.closing_date || showDetail.created_date?.slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total de tareas</p>
                  <p className="text-sm font-semibold text-slate-700">{showDetail.total_tasks}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Estado</p>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Pagado
                  </Badge>
                </div>
              </div>

              {/* Details table */}
              {showDetail.details?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Desglose de Labores</h3>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Labor</TableHead>
                        <TableHead className="text-xs">Ubicación</TableHead>
                        <TableHead className="text-xs text-right">Cantidad</TableHead>
                        <TableHead className="text-xs text-right">Tarifa</TableHead>
                        <TableHead className="text-xs text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {showDetail.details.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{d.work_type_name}</TableCell>
                          <TableCell className="text-sm text-slate-500">{d.location || "—"}</TableCell>
                          <TableCell className="text-sm text-right">{d.quantity} {d.unit}</TableCell>
                          <TableCell className="text-sm text-right text-slate-500">${d.rate?.toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-right font-semibold">${d.amount?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-emerald-50 font-bold">
                        <TableCell colSpan={4} className="text-right text-sm">TOTAL PAGADO</TableCell>
                        <TableCell className="text-right text-base text-emerald-700">${showDetail.total_amount?.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {showDetail.notes && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Observaciones</p>
                  <p className="text-sm text-slate-700">{showDetail.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}