import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { RegisterFormCard } from "../components/RegisterFormCard";
import { Card } from "../components/ui/card";
import { BrainCircuit } from "lucide-react";

export function Register() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-slate-50 to-gray-100 dark:from-[#0b0f19] dark:via-[#111827] dark:to-[#0b0f19] flex flex-col transition-colors duration-200">
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center bg-[#0066CC] p-3 rounded-2xl shadow-lg shadow-blue-500/20 mb-4 text-white">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Crear cuenta en <span className="text-[#0066CC] dark:text-blue-400">PrepIA</span>
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              Regístrate con Google o con tu correo electrónico
            </p>
          </div>

          <Card className="p-6 sm:p-8 bg-white dark:bg-[#141d33] shadow-2xl rounded-2xl border border-gray-200/80 dark:border-slate-800">
            <RegisterFormCard />

            <p className="text-center mt-5 text-sm text-gray-600 dark:text-slate-400">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="font-semibold text-[#0066CC] dark:text-blue-400 hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
