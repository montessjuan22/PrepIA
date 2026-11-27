import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, Sparkles, FileText, User, Award, Shield, Save } from 'lucide-react';
import { Postulacion } from '../types';

interface CandidateDetailModalProps {
  postulacion: Postulacion | null;
  onClose: () => void;
  onSaveDecision: (id: number, decision: 'aprobado' | 'rechazado' | 'en_revision', notas: string) => void;
}

export const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({
  postulacion,
  onClose,
  onSaveDecision
}) => {
  if (!postulacion) return null;

  const [decision, setDecision] = useState<'aprobado' | 'rechazado' | 'en_revision'>(
    postulacion.decision_reclutador?.estado || postulacion.estado === 'recibida' ? 'en_revision' : postulacion.estado as any
  );
  const [notas, setNotas] = useState(postulacion.decision_reclutador?.notas || '');

  const handleGuardar = () => {
    onSaveDecision(postulacion.id, decision, notas);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-lg">
              {postulacion.candidato_nombre.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{postulacion.candidato_nombre}</h2>
              <p className="text-xs text-slate-400 font-mono">{postulacion.candidato_email} • Postulado el {postulacion.created_at}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Vacancy & Scores Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-400">Puntaje Hoja de Vida</span>
              <p className="text-2xl font-mono font-bold text-blue-400 mt-0.5">{postulacion.puntaje_cv} pts</p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-400">Prueba Técnica</span>
              <p className="text-2xl font-mono font-bold text-cyan-400 mt-0.5">{postulacion.puntaje_prueba} pts</p>
            </div>
            <div className="bg-gradient-to-b from-purple-950/30 to-slate-950 border border-purple-500/30 rounded-xl p-3.5">
              <span className="text-[11px] text-purple-300">Puntaje Final Ponderado</span>
              <p className="text-2xl font-mono font-extrabold text-white mt-0.5">{postulacion.puntaje_final} / 100</p>
            </div>
          </div>

          {/* CV Extraction Summary */}
          {postulacion.hoja_de_vida && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 mb-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Extracción de Hoja de Vida: {postulacion.hoja_de_vida.nombre_archivo}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {postulacion.hoja_de_vida.resumen_perfil}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {postulacion.hoja_de_vida.habilidades_detectadas.map((h, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800/40 font-mono">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Feedback */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Análisis & Sugerencia de IA (RF21 / RF23)</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {postulacion.retroalimentacion_ia}
            </p>
          </div>

          {/* Human Recruiter Decision Section (RF24) */}
          <div className="border-t border-slate-800 pt-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-3">
              Decisión del Reclutador (RF24 — Decisión Final Humana)
            </label>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setDecision('aprobado')}
                className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  decision === 'aprobado'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Aprobar</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('en_revision')}
                className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  decision === 'en_revision'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>En Revisión</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('rechazado')}
                className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  decision === 'rechazado'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Rechazar</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Notas internas del reclutador (historial auditable en PostgreSQL):
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Escribe comentarios sobre la decisión, aspectos a validar en entrevista presencial, etc..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleGuardar}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar Decisión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
