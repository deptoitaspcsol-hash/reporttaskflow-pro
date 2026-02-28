import { Badge } from "@/components/ui/badge";

const ROLE_CONFIG = {
  admin: { label: "Admin", className: "bg-violet-100 text-violet-700 border-violet-200" },
  capturista: { label: "Capturista", className: "bg-blue-100 text-blue-700 border-blue-200" },
  visor: { label: "Visor", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function RoleBadge({ role }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.visor;
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}