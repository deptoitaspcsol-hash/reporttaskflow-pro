import React from "react";
import { Card } from "@/components/ui/card";
import { DollarSign, Zap } from "lucide-react";

function MetricRow({ label, value, sub, color = "text-slate-800" }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold ${color}`}>{value}</span>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function LaborCostSummary({ todayAttendance }) {
  const presentes = todayAttendance.filter(r => r.status === "presente");
  const totalWorkers = todayAttendance.length;
  const totalHours = presentes.reduce((s, r) => s + (r.hours_worked || 0), 0);
  const regularHours = presentes.reduce((s, r) => s + (r.regular_hours || 0), 0);
  const extraHours = presentes.reduce((s, r) => s + (r.extra_hours || 0), 0);
  const regularPay = presentes.reduce((s, r) => s + (r.regular_payment || 0), 0);
  const extraPay = presentes.reduce((s, r) => s + (r.extra_payment || 0), 0);
  const totalPay = presentes.reduce((s, r) => s + (r.total_payment || 0), 0);
  const extraPercent = totalPay > 0 ? ((extraPay / totalPay) * 100).toFixed(1) : 0;

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Costo Mano de Obra Hoy</h3>
          <p className="text-xs text-slate-400">{presentes.length} trabajadores presentes</p>
        </div>
      </div>

      <div className="p-5">
        {/* Total highlight */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-xl p-4 mb-4 text-center">
          <p className="text-xs text-emerald-700 font-medium mb-1">COSTO TOTAL DEL DÍA</p>
          <p className="text-3xl font-bold text-emerald-800">${totalPay.toFixed(2)}</p>
          {extraPay > 0 && (
            <p className="text-xs text-amber-600 mt-1 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" /> ${extraPay.toFixed(2)} en horas extra ({extraPercent}%)
            </p>
          )}
        </div>

        <div className="space-y-0">
          <MetricRow label="Trabajadores registrados" value={totalWorkers} />
          <MetricRow label="Total horas trabajadas" value={`${totalHours.toFixed(1)}h`} />
          <MetricRow label="Horas regulares" value={`${regularHours.toFixed(1)}h`} sub={`$${regularPay.toFixed(2)}`} color="text-emerald-700" />
          <MetricRow
            label="Horas extra (x1.5)"
            value={`${extraHours.toFixed(1)}h`}
            sub={extraPay > 0 ? `$${extraPay.toFixed(2)}` : undefined}
            color={extraHours > 0 ? "text-amber-600" : "text-slate-800"}
          />
        </div>
      </div>
    </Card>
  );
}