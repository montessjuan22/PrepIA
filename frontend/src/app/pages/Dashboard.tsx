import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { LinkButton } from "../components/ui/link-button";
import { User, Building2, Shield } from "lucide-react";

export function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Selecciona tu Panel
          </h1>
          <p className="text-lg text-gray-600 dark:text-slate-300">
            Accede al dashboard según tu tipo de usuario
          </p>
        </div>

        {/* Dashboard Options */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Candidate Dashboard */}
          <Card className="p-8 hover:shadow-xl transition-shadow border-2 border-gray-200 dark:border-slate-800 bg-white dark:bg-[#141d33] hover:border-[#0066CC] dark:hover:border-blue-500">
            <div className="text-center">
              <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-[#0066CC]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Candidato</h2>
              <p className="text-gray-600 dark:text-slate-300 mb-6">
                Gestiona tu CV, aplicaciones y progreso profesional
              </p>
              <LinkButton className="w-full bg-[#0066CC] hover:bg-[#004999]" to="/dashboard/candidate">
                Acceder al Panel
              </LinkButton>
            </div>
          </Card>

          {/* Company Dashboard */}
          <Card className="p-8 hover:shadow-xl transition-shadow border-2 border-gray-200 dark:border-slate-800 bg-white dark:bg-[#141d33] hover:border-green-600">
            <div className="text-center">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Empresa</h2>
              <p className="text-gray-600 dark:text-slate-300 mb-6">
                Publica vacantes y gestiona candidatos
              </p>
              <LinkButton className="w-full bg-green-600 hover:bg-green-700" to="/dashboard/company">
                Acceder al Panel
              </LinkButton>
            </div>
          </Card>

          {/* Admin Dashboard */}
          <Card className="p-8 hover:shadow-xl transition-shadow border-2 border-gray-200 dark:border-slate-800 bg-white dark:bg-[#141d33] hover:border-purple-600">
            <div className="text-center">
              <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Administrador</h2>
              <p className="text-gray-600 dark:text-slate-300 mb-6">
                Gestiona usuarios y configuración del sistema
              </p>
              <LinkButton className="w-full bg-purple-600 hover:bg-purple-700" to="/dashboard/admin">
                Acceder al Panel
              </LinkButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}