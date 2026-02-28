import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, User, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const FIELD_LABELS = {
  title: "Título",
  description: "Descripción",
  status: "Estado",
  priority: "Prioridad",
  location: "Ubicación",
  worker_name: "Trabajador",
  group_name: "Grupo",
  work_type_name: "Tipo de labor",
  start_date: "Fecha inicio",
  end_date: "Fecha fin",
  estimated_cost: "Costo estimado",
  notes: "Notas",
  quantity: "Cantidad",
  amount: "Monto",
  rate: "Tarifa",
  unit: "Unidad",
  date: "Fecha",
};

function formatDate(iso) {
  try {
    return format(new Date(iso), "dd MMM yyyy, HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

export default function HistoryLog({ entityType, entityId }) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["historial", entityType, entityId],
    queryFn: () => base44.entities.Historial.filter({ entity_type: entityType, entity_id: entityId }, "-modified_at", 50),
    enabled: !!entityId,
  });

  if (isLoading) return <p className="text-xs text-slate-400 py-2">Cargando historial...</p>;
  if (entries.length === 0) return <p className="text-xs text-slate-400 py-2">Sin cambios registrados aún.</p>;

  return (
    <div className="space-y-2">
      {entries.map(entry => (
        <div key={entry.id} className="flex gap-3 items-start text-xs">
          <div className="mt-0.5 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <Clock className="w-3 h-3 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1 text-slate-700">
              {entry.action === "creado" ? (
                <span className="font-medium text-emerald-600">Registro creado</span>
              ) : entry.action === "eliminado" ? (
                <span className="font-medium text-red-500">Registro eliminado</span>
              ) : (
                <>
                  <span className="font-medium">{FIELD_LABELS[entry.field] || entry.field}</span>
                  <span className="text-slate-400">cambió de</span>
                  <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded max-w-[120px] truncate" title={entry.old_value}>
                    {entry.old_value || "—"}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded max-w-[120px] truncate" title={entry.new_value}>
                    {entry.new_value || "—"}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-slate-400">
              <User className="w-3 h-3" />
              <span>{entry.modified_by || "Sistema"}</span>
              <span>·</span>
              <span>{formatDate(entry.modified_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}