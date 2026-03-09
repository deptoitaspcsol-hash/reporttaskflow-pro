import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from "recharts";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
      {payload[0] && payload[1] && (
        <p className="text-slate-500 mt-1">
          Cumplimiento: <span className="font-semibold text-emerald-700">
            {payload[0].payload.total > 0 ? `${Math.round((payload[0].value / payload[0].payload.total) * 100)}%` : "—"}
          </span>
        </p>
      )}
    </div>
  );
};

export default function TaskFulfillmentChart({ data }) {
  if (!data?.length) return (
    <Card className="border-slate-200 shadow-sm p-8 flex items-center justify-center h-64">
      <p className="text-sm text-slate-400">Sin datos de tareas disponibles</p>
    </Card>
  );

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm">Cumplimiento de Tareas por Mes</h3>
        <p className="text-xs text-slate-400 mt-0.5">Tareas completadas vs total asignadas</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 16, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" name="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40}>
              <LabelList
                dataKey="pct"
                position="top"
                style={{ fontSize: "10px", fill: "#64748b", fontWeight: 600 }}
                formatter={v => v > 0 ? `${v}%` : ""}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}