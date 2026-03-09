import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Medal } from "lucide-react";

const MEDAL_COLORS = ["text-amber-500", "text-slate-400", "text-orange-600"];

export default function GroupRankingTable({ data }) {
  if (!data?.length) return null;

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm">Ranking de Productividad</h3>
        <p className="text-xs text-slate-400 mt-0.5">Grupos ordenados por costo de mano de obra acumulado</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Grupo</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Trabajadores</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Costo Total</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-amber-600">Horas Extra</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Asistencias</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Tendencia</th>
            </tr>
          </thead>
          <tbody>
            {data.map((g, i) => {
              const TrendIcon = g.trend > 0 ? TrendingUp : g.trend < 0 ? TrendingDown : Minus;
              const trendColor = g.trend > 0 ? "text-red-500" : g.trend < 0 ? "text-emerald-600" : "text-slate-400";
              return (
                <tr key={g.group} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    {i < 3 ? (
                      <Medal className={`w-4 h-4 ${MEDAL_COLORS[i]}`} />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color || "#10b981" }} />
                      <span className="font-medium text-slate-800">{g.group}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{g.workers}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">${g.totalCost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={g.extraHours > 0 ? "text-amber-600 font-medium" : "text-slate-400"}>
                      {g.extraHours.toFixed(1)}h
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{g.attendances}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`flex items-center justify-end gap-1 text-xs font-semibold ${trendColor}`}>
                      <TrendIcon className="w-3.5 h-3.5" />
                      {g.trend !== 0 ? `${Math.abs(g.trend).toFixed(1)}%` : "Estable"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}