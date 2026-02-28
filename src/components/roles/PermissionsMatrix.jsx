import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export const MODULES = [
  { key: "workers", label: "Trabajadores" },
  { key: "daily_reports", label: "Reportes Diarios" },
  { key: "tasks", label: "Tareas" },
  { key: "worker_groups", label: "Grupos" },
  { key: "work_types", label: "Tipos de Labor" },
  { key: "payment_closings", label: "Cierres de Pago" },
  { key: "payment_history", label: "Historial de Pagos" },
  { key: "reports", label: "Reportes" },
];

export const ACTIONS = [
  { key: "view", label: "Ver" },
  { key: "create", label: "Crear" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Eliminar" },
  { key: "export", label: "Exportar" },
];

export default function PermissionsMatrix({ permissions, onChange, readOnly }) {
  const getVal = (mod, action) => permissions?.[mod]?.[action] ?? false;

  const toggle = (mod, action) => {
    if (readOnly) return;
    const current = getVal(mod, action);
    const updated = {
      ...permissions,
      [mod]: {
        ...(permissions?.[mod] || {}),
        [action]: !current,
        // if enabling create/edit/delete, auto-enable view
        ...((!current && action !== "view") ? { view: true } : {}),
      }
    };
    onChange(updated);
  };

  const toggleAll = (mod) => {
    if (readOnly) return;
    const allOn = ACTIONS.every(a => getVal(mod, a.key));
    const updated = {
      ...permissions,
      [mod]: Object.fromEntries(ACTIONS.map(a => [a.key, !allOn]))
    };
    onChange(updated);
  };

  const toggleAction = (action) => {
    if (readOnly) return;
    const allOn = MODULES.every(m => getVal(m.key, action));
    const updated = { ...permissions };
    MODULES.forEach(m => {
      updated[m.key] = { ...(updated[m.key] || {}), [action]: !allOn };
      if (!allOn && action !== "view") updated[m.key].view = true;
    });
    onChange(updated);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 font-medium text-slate-600 min-w-[160px]">Módulo</th>
            {ACTIONS.map(a => (
              <th key={a.key} className="px-3 py-3 text-center font-medium text-slate-600 min-w-[80px]">
                <button
                  className="flex flex-col items-center gap-1 mx-auto hover:text-emerald-700 transition-colors"
                  onClick={() => toggleAction(a.key)}
                  title={`Marcar/desmarcar ${a.label} en todos`}
                  disabled={readOnly}
                >
                  <span>{a.label}</span>
                  <span className="text-[10px] text-slate-400">todos</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((mod, idx) => (
            <tr key={mod.key} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
              <td className="px-4 py-2.5">
                <button
                  className="text-slate-700 font-medium hover:text-emerald-700 transition-colors text-left"
                  onClick={() => toggleAll(mod.key)}
                  title="Marcar/desmarcar todos los permisos de este módulo"
                  disabled={readOnly}
                >
                  {mod.label}
                </button>
              </td>
              {ACTIONS.map(a => (
                <td key={a.key} className="px-3 py-2.5 text-center">
                  <Checkbox
                    checked={getVal(mod.key, a.key)}
                    onCheckedChange={() => toggle(mod.key, a.key)}
                    disabled={readOnly}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}