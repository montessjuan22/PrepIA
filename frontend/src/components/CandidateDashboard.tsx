import React from 'react';
import { Briefcase, CheckCircle2, Clock, XCircle, Award, Sparkles, ArrowRight, FileText } from 'lucide-react';
import { Postulacion } from '../types';

interface CandidateDashboardProps {
  postulaciones: Postulacion[];
  onIrAVacantes: () => void;
  onIrAPractica: () => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  postulaciones,
  onIrAVacantes,
  onIrAPractica
}) => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Portal del Candidato</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Mis Postulaciones y Desempeño</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Revisa el estado de tus procesos de selección, desglose de calificaciones y retroalimentación personalizada.
          </p>
        </div>

        <button
          onClick={onIrAVacantes}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
        >
          <span>Ver Más Vacantes</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Postulaciones Activas</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{postulaciones.length}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Promedio en Pruebas</span>
          </div>
          <p className="text-2xl font-bold text-cyan-400 font-mono">85.0 pts</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Insignias Obtenidas (RF10)</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">3 Insignias</p>
        </div>
      </div>

      {/* List of Applications */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white mb-2">Historial de Procesos de Selección</h2>

        {postulaciones.map((p) => (
          <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all hover:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-xs text-blue-400 font-semibold">{p.vacante_titulo}</span>
                <p className="text-xs text-slate-400 mt-0.5">Postulado el {p.created_at}</p>
              </div>

              {/* Status Badge */}
              <div>
                {p.estado === 'aprobado' ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aprobado por el Reclutador</span>
                  </span>
                ) : p.estado === 'rechazado' ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-700/60 text-rose-300 text-xs font-semibold">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>No seleccionado</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-700/60 text-amber-300 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>En Revisión del Reclutador</span>
                  </span>
                )}
              </div>
            </div>

            {/* Scores bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 mb-4 text-xs font-mono">
              <div>
                <span className="text-slate-400">Match Hoja de Vida:</span>
                <span className="text-blue-400 font-bold ml-1.5">{p.puntaje_cv} pts</span>
              </div>
              <div>
                <span className="text-slate-400">Prueba Técnica:</span>
                <span className="text-cyan-400 font-bold ml-1.5">{p.puntaje_prueba} pts</span>
              </div>
              <div>
                <span className="text-slate-400">Puntaje Final:</span>
                <span className="text-white font-extrabold ml-1.5">{p.puntaje_final} / 100</span>
              </div>
            </div>

            {/* Feedback / Note */}
            {p.retroalimentacion_ia && (
              <div className="bg-slate-950/40 border-l-2 border-cyan-400 p-3 rounded-r-xl text-xs text-slate-300">
                <span className="font-semibold text-cyan-300">Retroalimentación IA: </span>
                {p.retroalimentacion_ia}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
