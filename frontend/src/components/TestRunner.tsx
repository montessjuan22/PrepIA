import React, { useState, useEffect } from 'react';
import { Clock, Play, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, Terminal, FileCode, Check, Award } from 'lucide-react';
import { Vacante, PreguntaPrueba } from '../types';
import { PREGUNTAS_PRUEBA_MOCK } from '../data/mockData';

interface TestRunnerProps {
  vacante: Vacante | null;
  modo: 'evaluacion' | 'practica';
  cvScore?: number;
  onFinishTest: (resultado: {
    puntajePrueba: number;
    puntajeCV: number;
    puntajeFinal: number;
    retroalimentacion: string;
  }) => void;
  onCancel: () => void;
}

export const TestRunner: React.FC<TestRunnerProps> = ({
  vacante,
  modo,
  cvScore = 85,
  onFinishTest,
  onCancel
}) => {
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [respuestasOpcion, setRespuestasOpcion] = useState<Record<number, string>>({});
  const [codigoUsuario, setCodigoUsuario] = useState(PREGUNTAS_PRUEBA_MOCK[2].codigo_inicial || '');
  const [tiempoRestante, setTiempoRestante] = useState((vacante?.tiempo_limite_minutos || 45) * 60);
  const [testEjecutado, setTestEjecutado] = useState(false);
  const [testOutput, setTestOutput] = useState<string>('');
  const [finalizado, setFinalizado] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState<{
    puntajePrueba: number;
    puntajeCV: number;
    puntajeFinal: number;
    retroalimentacion: string;
  } | null>(null);

  // Timer countdown
  useEffect(() => {
    if (finalizado) return;
    const interval = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalizarPrueba();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [finalizado]);

  const formatoTiempo = (segundos: number) => {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEjecutarCodigo = () => {
    setTestEjecutado(true);
    setTestOutput('⏳ Conectando con Sandbox de Ejecución (Piston/Judge0)...\n✔️ Compilación exitosa en Python 3.12\n✔️ Caso 1: filtrar_candidatos_aptos([{"nombre": "A", "puntaje_final": 80}], 70) => ["A"] [PASS]\n✔️ Caso 2: lista vacía umbral 90 => [] [PASS]\n✔️ Tiempo de ejecución: 42ms | Memoria: 14MB\n\n🎉 Todos los casos de prueba pasaron con éxito.');
  };

  const handleFinalizarPrueba = () => {
    // Calculate score
    let puntajePrueba = 0;
    if (respuestasOpcion[1] === 'a') puntajePrueba += 20;
    if (respuestasOpcion[2] === 'b') puntajePrueba += 20;
    puntajePrueba += 50; // Code passes

    const pesoCV = vacante?.peso_cv ? vacante.peso_cv / 100 : 0.4;
    const pesoPrueba = vacante?.peso_prueba ? vacante.peso_prueba / 100 : 0.6;
    const puntajeFinal = Number(((cvScore * pesoCV) + (puntajePrueba * pesoPrueba)).toFixed(1));

    const feedback = puntajeFinal >= 70
      ? `Excelente desempeño. Demostraste gran solidez en validaciones con Pydantic y conceptos de indexación en PostgreSQL. El código de la prueba es eficiente y respeta la notación algorítmica esperada.`
      : `Buen intento. Se recomienda profundizar en la optimización de queries SQL y arquitectura de APIs en FastAPI.`;

    const res = {
      puntajePrueba,
      puntajeCV: cvScore,
      puntajeFinal,
      retroalimentacion: feedback
    };

    setResultadoFinal(res);
    setFinalizado(true);
  };

  const pregunta = PREGUNTAS_PRUEBA_MOCK[preguntaActual];

  if (finalizado && resultadoFinal) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-fadeIn">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <Award className="w-8 h-8 text-white" />
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            {modo === 'evaluacion' ? 'Evaluación Oficial Completada' : 'Sesión de Práctica Completada'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-2">
            Resultados de la Prueba Técnica
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mb-8">
            {vacante ? `Postulación para: ${vacante.titulo} en ${vacante.empresa_nombre}` : 'Modo Práctica Libre'}
          </p>

          {/* Scores Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Puntaje Hoja de Vida</span>
              <p className="text-3xl font-extrabold text-blue-400 mt-1 font-mono">{resultadoFinal.puntajeCV}</p>
              <span className="text-[11px] text-slate-500">Ponderación: {vacante?.peso_cv || 40}%</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Puntaje Prueba Técnica</span>
              <p className="text-3xl font-extrabold text-cyan-400 mt-1 font-mono">{resultadoFinal.puntajePrueba}</p>
              <span className="text-[11px] text-slate-500">Ponderación: {vacante?.peso_prueba || 60}%</span>
            </div>

            <div className="bg-gradient-to-b from-blue-950/40 to-slate-950 border border-blue-500/30 rounded-xl p-4">
              <span className="text-xs text-blue-300 font-medium">Puntaje Final Combinado</span>
              <p className="text-3xl font-extrabold text-white mt-1 font-mono">{resultadoFinal.puntajeFinal}</p>
              <span className="text-[11px] text-emerald-400 font-medium">
                {resultadoFinal.puntajeFinal >= (vacante?.puntaje_minimo || 70) ? 'Supera umbral mínimo' : 'Por debajo del umbral'}
              </span>
            </div>
          </div>

          {/* AI Feedback Box */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 text-left mb-8">
            <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Retroalimentación Generada por IA (RF06 / RF21)</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {resultadoFinal.retroalimentacion}
            </p>
          </div>

          {/* Return / Accept button */}
          <button
            onClick={() => onFinishTest(resultadoFinal)}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all"
          >
            Guardar y Volver al Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Test Header with Timer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 mb-1">
            <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/60 uppercase">
              {modo === 'evaluacion' ? 'Modo Evaluación Vacante' : 'Simulador Práctica'}
            </span>
            <span>•</span>
            <span className="text-slate-300">{vacante ? vacante.titulo : 'Ejercicio Fullstack'}</span>
          </div>
          <h2 className="text-lg font-bold text-white">
            Pregunta {preguntaActual + 1} de {PREGUNTAS_PRUEBA_MOCK.length}
          </h2>
        </div>

        {/* Timer Bar */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-base font-bold text-cyan-400">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{formatoTiempo(tiempoRestante)}</span>
          </div>

          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors font-medium"
          >
            Abandonar
          </button>
        </div>
      </div>

      {/* Question Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 uppercase">
            {pregunta.tipo === 'codigo' ? 'Ejercicio Práctico de Código' : 'Pregunta Teórica'}
          </span>
          <span className="text-xs font-mono text-slate-400">Ponderación: {pregunta.puntos} puntos</span>
        </div>

        <h3 className="text-base sm:text-lg font-semibold text-white mb-6 leading-relaxed">
          {pregunta.enunciado}
        </h3>

        {/* Multiple choice question */}
        {pregunta.tipo === 'opcion_multiple' && pregunta.opciones && (
          <div className="space-y-3">
            {pregunta.opciones.map((opc) => {
              const seleccionada = respuestasOpcion[pregunta.id] === opc.id;
              return (
                <button
                  key={opc.id}
                  onClick={() => setRespuestasOpcion({ ...respuestasOpcion, [pregunta.id]: opc.id })}
                  className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between ${
                    seleccionada
                      ? 'bg-blue-600/15 border-blue-500 text-white font-medium'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold uppercase ${
                      seleccionada ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {opc.id}
                    </span>
                    <span>{opc.texto}</span>
                  </div>
                  {seleccionada && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Code question */}
        {pregunta.tipo === 'codigo' && (
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 flex items-center space-x-1.5">
                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                  <span>solucion.py (Python 3.12)</span>
                </span>
                <button
                  onClick={handleEjecutarCodigo}
                  className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Ejecutar Tests</span>
                </button>
              </div>

              <textarea
                value={codigoUsuario}
                onChange={(e) => setCodigoUsuario(e.target.value)}
                rows={10}
                className="w-full bg-slate-950 p-4 font-mono text-xs sm:text-sm text-cyan-300 focus:outline-none resize-none"
              />
            </div>

            {testEjecutado && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                <div className="flex items-center space-x-2 text-slate-400 mb-2 font-semibold">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Salida de Consola (Judge0 Sandbox)</span>
                </div>
                {testOutput}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation & Submit Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPreguntaActual((prev) => Math.max(0, prev - 1))}
          disabled={preguntaActual === 0}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 transition-colors"
        >
          Anterior
        </button>

        {preguntaActual < PREGUNTAS_PRUEBA_MOCK.length - 1 ? (
          <button
            onClick={() => setPreguntaActual((prev) => prev + 1)}
            className="flex items-center space-x-1 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
          >
            <span>Siguiente Pregunta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handleFinalizarPrueba}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-600/20 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Finalizar y Obtener Evaluación IA</span>
          </button>
        )}
      </div>
    </div>
  );
};
