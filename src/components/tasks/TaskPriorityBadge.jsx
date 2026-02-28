import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle } from "lucide-react";

const PRIORITY_CONFIG = {
  baja: { label: "Baja", className: "bg-slate-100 text-slate-700", icon: null },
  media: { label: "Media", className: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  alta: { label: "Alta", className: "bg-red-100 text-red-800", icon: AlertCircle },
};

export default function TaskPriorityBadge({ priority, showIcon = false }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.media;
  const Icon = config.icon;

  return (
    <Badge className={`text-xs gap-1 ${config.className}`}>
      {showIcon && Icon && <Icon className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}