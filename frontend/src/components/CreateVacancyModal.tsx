import React, { useState } from 'react';
import { X, PlusCircle, Building2, Sliders, Check } from 'lucide-react';
import { Vacante, PerfilProfesional } from '../types';

interface CreateVacancyModalProps {
  perfiles: PerfilProfesional[];
  onClose: () => void;
  onCreate: (v: Omit<Vacante, 'id' | 'created_at' | 'total_postulaciones' | 'estado'>) => void;
}

export const CreateVacancyModal: React.FC<CreateVacancyModalProps> = ({
  perfiles,
  onClose,
  onCreate
}) => {
  const [titulo, setTitulo] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('NovaTech Soluciones');
  const [perfilId, setPerfilId] = useState(perfiles[0]?.id || 1);
  const [descripcion, setDescripcion] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [modalidad, setModalidad] = useState<'remoto' | 'hibrido' | 'presencial'>('remoto');
  const [ubicacion, setUbicacion] = useState('Barranquilla / Remoto');
  const [tiempoMinutos, setTiempoMinutos] = useState(45);
  const [puntajeMinimo, setPuntajeMinimo] = useState(70);
  const [pesoCV, setPesoCV] = useState(40);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !descripcion) {
      alert('Por favor completa el título y la descripción de la vacante.');
      return;
    }

    const perfil = perfiles.find(p => p.id === perfilId);

    onCreate({
      empresa_id: 101,
      empresa_nombre: empresaNombre,
      perfil_id: perfilId,
      perfil_nombre: perfil ? perfil.nombre : 'Desarrollo de Software',
      titulo,
      descripcion,
      requisitos,
      ubicacion,
      modalidad,
      salario_rango: '$2.800.000 - $3.800.000 COP',
      tiempo_limite_minutos: tiempoMinutos,
      puntaje_minimo: puntajeMinimo,
      peso_cv: pesoCV,
      peso_prueba: 100 - pesoCV
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Reclutamiento v4</span>
            <h2 className="text-xl font-bold text-white">Publicar Nueva Vacante y Configurar Prueba (RF18/RF19)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Título del Cargo / Vacante *</label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Desarrollador Backend Python FastAPI Junior"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Empresa</label>
              <input
                type="text"
                value={empresaNombre}
                onChange={(e) => setEmpresaNombre(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Perfil Profesional</label>
              <select
                value={perfilId}
                onChange={(e) => setPerfilId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              >
                {perfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción y Funciones *</label>
            <textarea
              required
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalla las responsabilidades del rol y proyectos en los que participará..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Test Configuration (RF19) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Configuración de la Prueba Técnica</span>
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tiempo Límite (minutos)</label>
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={tiempoMinutos}
                  onChange={(e) => setTiempoMinutos(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Puntaje Mínimo para Aprobar</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={puntajeMinimo}
                  onChange={(e) => setPuntajeMinimo(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Ponderación: Peso Hoja de Vida vs. Prueba</span>
                <span className="font-mono text-purple-300 font-bold">CV: {pesoCV}% | Prueba: {100 - pesoCV}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={80}
                step={5}
                value={pesoCV}
                onChange={(e) => setPesoCV(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publicar Vacante</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
