import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ClipboardList, Users, UsersRound, Briefcase, BarChart3, CreditCard, History, ListTodo,
  Menu, X, Home, ShieldCheck, Shield, LogOut, Loader2, FolderOpen, DollarSign, CalendarDays,
  Package, TrendingUp, Lock, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { base44 } from "@/api/base44Client";
import { useRole } from "@/components/shared/useRole";
import InstallAppButton from "@/components/pwa/InstallAppButton";
import OfflineBanner from "@/components/pwa/OfflineBanner";

// Cada página puede depender de un módulo de la matriz "Roles y Permisos" (permiso "ver").
// Las páginas sin módulo quedan abiertas a cualquier usuario autenticado, como antes.
const PAGE_MODULE = {
  DailyReports: "daily_reports",
  Tasks: "tasks",
  Projects: "projects",
  Workers: "workers",
  Salaries: "workers",
  WorkerGroups: "worker_groups",
  WorkTypes: "work_types",
  PaymentClosings: "payment_closings",
  PaymentHistory: "payment_history",
  Reports: "reports",
  Performance: "reports",
};
const ADMIN_PAGES = new Set(["UserManagement", "RoleManagement"]);

const navGroups = [
  {
    label: "Operación",
    items: [
      { name: "Inicio", page: "Dashboard", icon: Home },
      { name: "Reporte Diario", page: "DailyReports", icon: ClipboardList },
      { name: "Asistencia", page: "Attendance", icon: CalendarDays },
      { name: "Tareas", page: "Tasks", icon: ListTodo },
      { name: "Proyectos", page: "Projects", icon: FolderOpen },
    ],
  },
  {
    label: "Personal y recursos",
    items: [
      { name: "Trabajadores", page: "Workers", icon: Users },
      { name: "Grupos", page: "WorkerGroups", icon: UsersRound },
      { name: "Labores", page: "WorkTypes", icon: Briefcase },
      { name: "Salarios", page: "Salaries", icon: DollarSign },
      { name: "Inventario", page: "Inventory", icon: Package },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { name: "Cierres de Pago", page: "PaymentClosings", icon: CreditCard },
      { name: "Historial de Pagos", page: "PaymentHistory", icon: History },
    ],
  },
  {
    label: "Análisis",
    items: [
      { name: "Reportes", page: "Reports", icon: BarChart3 },
      { name: "Desempeño", page: "Performance", icon: TrendingUp },
    ],
  },
  {
    label: "Administración",
    items: [
      { name: "Usuarios", page: "UserManagement", icon: ShieldCheck },
      { name: "Roles y Permisos", page: "RoleManagement", icon: Shield },
    ],
  },
];

const FullScreen = ({ children }) => (
  <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-6">{children}</div>
);

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, userError, refetchUser, isLoading, isAdmin, can, role } = useRole();

  // Solo se manda al login si realmente no hay sesión (401/403). Un fallo de red o del servidor
  // (p. ej. la PWA abierta sin conexión) no debe sacar al usuario de la app.
  const status = userError?.status ?? userError?.response?.status;
  const sessionInvalid = !user && (!userError || status === 401 || status === 403);
  const connectionProblem = !user && !!userError && !sessionInvalid;

  useEffect(() => {
    if (!isLoading && sessionInvalid) base44.auth.redirectToLogin();
  }, [isLoading, sessionInvalid]);

  // Cerrar el menú con Escape (accesibilidad en teclado).
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e) => e.key === "Escape" && setSidebarOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  if (connectionProblem) {
    return (
      <FullScreen>
        <div className="text-center space-y-3 max-w-xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <WifiOff className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-lg font-semibold text-slate-800">No se pudo conectar</p>
          <p className="text-sm text-slate-500">Revisa tu conexión a internet. Tu sesión sigue activa.</p>
          <Button onClick={() => refetchUser()} className="bg-emerald-600 hover:bg-emerald-700">Reintentar</Button>
        </div>
      </FullScreen>
    );
  }

  if (isLoading || !user) {
    return (
      <FullScreen>
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" aria-label="Cargando" />
      </FullScreen>
    );
  }

  if (user.blocked) {
    return (
      <FullScreen>
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-lg font-semibold text-slate-800">Cuenta bloqueada</p>
          <p className="text-sm text-slate-500">Tu cuenta ha sido bloqueada. Contacta al administrador.</p>
          <button onClick={() => base44.auth.logout()} className="text-sm text-red-500 underline mt-2">Cerrar sesión</button>
        </div>
      </FullScreen>
    );
  }

  // ¿Puede ver una página? Administración solo para admin; el resto según la matriz de permisos.
  const canOpen = (page) => {
    if (ADMIN_PAGES.has(page)) return isAdmin;
    const module = PAGE_MODULE[page];
    return module ? can(module, "view") : true;
  };

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => canOpen(i.page)) }))
    .filter((g) => g.items.length > 0);

  const currentLabel = navGroups.flatMap((g) => g.items).find((i) => i.page === currentPageName)?.name;
  const allowed = canOpen(currentPageName);

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Cabecera móvil (respeta la muesca del teléfono) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 px-3 h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
          <ClipboardList className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-slate-800 text-sm truncate">{currentLabel || "Control de Labores"}</span>
      </header>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside
        aria-label="Menú principal"
        className={`
          fixed top-0 left-0 z-50 h-dvh w-64 bg-white border-r border-slate-200 flex flex-col
          transform transition-transform duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] lg:pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-600/30">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="font-bold text-slate-900 text-sm tracking-tight">Control de Labores</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">TaskFlow Pro</p>
            </div>
          </div>
        </div>

        {/* Navegación con scroll propio: en pantallas bajas los últimos enlaces antes quedaban cortados */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
                      `}
                    >
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-emerald-500" />}
                      <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2 bg-slate-50/60">
          <InstallAppButton className="w-full" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm shrink-0">
              {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">{user.full_name || user.email}</p>
              <p className="text-xs text-slate-400 capitalize truncate">{role}</p>
            </div>
            <button
              onClick={() => base44.auth.logout()}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64 pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0 min-h-dvh">
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px]">
          {allowed ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500 text-center">
              <Shield className="w-12 h-12 text-slate-300" />
              <p className="text-lg font-medium text-slate-700">Acceso restringido</p>
              <p className="text-sm max-w-sm">Tu rol no tiene permiso para ver esta sección. Si lo necesitas, pídelo a un administrador.</p>
            </div>
          )}
        </div>
      </main>

      <OfflineBanner />
      <Toaster position="top-right" richColors />
    </div>
  );
}
