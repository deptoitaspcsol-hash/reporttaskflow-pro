import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-800 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="font-medium">{p.name}:</span>
          <span>{Number(p.value).toFixed(1)}h</span>
        </p>
      ))}
    </div>
  );
};

export default function HoursComparisonChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm p-6 flex items-center justify-center h-64">
        <div className="text-center text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Sin datos de asistencia disponibles</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm">Horas Regulares vs Horas Extra</h3>
        <p className="text-xs text-slate-400 mt-0.5">Últimos 7 días</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              formatter={(v) => <span className="text-slate-600">{v}</span>}
            />
            <Bar dataKey="regulares" name="Horas Regulares" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={40} stackId="a" />
            <Bar dataKey="extras" name="Horas Extra" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={40} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}