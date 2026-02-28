import React from "react";
import { Button } from "@/components/ui/button";
import { Users, Briefcase } from "lucide-react";

const GROUP_OPTIONS = [
  { value: "status", label: "Por Estado", icon: Briefcase },
  { value: "worker", label: "Por Trabajador", icon: Users },
];

export default function TaskGroupFilter({ value, onChange }) {
  return (
    <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
      {GROUP_OPTIONS.map(opt => (
        <Button
          key={opt.value}
          variant={value === opt.value ? "default" : "ghost"}
          size="sm"
          className={`rounded-none gap-1.5 ${value === opt.value ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          <opt.icon className="w-3.5 h-3.5" />
          {opt.label}
        </Button>
      ))}
    </div>
  );
}