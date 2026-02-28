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
  LogOut,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { base44 } from "@/api/base44Client";

const navItems = [
  { name: "Inicio", page: "Dashboard", icon: Home },
  { name: "Reporte Diario", page: "DailyReports", icon: ClipboardList },
  { name: "Tareas", page: "Tasks", icon: ListTodo },
  { name: "Trabajadores", page: "Workers", icon: Users },
  { name: "Grupos", page: "WorkerGroups", icon: UsersRound },
  { name: "Labores", page: "WorkTypes", icon: Briefcase },
  { name: "Cierres de Pago", page: "PaymentClosings", icon: CreditCard },
  { name: "Historial de Pagos", page: "PaymentHistory", icon: History },
  { name: "Reportes", page: "Reports", icon: BarChart3 },
  { name: "Usuarios", page: "UserManagement", icon: ShieldCheck },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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