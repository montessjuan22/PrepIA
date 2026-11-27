import React, { useState } from 'react';
import { Building2, Users, ShieldAlert, BookOpen, Plus, CheckCircle, XCircle, Search, Eye, Filter, Trash2, Key } from 'lucide-react';
import { Empresa, PerfilProfesional } from '../types';

interface AdminDashboardProps {
  empresas: Empresa[];
  perfiles: PerfilProfesional[];
  onAddEmpresa: (empresa: Omit<Empresa, 'id' | 'activa'>) => void;
}

interface UsuarioAdmin {
  id: number;
  nombre: string;
  email: string;
  rol: 'candidato' | 'reclutador' | 'admin';
  empresa?: string;
  fecha_registro: string;
}

interface LogAuditoria {
  id: number;
  fecha: string;
  usuario: string;
  accion: string;
  recurso: string;
  ip: string;
}

const USUARIOS_INICIALES: UsuarioAdmin[] = [
  { id: 1, nombre: 'Juan Sebastian Montes Osorio', email: 'juanse.montes@prepia.com', rol: 'candidato', fecha_registro: '2026-11-10' },
  { id: 2, nombre: 'Thomas Cortez', email: 'thomas.cortez@prepia.com', rol: 'candidato', fecha_registro: '2026-11-11' },
  { id: 3, nombre: 'Luis Ibarra', email: 'luis.ibarra@prepia.com', rol: 'candidato', fecha_registro: '2026-11-12' },
  { id: 4, nombre: 'Laura Mendoza', email: 'laura.mendoza@novatech.com', rol: 'reclutador', empresa: 'NovaTech Soluciones', fecha_registro: '2026-11-05' },
  { id: 5, nombre: 'Carlos Mario Pardo', email: 'cpardo@datacorp.co', rol: 'reclutador', empresa: 'DataCorp Analytics', fecha_registro: '2026-11-08' },
  { id: 6, nombre: 'Administrador Maestro', email: 'admin@prepia.com', rol: 'admin', fecha_registro: '2026-11-01' }
];

