import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ClipboardList, Plus, Trash2, MapPin, History, Paperclip, Eye } from "lucide-react";
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
import HistoryLog from "../components/shared/HistoryLog";
import { saveHistorialCreated } from "../components/shared/useHistorial";
import AttachmentsSection from "../components/shared/AttachmentsSection";

export default function DailyReports() {
  const [showForm, setShowForm] = useState(false);
  const [historyReport, setHistoryReport] = useState(null);
  const [detailReport, setDetailReport] = useState(null);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    worker_id: "", work_type_id: "", location: "", quantity: "", progress: "", notes: "", formGroup: ""
  });
  const printRef = useRef();
  const queryClient = useQueryClient();

  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: () => base44.entities.Worker.list(),
  });
  const { data: workTypes = [] } = useQuery({
    queryKey: ["workTypes"],
    queryFn: () => base44.entities.WorkType.list(),
  });
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => base44.entities.DailyReport.list("-date", 500),
  });

  const getCurrentUser = async () => {
    try { const u = await base44.auth.me(); return u?.email || ""; } catch { return ""; }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyReport.create(data),
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setShowForm(false);
      resetForm();
      const userEmail = await getCurrentUser();
      saveHistorialCreated({ entityType: "DailyReport", entityId: created.id, entityLabel: `${created.worker_name} — ${created.date}`, userEmail });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyReport.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DailyReport.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setDetailReport(updated);
    },
  });

  const resetForm = () => setForm({ date: format(new Date(), "yyyy-MM-dd"), worker_id: "", work_type_id: "", location: "", quantity: "", progress: "", notes: "", formGroup: "" });

  const handleSubmit = () => {
    const worker = workers.find(w => w.id === form.worker_id);
    const wt = workTypes.find(w => w.id === form.work_type_id);
    if (!worker || !wt || !form.quantity) return;
    const qty = Number(form.quantity);
    const amount = qty * wt.rate;
    const progress = form.progress !== "" ? Math.min(100, Math.max(0, Number(form.progress))) : null;
    const baseSalary = worker.base_salary || 0;
    const salaryPayment = (progress !== null && baseSalary) ? (progress / 100) * baseSalary : null;
    createMutation.mutate({
      ...form,
      worker_name: worker.full_name,
      work_type_name: wt.name,
      group: worker.group || "",
      quantity: qty,
      unit: wt.unit,
      rate: wt.rate,
      amount,
      progress: progress !== null ? progress : undefined,
      base_salary: baseSalary || undefined,
      salary_payment: salaryPayment !== null ? salaryPayment : undefined,
      status: "abierto",
    });
  };

  const activeWorkers = workers.filter(w => w.status !== "inactivo");
  const groups = [...new Set(workers.map(w => w.group).filter(Boolean))];
  const workerAreas = [...new Set(workers.map(w => w.work_area).filter(Boolean))];
  const reportLocations = [...new Set(reports.map(r => r.location).filter(Boolean))];
  const locations = [...new Set([...workerAreas, ...reportLocations])];

  const filtered = reports.filter(r => {
    if (filterDate && r.date !== filterDate) return false;
    if (filterGroup !== "all" && r.group !== filterGroup) return false;
    if (filterLocation !== "all" && r.location !== filterLocation) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div>
      <PageHeader
        title="Reporte Diario"
        subtitle={`${filtered.length} registros · $${totalFiltered.toLocaleString()}`}
        actions={
          <div className="flex gap-2">
            <PrintButton contentRef={printRef} />
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" /> Agregar Tarea
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="p-4 mb-6 border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-40">
            <Label className="text-xs text-slate-500">Fecha</Label>
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div className="w-40">
            <Label className="text-xs text-slate-500">Grupo</Label>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Label className="text-xs text-slate-500">Ubicación</Label>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setFilterDate(""); setFilterGroup("all"); setFilterLocation("all"); }} className="text-slate-500">
            Limpiar filtros
          </Button>
        </div>
      </Card>

      {/* Table */}
      <div ref={printRef}>
        <div className="print-header mb-4 hidden">
          <h2 className="text-lg font-bold">Reporte Diario de Labores</h2>
          <p className="text-sm text-slate-500">Fecha: {filterDate || "Todas"} | Grupo: {filterGroup === "all" ? "Todos" : filterGroup}</p>
        </div>
        <Card className="border-slate-200/80 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Sin reportes" description="No hay registros para los filtros seleccionados" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="text-xs">Trabajador</TableHead>
                    <TableHead className="text-xs">Labor</TableHead>
                    <TableHead className="text-xs">Ubicación</TableHead>
                    <TableHead className="text-xs text-right">Cantidad</TableHead>
                    <TableHead className="text-xs text-right">Tarifa</TableHead>
                    <TableHead className="text-xs text-right">Monto</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{r.worker_name}</p>
                          <p className="text-xs text-slate-400">{r.group}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{r.work_type_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {r.location || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.quantity} {r.unit}</TableCell>
                      <TableCell className="text-right text-sm text-slate-500">${r.rate?.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-slate-800">${(r.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={r.status === "cerrado" ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-700"}>
                          {r.status || "abierto"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setDetailReport(r)} className="text-slate-400 hover:text-emerald-600 h-8 w-8" title="Ver detalle y archivos">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setHistoryReport(r)} className="text-slate-400 hover:text-slate-600 h-8 w-8" title="Ver historial">
                            <History className="w-3.5 h-3.5" />
                          </Button>
                          {r.status !== "cerrado" && (
                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)} className="text-red-400 hover:text-red-600 h-8 w-8">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50 font-semibold">
                    <TableCell colSpan={5} className="text-right text-sm">Total</TableCell>
                    <TableCell className="text-right text-sm">${totalFiltered.toLocaleString()}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Detail + Attachments Dialog */}
      <Dialog open={!!detailReport} onOpenChange={open => { if (!open) setDetailReport(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-slate-500" />
              Detalle — {detailReport?.worker_name} ({detailReport?.date})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Labor:</span> <span className="font-medium text-slate-800">{detailReport?.work_type_name}</span></div>
              <div><span className="text-slate-500">Ubicación:</span> <span className="font-medium text-slate-800">{detailReport?.location || "—"}</span></div>
              <div><span className="text-slate-500">Cantidad:</span> <span className="font-medium text-slate-800">{detailReport?.quantity} {detailReport?.unit}</span></div>
              <div><span className="text-slate-500">Monto:</span> <span className="font-semibold text-emerald-700">${(detailReport?.amount || 0).toLocaleString()}</span></div>
            </div>
            {detailReport?.notes && (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{detailReport.notes}</div>
            )}
            <AttachmentsSection
              attachments={detailReport?.attachments || []}
              readOnly={detailReport?.status === "cerrado"}
              onUpdate={(newAtts) => {
                if (detailReport) updateMutation.mutate({ id: detailReport.id, data: { attachments: newAtts } });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyReport} onOpenChange={open => { if (!open) setHistoryReport(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Historial — {historyReport?.worker_name} ({historyReport?.date})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {historyReport && <HistoryLog entityType="DailyReport" entityId={historyReport.id} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha *</Label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Ej: Sector Norte" list="loc-list" />
                <datalist id="loc-list">
                  {locations.map(l => <option key={l} value={l} />)}
                </datalist>
              </div>
            </div>
            <div>
              <Label>Trabajador *</Label>
              <Select value={form.worker_id} onValueChange={v => setForm({...form, worker_id: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar trabajador" /></SelectTrigger>
                <SelectContent>
                  {activeWorkers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.full_name} {w.group ? `(${w.group})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Labor *</Label>
              <Select value={form.work_type_id} onValueChange={v => setForm({...form, work_type_id: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar labor" /></SelectTrigger>
                <SelectContent>
                  {workTypes.map(wt => (
                    <SelectItem key={wt.id} value={wt.id}>{wt.name} — ${wt.rate}/{wt.unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cantidad *</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} placeholder="0" />
              </div>
              <div>
                <Label>Avance (%)</Label>
                <Input
                  type="number"
                  min="0" max="100"
                  value={form.progress}
                  onChange={e => setForm({...form, progress: e.target.value})}
                  placeholder="0 - 100"
                />
              </div>
            </div>

            {/* Resumen de cálculos */}
            {(form.work_type_id && form.quantity) && (() => {
              const wt = workTypes.find(w => w.id === form.work_type_id);
              const worker = workers.find(w => w.id === form.worker_id);
              if (!wt) return null;
              const amount = Number(form.quantity) * wt.rate;
              const progress = form.progress !== "" ? Number(form.progress) : null;
              const baseSalary = worker?.base_salary || 0;
              const salaryPayment = (progress !== null && baseSalary) ? (progress / 100) * baseSalary : null;
              return (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-lg px-4 py-2.5 text-center">
                    <p className="text-xs text-emerald-600">Monto por cantidad</p>
                    <p className="text-lg font-bold text-emerald-700">${amount.toLocaleString()}</p>
                  </div>
                  {salaryPayment !== null ? (
                    <div className="bg-blue-50 rounded-lg px-4 py-2.5 text-center">
                      <p className="text-xs text-blue-600">Pago por avance</p>
                      <p className="text-lg font-bold text-blue-700">${salaryPayment.toLocaleString()}</p>
                      <p className="text-xs text-blue-400">{progress}% de ${baseSalary.toLocaleString()}</p>
                    </div>
                  ) : form.worker_id && !baseSalary ? (
                    <div className="bg-amber-50 rounded-lg px-4 py-2.5 text-center flex items-center justify-center">
                      <p className="text-xs text-amber-600">Sin sueldo base registrado</p>
                    </div>
                  ) : null}
                </div>
              );
            })()}
            <div>
              <Label>Observaciones</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notas adicionales..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}