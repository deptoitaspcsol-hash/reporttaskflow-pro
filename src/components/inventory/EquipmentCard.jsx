import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, ArrowLeftRight, RotateCcw, Pencil, Trash2 } from "lucide-react";

const STATUS_STYLES = {
  disponible: "bg-emerald-100 text-emerald-700",
  asignado: "bg-blue-100 text-blue-700",
  mantenimiento: "bg-amber-100 text-amber-700",
  baja: "bg-red-100 text-red-700",
};

const CATEGORY_LABELS = {
  herramienta_manual: "Herramienta Manual",
  herramienta_electrica: "Herramienta Eléctrica",
  maquinaria: "Maquinaria",
  vehiculo: "Vehículo",
  equipo_proteccion: "Equipo Protección",
  otro: "Otro",
};

export default function EquipmentCard({ item, lastAssignment, onAssign, onReturn, onMaintenance, onEdit, onDelete, canWrite }) {
  const isAsignado = item.status === "asignado";
  const isMant = item.status === "mantenimiento";
  const isDisponible = item.status === "disponible";

  return (
    <Card className="border-slate-200/80 hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-sm">{item.name}</h3>
              {item.code && <span className="text-xs text-slate-400 font-mono">{item.code}</span>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{CATEGORY_LABELS[item.category] || item.category}</p>
          </div>
          <Badge className={`shrink-0 text-xs ${STATUS_STYLES[item.status] || "bg-slate-100 text-slate-600"}`}>
            {item.status}
          </Badge>
        </div>

        {item.location && (
          <p className="text-xs text-slate-500 mb-2">📍 {item.location}</p>
        )}

        {isAsignado && lastAssignment && (
          <div className="text-xs bg-blue-50 rounded-lg px-3 py-2 mb-3 text-blue-700">
            Asignado a: <span className="font-semibold">{lastAssignment.worker_name || lastAssignment.group_name || "—"}</span>
            {lastAssignment.expected_return && <span className="ml-2 text-blue-500">· Dev. {lastAssignment.expected_return}</span>}
          </div>
        )}

        {isMant && lastAssignment && (
          <div className="text-xs bg-amber-50 rounded-lg px-3 py-2 mb-3 text-amber-700">
            En mantenimiento{lastAssignment.maintenance_provider ? ` — ${lastAssignment.maintenance_provider}` : ""}
            {lastAssignment.maintenance_cost ? <span className="ml-2 font-semibold">${lastAssignment.maintenance_cost}</span> : ""}
          </div>
        )}

        {item.purchase_cost > 0 && (
          <p className="text-xs text-slate-400 mb-3">Costo compra: <span className="font-medium text-slate-600">${item.purchase_cost?.toLocaleString()}</span></p>
        )}

        {canWrite && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {isDisponible && (
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => onAssign(item)}>
                <ArrowLeftRight className="w-3 h-3" /> Entregar
              </Button>
            )}
            {isAsignado && (
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => onReturn(item)}>
                <RotateCcw className="w-3 h-3" /> Devolver
              </Button>
            )}
            {(isDisponible || isAsignado) && (
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => onMaintenance(item)}>
                <Wrench className="w-3 h-3" /> Mant.
              </Button>
            )}
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" className="w-7 h-7 p-0 text-slate-400 hover:text-slate-700" onClick={() => onEdit(item)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="w-7 h-7 p-0 text-slate-400 hover:text-red-500" onClick={() => onDelete(item.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}