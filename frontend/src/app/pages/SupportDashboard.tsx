import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { SupportTicketsPanel } from "../components/SupportTicketsPanel";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getCurrentUser } from "../../services/api";
import { Crown, Headphones, Shield } from "lucide-react";

export function SupportDashboard() {
  const user = getCurrentUser();
  const isSuperAdmin = Boolean(user?.rol === "admin" && user?.es_admin_principal);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-cyan-600 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-cyan-500/20">
              <Headphones className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Mesa de Soporte Técnico
              </h1>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-0.5">
                Sesión activa: <span className="font-semibold text-cyan-600 dark:text-cyan-400">{user?.nombre || "Agente"}</span> ({user?.email || "—"})
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs">
                  {isSuperAdmin ? (
                    <span className="inline-flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-500" /> Superadmin con Permisos de Soporte
                    </span>
                  ) : (
                    "Agente de Soporte"
                  )}
                </Badge>
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <Link to="/dashboard/admin">
              <Button variant="outline" className="border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                <Shield className="w-4 h-4 mr-1.5" />
                Volver al Panel Admin
              </Button>
            </Link>
          )}
        </div>

        <SupportTicketsPanel />
      </div>
    </div>
  );
}
