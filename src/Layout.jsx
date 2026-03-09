import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ClipboardList,
  Users,
  UsersRound,
  Briefcase,
  BarChart3,
  CreditCard,
  History,
  ListTodo,
  Menu,
  X,
  ChevronRight,
  Home,
  ShieldCheck,
  Shield,
  LogOut,
  Loader2,
  FolderOpen,
  DollarSign,
  CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { base44 } from "@/api/base44Client";

const navItems = [
  { name: "Inicio", page: "Dashboard", icon: Home },
  { name: "Reporte Diario", page: "DailyReports", icon: ClipboardList },
  { name: "Asistencia", page: "Attendance", icon: CalendarDays },
  { name: "Tareas", page: "Tasks", icon: ListTodo },
  { name: "Proyectos", page: "Projects", icon: FolderOpen },
  { name: "Trabajadores", page: "Workers", icon: Users },
  { name: "Salarios", page: "Salaries", icon: DollarSign },
  { name: "Grupos", page: "WorkerGroups", icon: UsersRound },
  { name: "Labores", page: "WorkTypes", icon: Briefcase },
  { name: "Inventario", page: "Inventory", icon: Package },
  { name: "Cierres de Pago", page: "PaymentClosings", icon: CreditCard },
  { name: "Historial de Pagos", page: "PaymentHistory", icon: History },
  { name: "Reportes", page: "Reports", icon: BarChart3 },
  { name: "Desempeño", page: "Performance", icon: TrendingUp },
  { name: "Usuarios", page: "UserManagement", icon: ShieldCheck },
  { name: "Roles y Permisos", page: "RoleManagement", icon: Shield },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); setAuthLoading(false); })
      .catch(() => { setUser(null); setAuthLoading(false); });
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    base44.auth.redirectToLogin();
    return null;
  }

  if (user.blocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">🚫</span>
          </div>
          <p className="text-lg font-semibold text-slate-800">Cuenta bloqueada</p>
          <p className="text-sm text-slate-500">Tu cuenta ha sido bloqueada. Contacta al administrador.</p>
          <button onClick={() => base44.auth.logout()} className="text-sm text-red-500 underline mt-2">Cerrar sesión</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        <span className="font-semibold text-slate-800 text-sm">Control de Labores</span>
        <div className="w-10" />
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm tracking-tight">Control de</h1>
              <h1 className="font-bold text-slate-900 text-sm tracking-tight -mt-0.5">Labores</h1>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm shrink-0">
              {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">{user.full_name || user.email}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role || "visor"}</p>
            </div>
            <button
              onClick={() => base44.auth.logout()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <nav className="p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }
                `}
              >
                <item.icon className={`w-4.5 h-4.5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                <span>{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}