import React from "react";
import { differenceInDays, parseISO, isValid, format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, AlertCircle } from "lucide-react";

export default function TaskDueDate({ endDate, status, compact = false }) {
  if (!endDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = parseISO(endDate);
  if (!isValid(end)) return null;

  const daysLeft = differenceInDays(end, today);
  const isOverdue = daysLeft < 0 && !["completada", "cancelada"].includes(status);
  const isDueSoon = daysLeft <= 3 && daysLeft >= 0 && !["completada", "cancelada"].includes(status);

  let bgColor = "bg-slate-100 text-slate-700";
  let textContent = format(end, "d MMM", { locale: es });

  if (["completada", "cancelada"].includes(status)) {
    bgColor = "bg-slate-50 text-slate-500";
  } else if (isOverdue) {
    bgColor = "bg-red-100 text-red-700";
    textContent = `Vencida hace ${Math.abs(daysLeft)}d`;
  } else if (isDueSoon) {
    bgColor = "bg-orange-100 text-orange-700";
    textContent = daysLeft === 0 ? "Vence HOY" : `Vence en ${daysLeft}d`;
  }

  if (compact) {
    return (
      <div className={`text-xs px-2 py-1 rounded ${bgColor} flex items-center gap-1`}>
        {isOverdue && <AlertCircle className="w-3 h-3" />}
        {textContent}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${bgColor}`}>
      <Calendar className="w-3.5 h-3.5" />
      {textContent}
    </div>
  );
}