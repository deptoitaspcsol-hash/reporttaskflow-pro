import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-emerald-700 font-semibold">Costo total: ${Number(payload[0]?.value || 0).toFixed(2)}</p>
      {payload[1] && <p className="text-amber-600">Extras: ${Number(payload[1]?.value || 0).toFixed(2)}</p>}
    </div>
  );
};

export default function CostTrendChart({ data }) {
  if (!data?.length) return (
    <Card className="border-slate-200 shadow-sm p-8 flex items-center justify-center h-72">
      <p className="text-sm text-slate-400">Sin datos de tendencia disponibles</p>
    </Card>
  );

  const last = data[data.length - 1]?.total || 0;
  const prev = data.length > 1 ? data[data.length - 2]?.total || 0 : 0;
  const diff = last - prev;
  const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : null;

  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const trendColor = diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-600" : "text-slate-400";

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Tendencia de Costo Total</h3>
          <p className="text-xs text-slate-400 mt-0.5">Costo de mano de obra mensual acumulado</p>
        </div>
        {pct !== null && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            {Math.abs(pct)}% vs mes anterior
          </div>
        )}
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExtra" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="total" name="Total" stroke="#10b981" strokeWidth={2.5} fill="url(#gradTotal)" dot={{ r: 3 }} />
            <Area type="monotone" dataKey="extras" name="Extras" stroke="#f59e0b" strokeWidth={2} fill="url(#gradExtra)" dot={{ r: 3 }} strokeDasharray="5 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}