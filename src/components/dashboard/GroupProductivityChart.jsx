import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-800 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="font-medium">{p.name}:</span>
          <span>{p.name === "Costo ($)" ? `$${Number(p.value).toFixed(2)}` : `${p.value}`}</span>
        </p>
      ))}
    </div>
  );
};

export default function GroupProductivityChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm p-6 flex items-center justify-center h-64">
        <div className="text-center text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Sin datos de grupos disponibles</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm">Productividad por Grupo</h3>
        <p className="text-xs text-slate-400 mt-0.5">Costo de mano de obra y trabajadores activos</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="group" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="costo" name="Costo ($)" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Group legend */}
        <div className="flex flex-wrap gap-2 mt-2">
          {data.map((d, i) => (
            <div key={d.group} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span>{d.group}</span>
              <span className="text-slate-400">({d.trabajadores})</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}