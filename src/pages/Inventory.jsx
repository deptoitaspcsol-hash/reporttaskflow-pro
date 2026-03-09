import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Package, Wrench, ArrowLeftRight, Clock, DollarSign } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import EquipmentCard from "../components/inventory/EquipmentCard";
import EquipmentForm from "../components/inventory/EquipmentForm";
import AssignmentForm from "../components/inventory/AssignmentForm";
import { useRole } from "../components/shared/useRole";
import { format } from "date-fns";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "disponible", label: "Disponibles" },
  { value: "asignado", label: "Asignados" },
  { value: "mantenimiento", label: "En Mantenimiento" },
  { value: "baja", label: "Baja" },
];

const MOVEMENT_LABELS = {
  entrega: { label: "Entrega", color: "bg-blue-100 text-blue-700" },
  devolucion: { label: "Devolución", color: "bg-emerald-100 text-emerald-700" },
  mantenimiento: { label: "Mantenimiento", color: "bg-amber-100 text-amber-700" },
};

export default function Inventory() {
  const qc = useQueryClient();
  const { canWrite } = useRole();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [editEquipment, setEditEquipment] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignType, setAssignType] = useState("entrega");

  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => base44.entities.Equipment.list("-created_date", 200),
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.EquipmentAssignment.list("-date", 500),
  });
  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: () => base44.entities.Worker.filter({ status: "activo" }),
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["workerGroups"],
    queryFn: () => base44.entities.WorkerGroup.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Equipment.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });

  // Last assignment per equipment
  const lastAssignmentMap = useMemo(() => {
    const map = {};
    assignments.forEach(a => {
      if (!map[a.equipment_id] || a.date > map[a.equipment_id].date) {
        map[a.equipment_id] = a;
      }
    });
    return map;
  }, [assignments]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter(e => {
      const matchSearch = !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.code?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [equipment, search, statusFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const totalMaintCost = assignments
      .filter(a => a.type === "mantenimiento")
      .reduce((s, a) => s + (a.maintenance_cost || 0), 0);
    return {
      total: equipment.length,
      disponible: equipment.filter(e => e.status === "disponible").length,
      asignado: equipment.filter(e => e.status === "asignado").length,
      mantenimiento: equipment.filter(e => e.status === "mantenimiento").length,
      totalMaintCost,
      totalValue: equipment.reduce((s, e) => s + (e.current_value || e.purchase_cost || 0), 0),
    };
  }, [equipment, assignments]);

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ["equipment"] });
    qc.invalidateQueries({ queryKey: ["assignments"] });
    setShowEquipmentForm(false);
    setEditEquipment(null);
    setAssignTarget(null);
  };

  return (
    <div>
      <PageHeader
        title="Inventario de Equipos"
        subtitle="Herramientas y equipos — entrega, devolución y mantenimiento"
        actions={canWrite && (
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => { setEditEquipment(null); setShowEquipmentForm(true); }}>
            <Plus className="w-4 h-4" /> Nuevo Equipo
          </Button>
        )}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total", value: kpis.total, icon: Package, color: "text-slate-700", bg: "bg-slate-100" },
          { label: "Disponibles", value: kpis.disponible, icon: Package, color: "text-emerald-700", bg: "bg-emerald-100" },
          { label: "Asignados", value: kpis.asignado, icon: ArrowLeftRight, color: "text-blue-700", bg: "bg-blue-100" },
          { label: "Mantenimiento", value: kpis.mantenimiento, icon: Wrench, color: "text-amber-700", bg: "bg-amber-100" },
          { label: "Costo Mantenimientos", value: `$${kpis.totalMaintCost.toFixed(0)}`, icon: DollarSign, color: "text-red-700", bg: "bg-red-100" },
          { label: "Valor en Stock", value: `$${kpis.totalValue.toLocaleString()}`, icon: DollarSign, color: "text-violet-700", bg: "bg-violet-100" },
        ].map(k => (
          <Card key={k.label} className="p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="inventory">
        <TabsList className="mb-4">
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="movements">Historial de Movimientos</TabsTrigger>
        </TabsList>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className="pl-9" placeholder="Buscar equipo..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredEquipment.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay equipos registrados</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEquipment.map(item => (
                <EquipmentCard
                  key={item.id}
                  item={item}
                  lastAssignment={lastAssignmentMap[item.id]}
                  canWrite={canWrite}
                  onAssign={e => { setAssignTarget(e); setAssignType("entrega"); }}
                  onReturn={e => { setAssignTarget(e); setAssignType("devolucion"); }}
                  onMaintenance={e => { setAssignTarget(e); setAssignType("mantenimiento"); }}
                  onEdit={e => { setEditEquipment(e); setShowEquipmentForm(true); }}
                  onDelete={id => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* MOVEMENTS TAB */}
        <TabsContent value="movements">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Equipo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Asignado a</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Condición</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Costo Mant.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Notas</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Sin movimientos registrados</td></tr>
                )}
                {assignments.map(a => {
                  const mv = MOVEMENT_LABELS[a.type] || { label: a.type, color: "bg-slate-100 text-slate-600" };
                  return (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{a.date}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{a.equipment_name}</p>
                        {a.equipment_code && <p className="text-xs text-slate-400 font-mono">{a.equipment_code}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mv.color}`}>{mv.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.worker_name || a.group_name || (a.maintenance_provider && `Taller: ${a.maintenance_provider}`) || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 capitalize">{a.condition_out || a.condition_in || "—"}</td>
                      <td className="px-4 py-3 text-right">{a.maintenance_cost > 0 ? <span className="font-semibold text-red-600">${a.maintenance_cost.toFixed(2)}</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">{a.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showEquipmentForm && (
        <EquipmentForm
          open={showEquipmentForm}
          onClose={() => { setShowEquipmentForm(false); setEditEquipment(null); }}
          equipment={editEquipment}
          onSave={handleSaved}
        />
      )}
      {assignTarget && (
        <AssignmentForm
          open={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          equipment={assignTarget}
          workers={workers}
          groups={groups}
          defaultType={assignType}
          onSave={handleSaved}
        />
      )}
    </div>
  );
}