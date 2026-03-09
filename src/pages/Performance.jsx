import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Clock, Users, TrendingUp } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import MonthlyGroupCompare from "../components/performance/MonthlyGroupCompare";
import CostTrendChart from "../components/performance/CostTrendChart";
import TaskFulfillmentChart from "../components/performance/TaskFulfillmentChart";
import GroupRankingTable from "../components/performance/GroupRankingTable";

const MONTHS_RANGE = 6;

function getMonthKey(date) {
  return format(date, "yyyy-MM");
}
function getMonthLabel(key) {
  const [y, m] = key.split("-");
  return format(new Date(Number(y), Number(m) - 1, 1), "MMM yy", { locale: es });
}

export default function Performance() {
  const [rangeMonths, setRangeMonths] = useState(6);

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendancePerf"],
    queryFn: () => base44.entities.Attendance.list("-date", 2000),
  });
  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: () => base44.entities.Worker.list(),
  });
  const { data: workerGroups = [] } = useQuery({
    queryKey: ["workerGroups"],
    queryFn: () => base44.entities.WorkerGroup.list(),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasksPerf"],
    queryFn: () => base44.entities.Task.list("-created_date", 500),
  });

  // Build month keys for range
  const monthKeys = useMemo(() => {
    return Array.from({ length: rangeMonths }, (_, i) =>
      getMonthKey(subMonths(new Date(), rangeMonths - 1 - i))
    );
  }, [rangeMonths]);

  // All unique groups (from workers + groups entity)
  const allGroups = useMemo(() => {
    const fromWorkers = workers.map(w => w.group).filter(Boolean);
    const fromEntity = workerGroups.map(g => g.name);
    return [...new Set([...fromEntity, ...fromWorkers])];
  }, [workers, workerGroups]);

  // --- Monthly group data (for line chart) ---
  const monthlyGroupData = useMemo(() => {
    return monthKeys.map(mk => {
      const row = { mes: getMonthLabel(mk) };
      allGroups.forEach(g => {
        const recs = attendance.filter(r => r.date?.startsWith(mk) && r.group === g && r.status === "presente");
        row[g] = Math.round(recs.reduce((s, r) => s + (r.total_payment || 0), 0) * 100) / 100;
      });
      return row;
    });
  }, [monthKeys, allGroups, attendance]);

  // --- Cost trend (for area chart) ---
  const costTrendData = useMemo(() => {
    return monthKeys.map(mk => {
      const recs = attendance.filter(r => r.date?.startsWith(mk) && r.status === "presente");
      return {
        mes: getMonthLabel(mk),
        total: Math.round(recs.reduce((s, r) => s + (r.total_payment || 0), 0) * 100) / 100,
        extras: Math.round(recs.reduce((s, r) => s + (r.extra_payment || 0), 0) * 100) / 100,
      };
    });
  }, [monthKeys, attendance]);

  // --- Task fulfillment per month ---
  const taskFulfillmentData = useMemo(() => {
    return monthKeys.map(mk => {
      const monthTasks = tasks.filter(t => t.created_date?.startsWith(mk) || t.start_date?.startsWith(mk));
      const total = monthTasks.length;
      const completadas = monthTasks.filter(t => t.status === "completada").length;
      return {
        mes: getMonthLabel(mk),
        total,
        completadas,
        pct: total > 0 ? Math.round((completadas / total) * 100) : 0,
      };
    });
  }, [monthKeys, tasks]);

  // --- Group ranking ---
  const groupRanking = useMemo(() => {
    const currentMk = monthKeys[monthKeys.length - 1];
    const prevMk = monthKeys.length > 1 ? monthKeys[monthKeys.length - 2] : null;

    return allGroups.map(g => {
      const groupColor = workerGroups.find(wg => wg.name === g)?.color;
      const workerCount = workers.filter(w => w.group === g && w.status !== "inactivo").length;

      const allRecs = attendance.filter(r => r.group === g && r.status === "presente");
      const currentRecs = attendance.filter(r => r.date?.startsWith(currentMk) && r.group === g && r.status === "presente");
      const prevRecs = prevMk ? attendance.filter(r => r.date?.startsWith(prevMk) && r.group === g && r.status === "presente") : [];

      const totalCost = allRecs.reduce((s, r) => s + (r.total_payment || 0), 0);
      const extraHours = allRecs.reduce((s, r) => s + (r.extra_hours || 0), 0);
      const attendances = allRecs.length;

      const currCost = currentRecs.reduce((s, r) => s + (r.total_payment || 0), 0);
      const prevCost = prevRecs.reduce((s, r) => s + (r.total_payment || 0), 0);
      const trend = prevCost > 0 ? ((currCost - prevCost) / prevCost) * 100 : 0;

      return { group: g, color: groupColor, workers: workerCount, totalCost, extraHours, attendances, trend };
    })
      .filter(g => g.totalCost > 0 || g.workers > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [allGroups, attendance, workers, workerGroups, monthKeys]);

  // Summary KPIs for selected range
  const kpis = useMemo(() => {
    const rangeRecs = attendance.filter(r => {
      const mk = r.date?.slice(0, 7);
      return monthKeys.includes(mk) && r.status === "presente";
    });
    const totalCost = rangeRecs.reduce((s, r) => s + (r.total_payment || 0), 0);
    const extraCost = rangeRecs.reduce((s, r) => s + (r.extra_payment || 0), 0);
    const extraHours = rangeRecs.reduce((s, r) => s + (r.extra_hours || 0), 0);
    const avgPerWorker = workers.filter(w => w.status !== "inactivo").length > 0
      ? totalCost / workers.filter(w => w.status !== "inactivo").length : 0;
    return { totalCost, extraCost, extraHours, avgPerWorker };
  }, [attendance, monthKeys, workers]);

  return (
    <div>
      <PageHeader
        title="Análisis de Desempeño"
        subtitle="Productividad y tendencias de costos por grupo de trabajo"
        actions={
          <Select value={String(rangeMonths)} onValueChange={v => setRangeMonths(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Costo Total</p>
            <p className="text-xl font-bold text-emerald-700">${kpis.totalCost.toFixed(0)}</p>
            <p className="text-xs text-slate-400">en {rangeMonths} meses</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Horas Extra</p>
            <p className="text-xl font-bold text-amber-600">{kpis.extraHours.toFixed(1)}h</p>
            <p className="text-xs text-slate-400">${kpis.extraCost.toFixed(0)} en extras</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Costo Promedio</p>
            <p className="text-xl font-bold text-blue-700">${kpis.avgPerWorker.toFixed(0)}</p>
            <p className="text-xs text-slate-400">por trabajador</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Extras / Total</p>
            <p className="text-xl font-bold text-violet-700">
              {kpis.totalCost > 0 ? `${((kpis.extraCost / kpis.totalCost) * 100).toFixed(1)}%` : "—"}
            </p>
            <p className="text-xs text-slate-400">costo en horas extra</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="space-y-5">
        <MonthlyGroupCompare data={monthlyGroupData} groups={allGroups} />

        <div className="grid lg:grid-cols-2 gap-5">
          <CostTrendChart data={costTrendData} />
          <TaskFulfillmentChart data={taskFulfillmentData} />
        </div>

        <GroupRankingTable data={groupRanking} />
      </div>
    </div>
  );
}