const LOGS_AUDITORIA_INICIALES: LogAuditoria[] = [
  { id: 101, fecha: '2026-11-19 15:42:10', usuario: 'laura.mendoza@novatech.com', accion: 'CONSULTA_CV_CANDIDATO', recurso: 'postulacion #1001 (Juan Montes)', ip: '190.131.24.12' },
  { id: 102, fecha: '2026-11-19 15:30:05', usuario: 'laura.mendoza@novatech.com', accion: 'DECISION_HUMANA_REGISTRADA', recurso: 'postulacion #1002 -> APROBADO', ip: '190.131.24.12' },
  { id: 103, fecha: '2026-11-19 14:15:22', usuario: 'juanse.montes@prepia.com', accion: 'ENVIO_PRUEBA_TECNICA', recurso: 'sesion_prueba #402 (puntaje: 88.0)', ip: '181.129.80.5' },
  { id: 104, fecha: '2026-11-19 14:02:11', usuario: 'juanse.montes@prepia.com', accion: 'ACEPTACION_CONSENTIMIENTO', recurso: 'consentimiento #grabacion_y_datos', ip: '181.129.80.5' },
  { id: 105, fecha: '2026-11-19 11:20:44', usuario: 'admin@prepia.com', accion: 'CREACION_EMPRESA', recurso: 'empresa: DataCorp Analytics (NIT: 901.884.221-1)', ip: '10.0.0.1' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  empresas,
  perfiles,
  onAddEmpresa
}) => {
  const [seccion, setSeccion] = useState<'empresas' | 'usuarios' | 'preguntas' | 'auditoria'>('empresas');
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>(USUARIOS_INICIALES);
  const [modalNuevaEmpresa, setModalNuevaEmpresa] = useState(false);

  // Form for new company
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [nitEmpresa, setNitEmpresa] = useState('');
  const [sectorEmpresa, setSectorEmpresa] = useState('Tecnología y Software');
  const [webEmpresa, setWebEmpresa] = useState('');

  const handleCrearEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEmpresa || !nitEmpresa) {
      alert('Ingresa el nombre y el NIT de la empresa.');
      return;
    }
    onAddEmpresa({
      nombre: nombreEmpresa,
      nit: nitEmpresa,
      sector: sectorEmpresa,
      sitio_web: webEmpresa
    });
    setNombreEmpresa('');
    setNitEmpresa('');
    setWebEmpresa('');
    setModalNuevaEmpresa(false);
  };

  const handleCambiarRol = (id: number, nuevoRol: 'candidato' | 'reclutador' | 'admin') => {
    setUsuarios(usuarios.map(u => u.id === id ? { ...u, rol: nuevoRol } : u));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Administración del Sistema</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-rose-300 font-bold">
              SUPERADMIN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Panel Central de Control — PrepIA</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestión de empresas contratantes, asignación de roles, banco maestro de pruebas y auditoría de privacidad.
          </p>
        </div>

        {seccion === 'empresas' && (
          <button
            onClick={() => setModalNuevaEmpresa(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Empresa</span>
          </button>
        )}
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setSeccion('empresas')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            seccion === 'empresas'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Empresas Registradas ({empresas.length})</span>
        </button>

        <button
          onClick={() => setSeccion('usuarios')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            seccion === 'usuarios'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuarios y Roles ({usuarios.length})</span>
        </button>

        <button
          onClick={() => setSeccion('preguntas')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            seccion === 'preguntas'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Banco de Pruebas & Perfiles ({perfiles.length})</span>
        </button>

        <button
          onClick={() => setSeccion('auditoria')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            seccion === 'auditoria'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Logs de Auditoría (Habeas Data)</span>
        </button>
      </div>

      {/* Tab 1: Empresas */}
      {seccion === 'empresas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-300">Empresas Habilitadas para Publicar Vacantes</span>
            <span className="text-xs text-slate-500">Tabla: `empresas` (PostgreSQL)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Razón Social</th>
                  <th className="py-3 px-4">NIT</th>
                  <th className="py-3 px-4">Sector Industrial</th>
                  <th className="py-3 px-4">Sitio Web</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {empresas.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-500">#{emp.id}</td>
                    <td className="py-3 px-4 font-bold text-white text-sm">{emp.nombre}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{emp.nit}</td>
                    <td className="py-3 px-4 text-slate-300">{emp.sector}</td>
                    <td className="py-3 px-4 font-mono text-blue-400">{emp.sitio_web || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 text-[11px] font-semibold">
                        <CheckCircle className="w-3 h-3" />
                        <span>Activa</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Usuarios y Roles */}
      {seccion === 'usuarios' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-300">Cuentas Registradas y Control de Roles</span>
            <span className="text-xs text-slate-500">Tabla: `usuarios` con ENUM ('candidato', 'reclutador', 'admin')</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4">Correo Electrónico</th>
                  <th className="py-3 px-4">Organización Asignada</th>
                  <th className="py-3 px-4 text-center">Rol en PrepIA</th>
                  <th className="py-3 px-4 text-right">Asignar Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white">{u.nombre}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{u.email}</td>
                    <td className="py-3 px-4 text-slate-300">{u.empresa || 'Candidato Independiente'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        u.rol === 'admin'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                          : u.rol === 'reclutador'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                          : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={u.rol}
                        onChange={(e) => handleCambiarRol(u.id, e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                      >
                        <option value="candidato">Candidato</option>
                        <option value="reclutador">Reclutador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Perfiles y Banco de Preguntas */}
      {seccion === 'preguntas' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-2">Perfiles Profesionales Soportados (RF25)</h3>
            <p className="text-xs text-slate-400 mb-4">
              PrepIA v4 amplía el alcance de selección a cualquier disciplina técnica o profesional:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {perfiles.map(p => (
                <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">{p.nombre}</span>
                    <span className="text-[11px] font-mono text-slate-500">Perfil ID #{p.id}</span>
                  </div>
                  <p className="text-xs text-slate-400">{p.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Logs de Auditoría (Habeas Data / SIC) */}
      {seccion === 'auditoria' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-slate-300">Registro de Transacciones y Acceso a Datos (RNF10 / RF26)</span>
              <p className="text-[11px] text-slate-400">Auditoría estricta para garantizar que los reclutadores solo accedan a candidatos que autorizaron su tratamiento.</p>
            </div>
            <span className="text-xs font-mono text-emerald-400">Logs Activos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Usuario Responsable</th>
                  <th className="py-3 px-4">Acción Auditada</th>
                  <th className="py-3 px-4">Recurso Afectado</th>
                  <th className="py-3 px-4">Dirección IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {LOGS_AUDITORIA_INICIALES.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-400">{l.fecha}</td>
                    <td className="py-3 px-4 font-bold text-white">{l.usuario}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 text-[11px]">
                        {l.accion}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{l.recurso}</td>
                    <td className="py-3 px-4 text-slate-500">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Registrar Empresa */}
      {modalNuevaEmpresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Registrar Nueva Empresa Contratante (RF17)</h2>
              <button onClick={() => setModalNuevaEmpresa(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCrearEmpresa} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Razón Social *</label>
                <input
                  type="text"
                  required
                  value={nombreEmpresa}
                  onChange={(e) => setNombreEmpresa(e.target.value)}
                  placeholder="Ej. Sofka Technologies, Mercado Libre..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">NIT *</label>
                  <input
                    type="text"
                    required
                    value={nitEmpresa}
                    onChange={(e) => setNitEmpresa(e.target.value)}
                    placeholder="900.123.456-7"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sector</label>
                  <input
                    type="text"
                    value={sectorEmpresa}
                    onChange={(e) => setSectorEmpresa(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sitio Web Oficial</label>
                <input
                  type="text"
                  value={webEmpresa}
                  onChange={(e) => setWebEmpresa(e.target.value)}
                  placeholder="https://empresa.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaEmpresa(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20"
                >
                  Guardar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
