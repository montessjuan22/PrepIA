import React from 'react';
import { MapPin, Clock, Award, Building2, ChevronRight, FileText, CheckCircle } from 'lucide-react';
import { Vacante } from '../types';

interface VacancyCardProps {
  vacante: Vacante;
  onPostular: (vacante: Vacante) => void;
  yaPostulado?: boolean;
}

export const VacancyCard: React.FC<VacancyCardProps> = ({
  vacante,
  onPostular,
  yaPostulado = false
}) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between">
      <div>
        {/* Header: Company & Badges */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
            <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="truncate">{vacante.empresa_nombre}</span>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 uppercase">
            {vacante.modalidad}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors mb-2">
          {vacante.titulo}
        </h3>

        {/* Profile badge */}
        <div className="mb-4">
          <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-md bg-blue-950/60 text-blue-300 border border-blue-800/40">
            {vacante.perfil_nombre}
          </span>
        </div>

        {/* Description snippet */}
        <p className="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          {vacante.descripcion}
        </p>

        {/* Evaluation Weights Bar */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 font-medium">
            <span>Ponderación de evaluación</span>
            <span className="text-slate-400 font-mono">CV: {vacante.peso_cv}% | Prueba: {vacante.peso_prueba}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${vacante.peso_cv}%` }}
              className="bg-indigo-500 h-full"
              title={`Peso Hoja de Vida: ${vacante.peso_cv}%`}
            />
            <div
              style={{ width: `${vacante.peso_prueba}%` }}
              className="bg-cyan-400 h-full"
              title={`Peso Prueba Técnica: ${vacante.peso_prueba}%`}
            />
          </div>
        </div>
      </div>

      {/* Footer Details & Action */}
      <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span>{vacante.ubicacion}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{vacante.tiempo_limite_minutos} min</span>
          </span>
          <span className="flex items-center space-x-1">
            <Award className="w-3.5 h-3.5 text-slate-500" />
            <span>Mín: {vacante.puntaje_minimo} pts</span>
          </span>
        </div>

        {yaPostulado ? (
          <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-xs font-semibold text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Postulado</span>
          </span>
        ) : (
          <button
            onClick={() => onPostular(vacante)}
            className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm hover:shadow-blue-500/20 transition-all"
          >
            <span>Postularme</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
