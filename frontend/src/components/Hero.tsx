import React from 'react';
import { Search, Brain, Shield, UserCheck, Layers, FileCode } from 'lucide-react';

interface HeroProps {
  busqueda: string;
  setBusqueda: (val: string) => void;
  perfilFiltro: number | null;
  setPerfilFiltro: (id: number | null) => void;
  perfiles: { id: number; nombre: string }[];
}

export const Hero: React.FC<HeroProps> = ({
  busqueda,
  setBusqueda,
  perfilFiltro,
  setPerfilFiltro,
  perfiles
}) => {
  return (
    <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-blue-950/20 via-slate-950 to-slate-950 py-12 md:py-16">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Brain className="w-3.5 h-3.5" />
            <span>SENA ADSO • Ficha 3233926 • v4 Selección</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Selección técnica inteligente con <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">análisis de IA</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300">
            PrepIA une la publicación de vacantes, el parsing automático de Hojas de Vida y la aplicación de pruebas prácticas por cargo.
            <strong className="text-white font-medium"> La decisión final siempre es humana.</strong>
          </p>

          {/* Quick Metrics Badges */}
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-slate-400">
            <span className="flex items-center space-x-1 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>34 Tablas PostgreSQL</span>
            </span>
            <span className="flex items-center space-x-1 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>26 Requisitos Funcionales</span>
            </span>
            <span className="flex items-center space-x-1 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ranking Objetivo con IA</span>
            </span>
            <span className="flex items-center space-x-1 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Habeas Data & Privacidad</span>
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cargo, tecnología o empresa..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <select
            value={perfilFiltro ?? ''}
            onChange={(e) => setPerfilFiltro(e.target.value ? Number(e.target.value) : null)}
            className="px-3.5 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos los perfiles profesionales</option>
            {perfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
