import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, ShieldCheck, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Vacante } from '../types';

interface ApplicationModalProps {
  vacante: Vacante | null;
  onClose: () => void;
  onStartTest: (vacante: Vacante, cvData: { nombre_archivo: string; puntaje_match_cv: number; habilidades: string[] }) => void;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({
  vacante,
  onClose,
  onStartTest
}) => {
  if (!vacante) return null;

  const [archivo, setArchivo] = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [analisisListo, setAnalisisListo] = useState(false);
  const [consentimiento, setConsentimiento] = useState(true);

  // Simulated CV extraction
  const [skillsDetectadas, setSkillsDetectadas] = useState<string[]>([]);
  const [matchScore, setMatchScore] = useState<number>(0);

  const handleSimularCarga = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArchivo(file);
      setAnalizando(true);

      // Simulate IA processing of the PDF
      setTimeout(() => {
        setAnalizando(false);
        setAnalisisListo(true);
        setSkillsDetectadas(['Python', 'FastAPI', 'React', 'PostgreSQL', 'Docker', 'Git', 'REST APIs']);
        setMatchScore(88);
      }, 1200);
    }
  };

  const handleContinuarPrueba = () => {
    if (!consentimiento) {
      alert('Debes aceptar el consentimiento de tratamiento de datos personales para postularte.');
      return;
    }

    onStartTest(vacante, {
      nombre_archivo: archivo ? archivo.name : 'HV_Candidato_SENA.pdf',
      puntaje_match_cv: matchScore || 85,
      habilidades: skillsDetectadas.length ? skillsDetectadas : ['React', 'Python', 'FastAPI', 'SQL']
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Postulación a Vacante</span>
            <h2 className="text-lg font-bold text-white leading-tight">{vacante.titulo}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Upload CV */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              1. Carga tu Hoja de Vida (PDF o Word)
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Nuestro motor de IA extraerá automáticamente tus habilidades técnicas para calcular la afinidad con el perfil del cargo.
            </p>

            {!archivo ? (
              <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40">
                <UploadCloud className="w-10 h-10 text-blue-400 mb-2" />
                <span className="text-sm font-medium text-slate-200">Selecciona o arrastra tu archivo PDF</span>
                <span className="text-xs text-slate-500 mt-1">Máx 10MB • Formatos soportados: PDF, DOCX</span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleSimularCarga}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-blue-400" />
                    <div>
                      <p className="text-sm font-semibold text-white truncate max-w-[260px]">{archivo.name}</p>
                      <p className="text-xs text-slate-400">{(archivo.size / 1024).toFixed(1)} KB • Procesado</p>
                    </div>
                  </div>
                  {analizando ? (
                    <div className="flex items-center space-x-2 text-xs text-blue-400 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analizando IA...</span>
                    </div>
                  ) : (
                    <span className="flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>CV Analizado</span>
                    </span>
                  )}
                </div>

                {analisisListo && (
                  <div className="border-t border-slate-800/80 pt-3 mt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-300 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Afinidad CV estimada por IA:</span>
                      </span>
                      <span className="text-cyan-300 font-bold font-mono text-sm">{matchScore} / 100</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {skillsDetectadas.map((s, idx) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 bg-blue-950/60 text-blue-300 border border-blue-800/50 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Privacy Consent (RF26) */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 flex items-start space-x-3">
            <input
              type="checkbox"
              id="consent"
              checked={consentimiento}
              onChange={(e) => setConsentimiento(e.target.checked)}
              className="mt-1 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="consent" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
              <span className="font-semibold text-white flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 inline" />
                <span>Consentimiento de Privacidad (Ley 1581 / Habeas Data)</span>
              </span>
              Autorizo a <strong className="text-slate-200">{vacante.empresa_nombre}</strong> a revisar mis datos y resultados exclusivamente para este proceso de selección.
            </label>
          </div>

          {/* Notice about the technical test */}
          <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-4 text-xs text-blue-200 space-y-1">
            <p className="font-semibold text-blue-300">Siguiente fase: Prueba técnica por cargo ({vacante.tiempo_limite_minutos} minutos)</p>
            <p className="text-slate-300">
              Al hacer clic en continuar, iniciarás el entorno interactivo de evaluación. Responderás preguntas teóricas y un reto práctico de código.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleContinuarPrueba}
            disabled={!archivo || analizando}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Iniciar Prueba Técnica</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
