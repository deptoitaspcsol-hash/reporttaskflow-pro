import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "../components/shared/useRole";
import { format } from "date-fns";
import { CreditCard, Plus, Eye, CheckCircle2, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import PrintButton from "../components/shared/PrintButton";

export default function PaymentClosings() {
  const { canWrite, canDelete } = useRole();
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [closingForm, setClosingForm] = useState({
    worker_id: "", period_start: "", period_end: format(new Date(), "yyyy-MM-dd"), notes: ""
  });
  const [preview, setPreview] = useState(null);
  const printRef = useRef();
  const queryClient = useQueryClient();

  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: () => base44.entities.Worker.list() });
  const { data: reports = [] } = useQuery({ queryKey: ["reports"], queryFn: () => base44.entities.DailyReport.list("-date", 1000) });
  const { data: closings = [] } = useQuery({ queryKey: ["closings"], queryFn: () => base44.entities.PaymentClosing.list("-created_date") });

  const createClosingMutation = useMutation({
    mutationFn: async (data) => {
      const closing = await base44.entities.PaymentClosing.create(data);
      // Mark reports as closed
      for (const rid of data.report_ids) {
        await base44.entities.DailyReport.update(rid, { status: "cerrado", closing_id: closing.id });
      }
      return closing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closings"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setShowCreate(false);
      setPreview(null);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.PaymentClosing.update(id, { status: "pagado" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["closings"] }),
  });

  const handlePreview = () => {
    const { worker_id, period_start, period_end } = closingForm;
    if (!worker_id || !period_start || !period_end) return;
    const workerReports = reports.filter(r =>
      r.worker_id === worker_id &&
      r.status === "abierto" &&
      r.date >= period_start &&
      r.date <= period_end
    );
    const total = workerReports.reduce((s, r) => s + (r.amount || 0), 0);
    const worker = workers.find(w => w.id === worker_id);
    const details = workerReports.map(r => ({
      work_type_name: r.work_type_name,
      location: r.location || "",
      quantity: r.quantity,
      unit: r.unit,
      rate: r.rate,
      amount: r.amount,
      date: r.date,
    }));
    setPreview({
      worker,
      reports: workerReports,
      total,
      details,
      count: workerReports.length,
    });
  };

  const handleCreateClosing = () => {
    if (!preview) return;
    createClosingMutation.mutate({
      closing_date: format(new Date(), "yyyy-MM-dd"),
      period_start: closingForm.period_start,
      period_end: closingForm.period_end,
      worker_id: closingForm.worker_id,
      worker_name: preview.worker.full_name,
      total_amount: preview.total,
      total_tasks: preview.count,
      report_ids: preview.reports.map(r => r.id),
      details: preview.details,
      notes: closingForm.notes,
      status: "pendiente",
    });
  };

  const activeWorkers = workers.filter(w => w.status !== "inactivo");

  return (
    <div>
      <PageHeader
        title="Cierres de Pago"
        subtitle={`${closings.length} cierres realizados`}
        actions={
          canWrite ? (
            <Button onClick={() => { setShowCreate(true); setPreview(null); setClosingForm({ worker_id: "", period_start: "", period_end: format(new Date(), "yyyy-MM-dd"), notes: "" }); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" /> Nuevo Cierre
            </Button>
          ) : null
        }
      />

      {closings.length === 0 ? (
        <EmptyState icon={CreditCard} title="Sin cierres" description="Realiza tu primer cierre de pago" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {closings.map(c => (
            <Card key={c.id} className="p-5 border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800">{c.worker_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.period_start} → {c.period_end}</p>
                </div>
                <Badge variant="secondary" className={c.status === "pagado" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
                  {c.status === "pagado" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                  {c.status || "pendiente"}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-bold text-slate-900">${c.total_amount?.toLocaleString()}</span>
                <span className="text-xs text-slate-400">{c.total_tasks} tareas</span>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={() => setShowDetail(c)} className="text-slate-500 gap-1">
                  <Eye className="w-3.5 h-3.5" /> Ver Detalle
                </Button>
                {c.status !== "pagado" && canWrite && (
                  <Button variant="ghost" size="sm" onClick={() => markPaidMutation.mutate({ id: c.id })} className="text-emerald-600 gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Pagado
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create closing dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); setPreview(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Cierre de Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Trabajador *</Label>
                <Select value={closingForm.worker_id} onValueChange={v => { setClosingForm({...closingForm, worker_id: v}); setPreview(null); }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {activeWorkers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Desde *</Label>
                <Input type="date" value={closingForm.period_start} onChange={e => { setClosingForm({...closingForm, period_start: e.target.value}); setPreview(null); }} />
              </div>
              <div>
                <Label>Hasta *</Label>
                <Input type="date" value={closingForm.period_end} onChange={e => { setClosingForm({...closingForm, period_end: e.target.value}); setPreview(null); }} />
              </div>
            </div>
            <Button variant="outline" onClick={handlePreview} className="w-full">Previsualizar Cierre</Button>

            {preview && (
              <Card className="p-4 bg-slate-50 border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="font-semibold text-slate-800">{preview.worker?.full_name}</p>
                    <p className="text-xs text-slate-500">{preview.count} tareas en el período</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-700">${preview.total.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">Total a pagar</p>
                  </div>
                </div>
                {preview.details.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Fecha</TableHead>
                        <TableHead className="text-xs">Labor</TableHead>
                        <TableHead className="text-xs">Ubicación</TableHead>
                        <TableHead className="text-xs text-right">Cant.</TableHead>
                        <TableHead className="text-xs text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.details.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{d.date}</TableCell>
                          <TableCell className="text-xs">{d.work_type_name}</TableCell>
                          <TableCell className="text-xs">{d.location || "—"}</TableCell>
                          <TableCell className="text-xs text-right">{d.quantity} {d.unit}</TableCell>
                          <TableCell className="text-xs text-right font-medium">${d.amount?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {preview.count === 0 && (
                  <p className="text-center text-sm text-slate-400 py-4">No hay reportes abiertos en este período</p>
                )}
              </Card>
            )}

            <div>
              <Label>Notas</Label>
              <Textarea value={closingForm.notes} onChange={e => setClosingForm({...closingForm, notes: e.target.value})} rows={2} placeholder="Observaciones del cierre..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setPreview(null); }}>Cancelar</Button>
            <Button onClick={handleCreateClosing} disabled={!preview || preview.count === 0} className="bg-emerald-600 hover:bg-emerald-700">
              Crear Cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!showDetail} onOpenChange={(open) => { if (!open) setShowDetail(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Ficha de Pago</span>
              <PrintButton contentRef={printRef} label="Imprimir Ficha" />
            </DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div ref={printRef}>
              <div className="print-header border-b-2 border-emerald-500 pb-3 mb-4">
                <h2 className="text-lg font-bold">Ficha de Pago</h2>
                <p className="text-sm text-slate-500">Fecha de cierre: {showDetail.closing_date || format(new Date(showDetail.created_date), "yyyy-MM-dd")}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500">Trabajador</p>
                  <p className="font-semibold">{showDetail.worker_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Período</p>
                  <p className="font-semibold">{showDetail.period_start} — {showDetail.period_end}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Tareas</p>
                  <p className="font-semibold">{showDetail.total_tasks}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Estado</p>
                  <Badge variant="secondary" className={showDetail.status === "pagado" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
                    {showDetail.status || "pendiente"}
                  </Badge>
                </div>
              </div>

              {showDetail.details?.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
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
                        <TableCell className="text-sm">{d.location || "—"}</TableCell>
                        <TableCell className="text-sm text-right">{d.quantity} {d.unit}</TableCell>
                        <TableCell className="text-sm text-right">${d.rate?.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-right font-medium">${d.amount?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-emerald-50 font-bold">
                      <TableCell colSpan={4} className="text-right">TOTAL A PAGAR</TableCell>
                      <TableCell className="text-right text-lg">${showDetail.total_amount?.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}

              {showDetail.notes && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Observaciones</p>
                  <p className="text-sm">{showDetail.notes}</p>
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="border-b border-slate-400 mb-1 h-8"></div>
                  <p className="text-xs text-slate-500">Firma del Trabajador</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-400 mb-1 h-8"></div>
                  <p className="text-xs text-slate-500">Firma del Responsable</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}