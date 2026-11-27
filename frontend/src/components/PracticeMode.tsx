import React, { useState } from 'react';
import { Code, Play, Sparkles, Filter, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
import { EJERCICIOS_PRACTICA_MOCK } from '../data/mockData';
import { EjercicioPractica } from '../types';

interface PracticeModeProps {
  onStartPracticeExercise: (ejercicio: EjercicioPractica) => void;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({ onStartPracticeExercise }) => {
  const [dificultadFiltro, setDificultadFiltro] = useState<string>('todas');

  const filtrados = EJERCICIOS_PRACTICA_MOCK.filter(
    (e) => dificultadFiltro === 'todas' || e.dificultad.toLowerCase() === dificultadFiltro.toLowerCase()
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Entrenamiento Autónomo</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Simulador de Práctica con IA (RF03 a RF06)</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Entrena tus habilidades de código sin afectar vacantes reales. Recibe retroalimentación inteligente y pistas contextuales.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-300 font-medium">Dificultad:</span>
          <select
            value={dificultadFiltro}
            onChange={(e) => setDificultadFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="todas">Todas</option>
            <option value="básico">Básico</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>
      </div>

      {/* Grid of Practice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtrados.map((ej) => (
          <div
            key={ej.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/40 transition-all hover:shadow-xl hover:shadow-cyan-500/5"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {ej.lenguaje}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  ej.dificultad === 'Básico'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                    : ej.dificultad === 'Intermedio'
                    ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                    : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                }`}>
                  {ej.dificultad}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-2">{ej.titulo}</h3>
              <p className="text-xs text-slate-400 mb-4 line-clamp-3 leading-relaxed">
                {ej.descripcion}
              </p>
            </div>

            <button
              onClick={() => onStartPracticeExercise(ej)}
              className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-950 hover:bg-cyan-600/20 text-cyan-300 border border-cyan-800/40 text-xs font-bold transition-all"
            >
              <Code className="w-4 h-4" />
              <span>Resolver Ejercicio</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
