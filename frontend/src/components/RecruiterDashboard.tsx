import React, { useState } from 'react';
import { Users, Briefcase, Plus, Filter, Sparkles, CheckCircle, XCircle, Clock, Eye, Download, Search } from 'lucide-react';
import { Vacante, Postulacion } from '../types';

interface RecruiterDashboardProps {
  vacantes: Vacante[];
  postulaciones: Postulacion[];
  onOpenCreateVacancy: () => void;
  onSelectPostulacion: (p: Postulacion) => void;
}

export const RecruiterDashboard: React.FC<RecruiterDashboardProps> = ({
  vacantes,
  postulaciones,
  onOpenCreateVacancy,
  onSelectPostulacion
}) => {
  const [vacanteSeleccionada, setVacanteSeleccionada] = useState<number | 'todas'>('todas');
  const [busqueda, setBusqueda] = useState('');

  // Filter applications
  const filtradas = postulaciones.filter((p) => {
    const matchVacante = vacanteSeleccionada === 'todas' || p.vacante_id === vacanteSeleccionada;
    const matchBusqueda = p.candidato_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          p.vacante_titulo.toLowerCase().includes(busqueda.toLowerCase());
    return matchVacante && matchBusqueda;
  });

  // Sort by final score descending (Ranking)
  const ranking = [...filtradas].sort((a, b) => b.puntaje_final - a.puntaje_final);

  // Metrics
  const totalCandidatos = postulaciones.length;
  const aprobados = postulaciones.filter(p => p.estado === 'aprobado').length;
  const enRevision = postulaciones.filter(p => p.estado === 'en_revision' || p.estado === 'recibida').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Panel de Talento Humano</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Ranking de Candidatos y Decisión</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Revisión objetiva con métricas calculadas por IA. La aprobación o rechazo final es potestad exclusiva del reclutador.
          </p>
        </div>

        <button
          onClick={onOpenCreateVacancy}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Publicar Nueva Vacante</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Vacantes Publicadas</span>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{vacantes.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Postulaciones</span>
          <p className="text-2xl font-bold text-blue-400 mt-1 font-mono">{totalCandidatos}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">En Revisión / Pendientes</span>
          <p className="text-2xl font-bold text-amber-400 mt-1 font-mono">{enRevision}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Candidatos Aprobados</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{aprobados}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-300 font-semibold">Vacante:</span>
          <select
            value={vacanteSeleccionada}
            onChange={(e) => setVacanteSeleccionada(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="todas">Todas las vacantes ({postulaciones.length})</option>
            {vacantes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.titulo} ({v.empresa_nombre})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar candidato..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Ranking Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Rank</th>
                <th className="py-3.5 px-4">Candidato</th>
                <th className="py-3.5 px-4">Vacante</th>
                <th className="py-3.5 px-4 text-center">Puntaje CV</th>
                <th className="py-3.5 px-4 text-center">Prueba Técnica</th>
                <th className="py-3.5 px-4 text-center">Puntaje Final</th>
                <th className="py-3.5 px-4 text-center">Sugerencia IA</th>
                <th className="py-3.5 px-4 text-center">Decisión Reclutador</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ranking.map((post, idx) => (
                <tr key={post.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Position */}
                  <td className="py-4 px-4 text-center font-mono font-bold text-slate-300">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                      idx === 0
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : idx === 1
                        ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                        : idx === 2
                        ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40'
                        : 'text-slate-500'
                    }`}>
                      #{idx + 1}
                    </span>
                  </td>

                  {/* Candidate */}
                  <td className="py-4 px-4">
                    <p className="font-bold text-white text-sm">{post.candidato_nombre}</p>
                    <p className="text-slate-400 font-mono text-[11px]">{post.candidato_email}</p>
                  </td>

                  {/* Vacancy */}
                  <td className="py-4 px-4">
                    <span className="text-slate-200 font-medium truncate block max-w-[200px]">
                      {post.vacante_titulo}
                    </span>
                  </td>

                  {/* CV score */}
                  <td className="py-4 px-4 text-center font-mono font-semibold text-blue-400">
                    {post.puntaje_cv} pts
                  </td>

                  {/* Test score */}
                  <td className="py-4 px-4 text-center font-mono font-semibold text-cyan-400">
                    {post.puntaje_prueba} pts
                  </td>

                  {/* Final combined score */}
                  <td className="py-4 px-4 text-center font-mono font-extrabold text-white text-sm">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
                      {post.puntaje_final}
                    </span>
                  </td>

                  {/* AI Suggestion */}
                  <td className="py-4 px-4 text-center">
                    {post.sugerencia_ia === 'apto' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 text-[11px] font-semibold">
                        <Sparkles className="w-3 h-3" />
                        <span>Apto</span>
                      </span>
                    ) : post.sugerencia_ia === 'no_cumple' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-700/60 text-rose-400 text-[11px] font-semibold">
                        <span>No Cumple</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-700/60 text-amber-400 text-[11px] font-semibold">
                        <span>Revisar</span>
                      </span>
                    )}
                  </td>

                  {/* Human Recruiter Decision */}
                  <td className="py-4 px-4 text-center">
                    {post.estado === 'aprobado' ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Aprobado</span>
                      </span>
                    ) : post.estado === 'rechazado' ? (
                      <span className="inline-flex items-center space-x-1 text-rose-400 font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rechazado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-amber-400 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>En Revisión</span>
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => onSelectPostulacion(post)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Revisar</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
