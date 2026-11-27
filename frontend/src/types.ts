export type RolUsuario = 'candidato' | 'reclutador' | 'admin';

export type EstadoVacante = 'borrador' | 'abierta' | 'cerrada';

export type EstadoPostulacion = 'recibida' | 'en_evaluacion' | 'evaluada' | 'aprobado' | 'rechazado' | 'en_revision';

export interface PerfilProfesional {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface Empresa {
  id: number;
  nombre: string;
  nit: string;
  sector: string;
  sitio_web?: string;
  activa: boolean;
}

export interface Vacante {
  id: number;
  empresa_id: number;
  empresa_nombre: string;
  perfil_id: number;
  perfil_nombre: string;
  titulo: string;
  descripcion: string;
  requisitos?: string;
  ubicacion: string;
  modalidad: 'remoto' | 'hibrido' | 'presencial';
  salario_rango?: string;
  tiempo_limite_minutos: number;
  puntaje_minimo: number;
  peso_cv: number; // e.g. 40
  peso_prueba: number; // e.g. 60
  estado: EstadoVacante;
  total_postulaciones: number;
  created_at: string;
}

export interface CandidatoCV {
  nombre_archivo: string;
  resumen_perfil?: string;
  habilidades_detectadas: string[];
  anios_experiencia?: number;
  puntaje_match_cv: number; // 0 - 100
}

export interface PreguntaPrueba {
  id: number;
  tipo: 'codigo' | 'opcion_multiple' | 'abierta';
  enunciado: string;
  lenguaje?: string;
  codigo_inicial?: string;
  opciones?: { id: string; texto: string }[];
  puntos: number;
}

export interface Postulacion {
  id: number;
  vacante_id: number;
  vacante_titulo: string;
  candidato_id: number;
  candidato_nombre: string;
  candidato_email: string;
  hoja_de_vida?: CandidatoCV;
  puntaje_cv: number;
  puntaje_prueba: number;
  puntaje_final: number;
  estado: EstadoPostulacion;
  sugerencia_ia?: 'apto' | 'revisar' | 'no_cumple';
  retroalimentacion_ia?: string;
  decision_reclutador?: {
    estado: 'aprobado' | 'rechazado' | 'en_revision';
    reclutador_nombre: string;
    notas: string;
    fecha: string;
  };
  created_at: string;
}

export interface EjercicioPractica {
  id: number;
  titulo: string;
  dificultad: 'Básico' | 'Intermedio' | 'Avanzado';
  lenguaje: string;
  categoria: string;
  descripcion: string;
  plantilla_codigo: string;
}
