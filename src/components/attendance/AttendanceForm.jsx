import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Clock, TrendingUp } from "lucide-react";

const REGULAR_HOURS_PER_DAY = 8;
const WORK_DAYS_PER_MONTH = 26;

function calcPayments(form, workTypes) {
  const checkIn = form.check_in;
  const checkOut = form.check_out;
  const baseSalary = Number(form.base_salary) || 0;
  if (!checkIn || !checkOut || !baseSalary) return null;

  const [inH, inM] = checkIn.split(":").map(Number);
  const [outH, outM] = checkOut.split(":").map(Number);
  const hoursWorked = (outH * 60 + outM - (inH * 60 + inM)) / 60;
  if (hoursWorked <= 0) return null;

  const monthlyRate = baseSalary;
  const dailyRate = monthlyRate / WORK_DAYS_PER_MONTH;
  const hourlyRate = dailyRate / REGULAR_HOURS_PER_DAY;
  const extraRate = hourlyRate * 1.5;

  const regularHours = Math.min(hoursWorked, REGULAR_HOURS_PER_DAY);
  const extraHours = Math.max(0, hoursWorked - REGULAR_HOURS_PER_DAY);

  // If work type has a rate, add that to extra calculation
  const wt = workTypes?.find(w => w.id === form.work_type_id);
  const extraHourlyFromWorkType = wt?.rate ? wt.rate : 0;

  const regularPayment = regularHours * hourlyRate;
  const extraPayment = extraHours * (extraRate + extraHourlyFromWorkType);
  const totalPayment = regularPayment + extraPayment;

  return {
    hours_worked: Math.round(hoursWorked * 100) / 100,
    regular_hours: Math.round(regularHours * 100) / 100,
    extra_hours: Math.round(extraHours * 100) / 100,
    hourly_rate: Math.round(hourlyRate * 100) / 100,
    extra_rate: Math.round(extraRate * 100) / 100,
    regular_payment: Math.round(regularPayment * 100) / 100,
    extra_payment: Math.round(extraPayment * 100) / 100,
    total_payment: Math.round(totalPayment * 100) / 100,
  };
}

export default function AttendanceForm({ open, onClose, onSave, workers, workTypes, editing }) {
  const [form, setForm] = useState({
    worker_id: "", date: new Date().toISOString().split("T")[0],
    check_in: "", check_out: "", status: "presente",
    work_type_id: "", base_salary: "", notes: ""
  });

  useEffect(() => {
    if (editing) {
      setForm({
        worker_id: editing.worker_id || "",
        date: editing.date || new Date().toISOString().split("T")[0],
        check_in: editing.check_in || "",
        check_out: editing.check_out || "",
        status: editing.status || "presente",
        work_type_id: editing.work_type_id || "",
        base_salary: editing.base_salary || "",
        notes: editing.notes || "",
      });
    } else {
      setForm({
        worker_id: "", date: new Date().toISOString().split("T")[0],
        check_in: "", check_out: "", status: "presente",
        work_type_id: "", base_salary: "", notes: ""
      });
    }
  }, [editing, open]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleWorkerChange = (workerId) => {
    const w = workers.find(x => x.id === workerId);
    setForm(f => ({ ...f, worker_id: workerId, base_salary: w?.base_salary || "" }));
  };

  const calc = calcPayments(form, workTypes);

  const handleSave = () => {
    if (!form.worker_id || !form.date) return;
    const worker = workers.find(w => w.id === form.worker_id);
    const wt = workTypes?.find(w => w.id === form.work_type_id);
    const payload = {
      ...form,
      worker_name: worker?.full_name || "",
      worker_code: worker?.worker_code || "",
      group: worker?.group || "",
      base_salary: Number(form.base_salary) || 0,
      work_type_name: wt?.name || "",
      ...(calc || {}),
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Registro" : "Registrar Asistencia"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Trabajador *</Label>
              <Select value={form.worker_id} onValueChange={handleWorkerChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {workers.filter(w => w.status === "activo").map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fecha *</Label>
              <Input type="date" value={form.date} onChange={e => setField("date", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={v => setField("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="presente">Presente</SelectItem>
                <SelectItem value="ausente">Ausente</SelectItem>
                <SelectItem value="medio_dia">Medio día</SelectItem>
                <SelectItem value="permiso">Permiso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.status === "presente" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Hora Entrada</Label>
                  <Input type="time" value={form.check_in} onChange={e => setField("check_in", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Hora Salida</Label>
                  <Input type="time" value={form.check_out} onChange={e => setField("check_out", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo de Labor (extras)</Label>
                  <Select value={form.work_type_id || "__none__"} onValueChange={v => setField("work_type_id", v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Ninguno</SelectItem>
                      {workTypes?.map(wt => (
                        <SelectItem key={wt.id} value={wt.id}>{wt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Salario Base</Label>
                  <Input type="number" value={form.base_salary} onChange={e => setField("base_salary", e.target.value)} placeholder="Auto desde trabajador" />
                </div>
              </div>

              {calc && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Cálculo de Pago
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-slate-500">Horas trabajadas</p>
                      <p className="font-bold text-slate-800">{calc.hours_worked}h</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500">Horas regulares</p>
                      <p className="font-bold text-slate-800">{calc.regular_hours}h</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500">Horas extra</p>
                      <p className={`font-bold ${calc.extra_hours > 0 ? "text-amber-600" : "text-slate-800"}`}>{calc.extra_hours}h</p>
                    </div>
                  </div>
                  <div className="border-t border-emerald-200 pt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-slate-500">Pago regular</p>
                      <p className="font-semibold text-slate-700">${calc.regular_payment.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500">Pago extra</p>
                      <p className={`font-semibold ${calc.extra_payment > 0 ? "text-amber-600" : "text-slate-700"}`}>${calc.extra_payment.toFixed(2)}</p>
                    </div>
                    <div className="text-center bg-emerald-100 rounded p-1">
                      <p className="text-emerald-700 font-semibold">Total día</p>
                      <p className="font-bold text-emerald-800">${calc.total_payment.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={e => setField("notes", e.target.value)} rows={2} placeholder="Observaciones..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.worker_id || !form.date} className="bg-emerald-600 hover:bg-emerald-700">
            {editing ? "Guardar cambios" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}