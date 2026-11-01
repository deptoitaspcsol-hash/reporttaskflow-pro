import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "../components/shared/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Plus, Pencil, Trash2, Users, Clock,
  CheckCircle2, XCircle, AlertCircle, CalendarDays, DollarSign, Search
} from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import AttendanceForm from "../components/attendance/AttendanceForm";
import { toast } from "sonner";

const STATUS_CONFIG = {
  presente: { label: "Presente", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  ausente: { label: "Ausente", color: "bg-red-50 text-red-600 border-red-200", icon: XCircle },
  medio_dia: { label: "Medio día", color: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertCircle },
  permiso: { label: "Permiso", color: "bg-blue-50 text-blue-700 border-blue-200", icon: AlertCircle },
};

export default function Attendance() {
  const { canWrite, canDelete } = useRole();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterGroup, setFilterGroup] = useState("todos");
  const [search, setSearch] = useState("");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["attendance", selectedDate],
    queryFn: () => base44.entities.Attendance.filter({ date: selectedDate }, "-created_date"),
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: () => base44.entities.Worker.list(),
  });

  const { data: workTypes = [] } = useQuery({
    queryKey: ["workTypes"],
    queryFn: () => base44.entities.WorkType.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Attendance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setShowForm(false); setEditing(null);
      toast.success("Asistencia registrada");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Attendance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setShowForm(false); setEditing(null);
      toast.success("Registro actualizado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Attendance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Registro eliminado");
    },
  });

  const handleSave = (payload) => {
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const handleEdit = (rec) => { setEditing(rec); setShowForm(true); };

  const groups = ["todos", ...new Set(workers.map(w => w.group).filter(Boolean))];

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchGroup = filterGroup === "todos" || r.group === filterGroup;
      const matchSearch = !search || r.worker_name?.toLowerCase().includes(search.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [records, filterGroup, search]);

  // Stats
  const stats = useMemo(() => ({
    total: records.length,
    presentes: records.filter(r => r.status === "presente").length,
    ausentes: records.filter(r => r.status === "ausente").length,
    extraHours: records.reduce((acc, r) => acc + (r.extra_hours || 0), 0),
    totalPayment: records.reduce((acc, r) => acc + (r.total_payment || 0), 0),
    extraPayment: records.reduce((acc, r) => acc + (r.extra_payment || 0), 0),
  }), [records]);

  return (
    <div>
      <PageHeader
        title="Control de Asistencia"
        subtitle="Registro de entradas, salidas y pagos"
        actions={
          canWrite && (
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" /> Registrar Asistencia
            </Button>
          )
        }
      />

      {/* Date picker + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-40" />
        </div>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(g => <SelectItem key={g} value={g}>{g === "todos" ? "Todos los grupos" : g}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar trabajador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><Users className="w-4 h-4 text-slate-600" /></div>
          <div><p className="text-xs text-slate-500">Registros</p><p className="text-lg font-bold text-slate-800">{stats.total}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
          <div><p className="text-xs text-slate-500">Presentes</p><p className="text-lg font-bold text-emerald-700">{stats.presentes}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><XCircle className="w-4 h-4 text-red-500" /></div>
          <div><p className="text-xs text-slate-500">Ausentes</p><p className="text-lg font-bold text-red-600">{stats.ausentes}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-500" /></div>
          <div><p className="text-xs text-slate-500">Horas Extra</p><p className="text-lg font-bold text-amber-600">{stats.extraHours.toFixed(1)}h</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3 md:col-span-1 col-span-2">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center"><DollarSign className="w-4 h-4 text-green-600" /></div>
          <div>
            <p className="text-xs text-slate-500">Pago Total</p>
            <p className="text-lg font-bold text-green-700">${stats.totalPayment.toFixed(2)}</p>
            {stats.extraPayment > 0 && <p className="text-xs text-amber-600">+${stats.extraPayment.toFixed(2)} extras</p>}
          </div>
        </Card>
      </div>

      {/* Records table/list */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Cargando...</div>
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin registros"
          description={`No hay asistencia registrada para el ${selectedDate}`}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Trabajador</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Entrada</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Salida</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Horas</th>
                  <th className="text-center px-4 py-3 font-medium text-amber-600">Extra</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Pago Regular</th>
                  <th className="text-right px-4 py-3 font-medium text-amber-600">Pago Extra</th>
                  <th className="text-right px-4 py-3 font-medium text-emerald-700">Total</th>
                  {canWrite && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec, i) => {
                  const sc = STATUS_CONFIG[rec.status] || STATUS_CONFIG.presente;
                  const Icon = sc.icon;
                  return (
                    <tr key={rec.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-800">{rec.worker_name}</p>
                          {rec.group && <p className="text-xs text-slate-400">{rec.group}</p>}
                          {rec.work_type_name && <p className="text-xs text-slate-400">{rec.work_type_name}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs gap-1 ${sc.color}`}>
                          <Icon className="w-3 h-3" /> {sc.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 font-mono">{rec.check_in || "—"}</td>
                      <td className="px-4 py-3 text-center text-slate-600 font-mono">{rec.check_out || "—"}</td>
                      <td className="px-4 py-3 text-center font-medium text-slate-700">{rec.hours_worked ? `${rec.hours_worked}h` : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {rec.extra_hours > 0
                          ? <span className="font-semibold text-amber-600">{rec.extra_hours}h</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{rec.regular_payment ? `$${rec.regular_payment.toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {rec.extra_payment > 0
                          ? <span className="font-semibold text-amber-600">${rec.extra_payment.toFixed(2)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{rec.total_payment ? `$${rec.total_payment.toFixed(2)}` : "—"}</td>
                      {canWrite && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700" onClick={() => handleEdit(rec)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {canDelete && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => deleteMutation.mutate(rec.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AttendanceForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={handleSave}
        workers={workers}
        workTypes={workTypes}
        editing={editing}
      />
    </div>
  );
}