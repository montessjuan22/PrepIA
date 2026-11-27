// Servicio integral de autenticación y conexión con el backend FastAPI PrepIA
// Soporta tanto conexión directa a localhost:8000 como modo autónomo/demo para pruebas SENA.

const API_BASE = '/api/v1';

export interface UserSession {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  rol: 'usuario' | 'reclutador' | 'admin' | 'agente_soporte';
  es_admin_principal?: boolean;
  especialidad?: string;
  ciudad?: string;
  linkedin_url?: string;
  github_url?: string;
  nivel_experiencia?: string;
  biografia?: string;
  email_verificado?: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  rol?: string;
}

const STORAGE_KEY_USER = 'prepia_current_user';
const STORAGE_KEY_TOKEN = 'prepia_access_token';
const STORAGE_KEY_REFRESH = 'prepia_refresh_token';

// Obtener usuario actual en sesión
export function getCurrentUser(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Guardar usuario en sesión
export function setCurrentUser(user: UserSession, token?: string, refresh?: string) {
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  if (token) localStorage.setItem(STORAGE_KEY_TOKEN, token);
  if (refresh) localStorage.setItem(STORAGE_KEY_REFRESH, refresh);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user-session-update', { detail: user }));
    window.dispatchEvent(new Event('storage'));
  }
}

// Cerrar sesión
export function logoutUser() {
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_REFRESH);
}

// Mapear rol a ruta de dashboard
export function getDashboardRouteForRole(rol: string): string {
  if (rol === 'reclutador' || rol === 'company' || rol === 'empresa') {
    return '/dashboard/company';
  }
  if (rol === 'admin' || rol === 'administrador') {
    return '/dashboard/admin';
  }
  if (rol === 'agente_soporte' || rol === 'soporte') {
    return '/dashboard/support';
  }
  return '/dashboard/candidate';
}

// Validar fortaleza de contraseña (RF02)
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe incluir al menos una letra.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe incluir al menos un número.' };
  }
  return { valid: true };
}

// Iniciar sesión (POST /api/v1/auth/login)
export async function apiLogin(email: string, password: string): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Credenciales inválidas' }));
      return { success: false, error: err.detail || 'Email o contraseña incorrectos' };
    }

    const data: AuthTokens = await res.json();
    localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
    localStorage.setItem(STORAGE_KEY_REFRESH, data.refresh_token);

    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (!meRes.ok) {
      logoutUser();
      return { success: false, error: 'No se pudo obtener el perfil autenticado del servidor.' };
    }

    const meData = await meRes.json();
    const user: UserSession = {
      id: meData.id,
      nombre: meData.nombre || meData.email.split('@')[0],
      email: meData.email,
      telefono: meData.telefono,
      rol: meData.rol,
      es_admin_principal: Boolean(meData.es_admin_principal),
      email_verificado: meData.email_verificado,
    };
    setCurrentUser(user, data.access_token, data.refresh_token);
    return { success: true, user };
  } catch (netErr) {
    console.warn('Error de conexión al iniciar sesión:', netErr);
    return { success: false, error: 'No se pudo conectar con el servidor de autenticación.' };
  }
}

// Registrar usuario (POST /api/v1/auth/register)
export async function apiRegister(payload: {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
  rol?: string;
}): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: payload.nombre.trim(),
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        telefono: payload.telefono || null,
        rol: payload.rol || 'usuario',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error en el registro' }));
      const detail = Array.isArray(err.detail) ? err.detail[0]?.msg : err.detail;
      return { success: false, error: detail || 'No se pudo completar el registro' };
    }

    const data = await res.json();
    const loginRes = await apiLogin(payload.email, payload.password);
    if (loginRes.success && loginRes.user) {
      return { success: true, user: loginRes.user };
    }
    const user: UserSession = {
      id: data.id,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      rol: data.rol,
      email_verificado: data.email_verificado,
    };
    setCurrentUser(user);
    return { success: true, user };
  } catch (netErr) {
    console.warn('Error de conexión en registro:', netErr);
    return { success: false, error: 'No se pudo conectar con el servidor para registrar la cuenta.' };
  }
}

// Solicitar código de recuperación de contraseña (RF02)
export async function apiForgotPassword(email: string): Promise<{ success: boolean; message: string; codigoDev?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: data.message || 'Código de recuperación enviado.',
        codigoDev: data.codigo_dev,
      };
    }

    const err = await res.json().catch(() => ({ detail: 'No se pudo enviar el código de recuperación.' }));
    return { success: false, message: '', error: err.detail || 'No se pudo enviar el código de recuperación.' };
  } catch (netErr) {
    console.warn('Error de conexión en forgot-password:', netErr);
    return { success: false, message: '', error: 'No se pudo conectar con el servidor de autenticación.' };
  }
}

// Restablecer contraseña con código (RF02)
export async function apiResetPassword(email: string, codigo: string, newPassword: string): Promise<{ success: boolean; message: string; error?: string }> {
  const validation = validatePasswordStrength(newPassword);
  if (!validation.valid) {
    return { success: false, message: '', error: validation.message };
  }

  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        codigo: codigo.trim(),
        new_password: newPassword,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || 'Contraseña actualizada con éxito.' };
    }

    const err = await res.json().catch(() => ({ detail: 'Código inválido o expirado' }));
    return { success: false, message: '', error: err.detail || 'Código inválido o expirado.' };
  } catch (netErr) {
    console.warn('Error de conexión en reset-password:', netErr);
    return { success: false, message: '', error: 'No se pudo conectar con el servidor para restablecer la contraseña.' };
  }
}

// Obtener configuración de Google OAuth desde el backend
export async function apiGetGoogleConfig(): Promise<{ configured: boolean; client_id: string | null }> {
  const res = await fetch(`${API_BASE}/auth/google/config`);
  if (!res.ok) {
    throw new Error('No se pudo consultar la configuración de Google OAuth.');
  }
  return await res.json();
}

// Autenticación real con Google OAuth (POST /api/v1/auth/google)
export async function apiGoogleLogin(payload: {
  credential?: string;
  access_token?: string;
}): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'No se pudo validar la cuenta con Google.' }));
      return { success: false, error: err.detail || 'No se pudo validar la cuenta con Google.' };
    }

    const data: AuthTokens = await res.json();
    localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
    localStorage.setItem(STORAGE_KEY_REFRESH, data.refresh_token);

    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (!meRes.ok) {
      logoutUser();
      return { success: false, error: 'Google autenticó tu cuenta, pero no se pudo cargar el perfil del servidor.' };
    }

    const meData = await meRes.json();
    const user: UserSession = {
      id: meData.id,
      nombre: meData.nombre || meData.email.split('@')[0],
      email: meData.email,
      telefono: meData.telefono,
      rol: meData.rol,
      es_admin_principal: Boolean(meData.es_admin_principal),
      email_verificado: meData.email_verificado,
    };
    setCurrentUser(user, data.access_token, data.refresh_token);
    return { success: true, user };
  } catch (err) {
    console.warn('Error en autenticación con Google:', err);
    return { success: false, error: 'No se pudo conectar con el servidor para validar la sesión de Google.' };
  }
}

// ==========================================
// SERVICIOS DE CANDIDATO Y ANÁLISIS DE CV CON IA
// ==========================================

export interface StructuredCVProfile {
  experiencias: Array<{ cargo: string; empresa: string; periodo: string; descripcion?: string }>;
  estudios: Array<{ titulo: string; institucion: string; periodo: string }>;
  idiomas: Array<{ idioma: string; nivel: string }>;
  habilidades: string[];
  movilidad: {
    viajar: boolean;
    cambio_residencia: boolean;
    vehiculo_propio: boolean;
  };
}

export interface CandidateMetricsResponse {
  usuario_id: number | null;
  nombre: string;
  email: string;
  telefono?: string;
  rol?: string;
  especialidad?: string;
  ciudad?: string;
  linkedin_url?: string;
  github_url?: string;
  nivel_experiencia?: string;
  biografia?: string;
  cv_score: number | null;
  cv_evaluado: boolean;
  cv_nombre: string | null;
  cv_archivo_url?: string | null;
  cv_portada_url?: string | null;
  cv_preview_text?: string | null;
  foto_perfil_url?: string | null;
  perfil_cv?: StructuredCVProfile;
  perfil_completitud: number;
  total_aplicaciones: number;
  total_entrevistas: number;
  checklist: {
    informacion_basica: boolean;
    telefono_contacto: boolean;
    cv_subido: boolean;
    especialidad_configurada: boolean;
    enlaces_profesionales?: boolean;
  };
  ultimo_analisis: CVAnalysisResult | null;
}

export interface CVAnalysisResult {
  es_apto: boolean;
  score: number;
  nivel_aptitud: string;
  veredicto_color: string;
  nombre_archivo: string;
  total_palabras: number;
  habilidades_detectadas: string[];
  categorias_detectadas?: Record<string, string[]>;
  puntos_fuertes: string[];
  elementos_faltantes: string[];
  consejos_para_postularse: string[];
  vacantes_compatibles: Array<{
    titulo: string;
    empresa: string;
    match: number;
    modalidad: string;
  }>;
}

// Obtener métricas reales de BD
export async function apiGetCandidateMetrics(email?: string): Promise<CandidateMetricsResponse> {
  const sessionUser = getCurrentUser();
  const targetEmail = email ?? sessionUser?.email ?? '';
  try {
    const query = targetEmail ? `?email=${encodeURIComponent(targetEmail)}` : '';
    const res = await fetch(`${API_BASE}/auth/candidato/metricas${query}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend metrics offline:', err);
  }

  return {
    usuario_id: sessionUser?.id ?? null,
    nombre: sessionUser?.nombre || (targetEmail ? targetEmail.split('@')[0] : 'Candidato'),
    email: targetEmail,
    cv_score: null,
    cv_evaluado: false,
    cv_nombre: null,
    perfil_completitud: targetEmail ? 40 : 0,
    total_aplicaciones: 0,
    total_entrevistas: 0,
    checklist: {
      informacion_basica: Boolean(targetEmail),
      telefono_contacto: Boolean(sessionUser?.telefono),
      cv_subido: false,
      especialidad_configurada: true,
    },
    ultimo_analisis: null,
  };
}

// Analizar CV por archivo
export async function apiAnalyzeCVFile(file: File, email?: string): Promise<CVAnalysisResult> {
  const targetEmail = email || getCurrentUser()?.email || 'juanse.montes@gmail.com';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('email_usuario', targetEmail);

  const res = await fetch(`${API_BASE}/auth/cv/analizar-archivo?email_usuario=${encodeURIComponent(targetEmail)}`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'No se pudo guardar la Hoja de Vida en el servidor.' }));
    throw new Error(err.detail || 'No se pudo guardar la Hoja de Vida en el servidor.');
  }
  return await res.json();
}

// Analizar CV por texto
export async function apiAnalyzeCVText(payload: { texto_cv: string; nombre_archivo?: string; email_usuario?: string }): Promise<CVAnalysisResult> {
  const targetEmail = payload.email_usuario || getCurrentUser()?.email || 'juanse.montes@gmail.com';
  const res = await fetch(`${API_BASE}/auth/cv/analizar-texto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texto_cv: payload.texto_cv,
      nombre_archivo: payload.nombre_archivo || 'HojaDeVida.txt',
      email_usuario: targetEmail,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'No se pudo guardar el texto de la Hoja de Vida en el servidor.' }));
    throw new Error(err.detail || 'No se pudo guardar el texto de la Hoja de Vida en el servidor.');
  }
  return await res.json();
}

// Actualizar datos del perfil (nombre, teléfono) directamente en PostgreSQL (PUT /api/v1/auth/perfil)
export async function apiUpdateProfile(payload: {
  usuario_id?: number;
  current_email?: string;
  nombre?: string;
  email: string;
  telefono?: string;
  especialidad?: string;
  ciudad?: string;
  linkedin_url?: string;
  github_url?: string;
  nivel_experiencia?: string;
  biografia?: string;
  rol?: string;
}): Promise<{ success: boolean; usuario?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/perfil`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, usuario: data.usuario };
    } else {
      const err = await res.json().catch(() => ({ detail: 'Error al actualizar perfil' }));
      return { success: false, error: err.detail };
    }
  } catch (err) {
    console.warn('Backend update profile error:', err);
    return { success: false, error: 'No se pudo conectar con el servidor' };
  }
}

export async function apiUpdateStructuredCV(payload: {
  email: string;
  experiencias?: StructuredCVProfile['experiencias'];
  estudios?: StructuredCVProfile['estudios'];
  idiomas?: StructuredCVProfile['idiomas'];
  habilidades?: string[];
  movilidad?: StructuredCVProfile['movilidad'];
}): Promise<{ status: string; perfil_cv: StructuredCVProfile }> {
  const res = await fetch(`${API_BASE}/auth/candidato/hoja-estructurada`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo guardar la información de la Hoja de Vida.'));
  }
  return await res.json();
}

export async function apiUploadProfilePhoto(file: File, email?: string): Promise<string> {
  const targetEmail = email || getCurrentUser()?.email || '';
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/auth/perfil/foto?email_usuario=${encodeURIComponent(targetEmail)}`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo subir la foto de perfil.'));
  }
  const data = await res.json();
  return data.foto_perfil_url;
}

export async function apiDeleteProfilePhoto(email?: string): Promise<void> {
  const targetEmail = email || getCurrentUser()?.email || '';
  const res = await fetch(`${API_BASE}/auth/perfil/foto?email=${encodeURIComponent(targetEmail)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo quitar la foto de perfil.'));
  }
}

export async function apiGetAIConsent(
  email?: string
): Promise<{ aceptado: boolean; puede_enviar_externa: boolean }> {
  const targetEmail = email || getCurrentUser()?.email || '';
  if (!targetEmail) return { aceptado: false, puede_enviar_externa: false };
  try {
    const res = await fetch(
      `${API_BASE}/auth/privacidad/consentimiento-ia?email=${encodeURIComponent(targetEmail)}`
    );
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Error consultando consentimiento IA:', err);
  }
  return { aceptado: false, puede_enviar_externa: false };
}

export async function apiSetAIConsent(
  aceptado: boolean,
  email?: string
): Promise<{ aceptado: boolean; puede_enviar_externa: boolean }> {
  const targetEmail = email || getCurrentUser()?.email || '';
  const res = await fetch(`${API_BASE}/auth/privacidad/consentimiento-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: targetEmail, aceptado }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo guardar el consentimiento de IA.'));
  }
  return await res.json();
}

export interface ChatCVResponse {
  status: string;
  respuesta: string;
  fuente?: string;
  tipo_consulta?: string;
  score?: number;
  es_apto?: boolean;
  habilidades?: string[];
}

// Consultar al Chatbot IA conectado a PostgreSQL (POST /api/v1/auth/cv/chat)
export async function apiChatWithCV(
  mensaje: string,
  email?: string,
  historial?: Array<{ sender: 'user' | 'bot'; text: string }>
): Promise<ChatCVResponse> {
  const targetEmail = email || getCurrentUser()?.email || '';
  const res = await fetch(`${API_BASE}/auth/cv/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mensaje,
      email_usuario: targetEmail || undefined,
      historial: historial?.map(h => ({ sender: h.sender, text: h.text })),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al consultar el Asistente IA.' }));
    throw new Error(err.detail || 'Error al consultar el Asistente IA.');
  }
  return await res.json();
}

export interface VacancyIdioma {
  idioma: string;
  nivel: string;
}

export interface VacancyPreguntaFiltro {
  id: string;
  pregunta: string;
  tipo: 'texto' | 'numero' | 'si_no';
  obligatoria: boolean;
}

export interface VacancyRespuestaFiltro {
  pregunta: string;
  respuesta: string;
}

export type ATSStage =
  | 'postulado'
  | 'preseleccionado'
  | 'en_entrevista'
  | 'prueba_tecnica'
  | 'finalista'
  | 'contratado'
  | 'descartado';

export interface Vacancy {
  id: number;
  titulo: string;
  empresa: string;
  empresa_logo_url?: string | null;
  sector: string;
  categoria_area?: string;
  cantidad_vacantes?: number;
  modalidad: string;
  departamento?: string;
  ciudad?: string;
  esquema_salarial?: string;
  salario?: string;
  salario_min_cop?: number | null;
  salario_max_cop?: number | null;
  salario_visible?: boolean;
  beneficios?: string;
  experiencia?: string;
  nivel_educativo?: string;
  tipo_contrato?: string;
  jornada?: string;
  descripcion: string;
  funciones?: string;
  requisitos: string[];
  requisitos_raw?: string;
  requisitos_indispensables?: string;
  requisitos_deseables?: string;
  habilidades_clave?: string[];
  idiomas?: VacancyIdioma[];
  preguntas_filtro?: VacancyPreguntaFiltro[];
  puntaje_minimo: number;
  peso_cv?: number;
  peso_prueba?: number;
  duracion_prueba_minutos?: number | null;
  perfil_nombre?: string | null;
  total_postulados?: number;
  created_at?: string | null;
  estado: string;
}

export interface VacancySearchFilters {
  q?: string;
  ciudad?: string;
  modalidad?: string;
  experiencia?: string;
  tipo_contrato?: string;
  salario_rango?: string;
  categoria?: string;
  fecha?: string;
  orden?: string;
}

export interface VacancyEvaluationResult {
  tiene_cv: boolean;
  vacante_id: number;
  vacante_titulo: string;
  empresa: string;
  match_score?: number;
  es_apto?: boolean;
  requisitos_cumplidos?: string[];
  requisitos_faltantes?: string[];
  requerimientos_empleador: string[];
  consejos_vacante?: string[];
  cv_nombre?: string;
  mensaje?: string;
}

// Obtener vacantes reales de PostgreSQL (GET /api/v1/auth/vacantes)
export async function apiGetVacancies(filters?: VacancySearchFilters): Promise<Vacancy[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.q) params.set('q', filters.q);
    if (filters?.ciudad) params.set('ciudad', filters.ciudad);
    if (filters?.modalidad) params.set('modalidad', filters.modalidad);
    if (filters?.experiencia) params.set('experiencia', filters.experiencia);
    if (filters?.tipo_contrato) params.set('tipo_contrato', filters.tipo_contrato);
    if (filters?.salario_rango) params.set('salario_rango', filters.salario_rango);
    if (filters?.categoria) params.set('categoria', filters.categoria);
    if (filters?.fecha) params.set('fecha', filters.fecha);
    if (filters?.orden) params.set('orden', filters.orden);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/auth/vacantes${qs}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend get vacancies error:', err);
  }
  return [];
}

// Evaluar CV real frente a los requisitos del empleador (POST /api/v1/auth/vacantes/evaluar)
export async function apiEvaluateVacancy(
  vacanteId: number,
  email?: string,
  textoCv?: string
): Promise<VacancyEvaluationResult> {
  const targetEmail = email || getCurrentUser()?.email || 'juanse.montes@gmail.com';
  try {
    const res = await fetch(`${API_BASE}/auth/vacantes/evaluar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vacante_id: vacanteId,
        email_usuario: targetEmail,
        texto_cv: textoCv,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend evaluate vacancy error:', err);
  }
  return {
    tiene_cv: false,
    vacante_id: vacanteId,
    vacante_titulo: 'Vacante',
    empresa: 'Empresa',
    requerimientos_empleador: [],
    mensaje: 'Sube tu Hoja de Vida para que la IA verifique cuáles requerimientos cumples y cuáles te faltan.',
  };
}

// Registrar postulación real en PostgreSQL (POST /api/v1/auth/vacantes/postular)
export async function apiApplyToVacancy(
  vacanteId: number,
  email?: string,
  respuestasFiltro?: VacancyRespuestaFiltro[]
): Promise<{ status: string; mensaje: string; postulacion_id?: number; match_score?: number; proveedor_usado?: string }> {
  const targetEmail = email || getCurrentUser()?.email || 'juanse.montes@gmail.com';
  try {
    const res = await fetch(`${API_BASE}/auth/vacantes/postular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vacante_id: vacanteId,
        email_usuario: targetEmail,
        respuestas_filtro: respuestasFiltro && respuestasFiltro.length > 0 ? respuestasFiltro : undefined,
      }),
    });
    if (res.ok) {
      return await res.json();
    } else {
      const err = await res.json().catch(() => ({ detail: 'Error al postular' }));
      return { status: 'error', mensaje: err.detail || 'Error al postular' };
    }
  } catch (err) {
    console.warn('Backend apply error:', err);
    return { status: 'error', mensaje: 'No se pudo conectar con el servidor para enviar la postulación.' };
  }
}

// Obtener postulaciones reales del usuario (GET /api/v1/auth/postulaciones)
export async function apiGetUserApplications(email?: string): Promise<any[]> {
  const targetEmail = email || getCurrentUser()?.email || 'juanse.montes@gmail.com';
  try {
    const res = await fetch(`${API_BASE}/auth/postulaciones?email=${encodeURIComponent(targetEmail)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend get applications error:', err);
  }
  return [];
}





// Eliminar Hoja de Vida de PostgreSQL (DELETE /api/v1/auth/cv/eliminar)
export async function apiDeleteCV(email?: string): Promise<{ success: boolean; message: string }> {
  const targetEmail = email || getCurrentUser()?.email || 'juanse.montes@gmail.com';
  try {
    const res = await fetch(`${API_BASE}/auth/cv/eliminar?email=${encodeURIComponent(targetEmail)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      return { success: true, message: 'Hoja de Vida eliminada exitosamente' };
    }
  } catch (err) {
    console.warn('Backend delete cv error:', err);
  }
  return { success: false, message: 'No se pudo eliminar la Hoja de Vida' };
}

// Retirar postulación de PostgreSQL (DELETE /api/v1/auth/postulaciones/{id})
export async function apiWithdrawApplication(postulacionId: number, email?: string): Promise<{ success: boolean; message: string }> {
  const targetEmail = email || getCurrentUser()?.email || 'juanse.montes@gmail.com';
  try {
    const res = await fetch(`${API_BASE}/auth/postulaciones/${postulacionId}?email=${encodeURIComponent(targetEmail)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      return { success: true, message: 'Postulación retirada exitosamente' };
    }
  } catch (err) {
    console.warn('Backend withdraw error:', err);
  }
  return { success: false, message: 'No se pudo retirar la postulación' };
}

// ==========================================
// SERVICIOS DE ADMINISTRACIÓN (DATOS REALES POSTGRESQL)
// ==========================================

export type SystemRole = 'usuario' | 'reclutador' | 'admin' | 'agente_soporte';

export interface AdminUserItem {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: SystemRole;
  es_admin_principal: boolean;
  empresa_id: number | null;
  empresa_nombre: string | null;
  especialidad: string;
  ciudad: string;
  email_verificado: boolean;
  activo: boolean;
  created_at: string | null;
  cv_count: number;
  cv_nombre: string | null;
  cv_score: number | null;
  postulaciones_count: number;
  vacantes_count: number;
}

export interface AdminEmpresaItem {
  id: number;
  nombre: string;
  nit: string | null;
  sector: string | null;
  activa: boolean;
  reclutadores_count: number;
  vacantes_count: number;
}

export interface AdminCategoryItem {
  id: number;
  nombre: string;
  descripcion: string;
  vacantes_count: number;
  ejercicios_count: number;
}

export interface PreparationResource {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: 'Guías de Estudio' | 'Videos Tutoriales' | 'Plantillas Profesionales';
  tipo: string;
  url_externa: string | null;
  nombre_archivo: string | null;
  tiene_archivo: boolean;
  archivo_url: string | null;
  created_at: string | null;
}

export interface AdminVacancyItem {
  id: number;
  titulo: string;
  empresa_id: number;
  empresa_nombre: string;
  reclutador_id: number;
  reclutador_nombre: string;
  reclutador_email: string;
  modalidad: string;
  ciudad: string;
  salario: string;
  experiencia: string;
  tipo_contrato: string;
  jornada: string;
  descripcion: string;
  requisitos: string[];
  puntaje_minimo: number;
  estado: 'borrador' | 'pendiente_aprobacion' | 'abierta' | 'rechazada' | 'cerrada';
  motivo_rechazo: string | null;
  total_postulados: number;
  created_at: string | null;
  fecha_aprobacion: string | null;
}

export interface AdminOverviewResponse {
  current_admin: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    es_admin_principal: boolean;
  };
  stats: {
    total_users: number;
    active_users: number;
    suspended_users: number;
    candidates: number;
    companies: number;
    admins: number;
    support_agents: number;
    active_jobs: number;
    pending_jobs: number;
    total_jobs: number;
    total_applications: number;
    total_cvs: number;
    total_interviews: number;
  };
  users: AdminUserItem[];
  empresas: AdminEmpresaItem[];
  categories: AdminCategoryItem[];
  vacancies: AdminVacancyItem[];
  resources: PreparationResource[];
  analytics: {
    role_distribution: Record<SystemRole, { count: number; percent: number }>;
    cv_completion_rate: number;
    avg_applications_per_vacancy: number;
    approved_applications: number;
    recent_users_30d: number;
  };
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH);
    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (refreshRes.ok) {
        const tokens: AuthTokens = await refreshRes.json();
        localStorage.setItem(STORAGE_KEY_TOKEN, tokens.access_token);
        localStorage.setItem(STORAGE_KEY_REFRESH, tokens.refresh_token);
        headers.set('Authorization', `Bearer ${tokens.access_token}`);
        res = await fetch(`${API_BASE}${path}`, { ...init, headers });
      }
    }
  }
  return res;
}

async function parseErrorDetail(res: Response, fallback: string): Promise<string> {
  const err = await res.json().catch(() => null);
  if (err?.detail) {
    return Array.isArray(err.detail) ? err.detail[0]?.msg || fallback : String(err.detail);
  }
  return fallback;
}

export async function apiGetAdminOverview(): Promise<AdminOverviewResponse> {
  const res = await authFetch('/admin/overview');
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudieron cargar los datos del panel de administración.'));
  }
  return await res.json();
}

export async function apiUpdateUserRole(
  userId: number,
  payload: { rol: SystemRole; empresa_id?: number | null; empresa_nombre?: string | null }
): Promise<AdminUserItem> {
  const res = await authFetch(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo actualizar el rol del usuario.'));
  }
  const data = await res.json();
  return data.user;
}

export async function apiUpdateUserStatus(userId: number, activo: boolean): Promise<AdminUserItem> {
  const res = await authFetch(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo cambiar el estado del usuario.'));
  }
  const data = await res.json();
  return data.user;
}

export async function apiDeleteAdminUser(userId: number): Promise<void> {
  const res = await authFetch(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo eliminar el usuario.'));
  }
}

export async function apiCreateAdminCategory(nombre: string, descripcion?: string): Promise<AdminCategoryItem> {
  const res = await authFetch('/admin/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, descripcion }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo crear la categoría.'));
  }
  return await res.json();
}

export async function apiDeleteAdminCategory(categoryId: number): Promise<void> {
  const res = await authFetch(`/admin/categories/${categoryId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo eliminar la categoría.'));
  }
}

export async function apiReviewAdminVacancy(
  vacanteId: number,
  accion: 'aprobar' | 'rechazar' | 'cerrar' | 'pendiente',
  motivoRechazo?: string
): Promise<{ status: string; vacante_id: number; estado: string; motivo_rechazo: string | null }> {
  const res = await authFetch(`/admin/vacantes/${vacanteId}/approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion, motivo_rechazo: motivoRechazo }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo actualizar el estado de la vacante.'));
  }
  return await res.json();
}

// ==========================================
// SERVICIOS DE EMPRESA / RECLUTADOR
// ==========================================

export type CompanyPersonType = 'juridica' | 'natural_rut';
export type CompanySizeCO = 'Micro' | 'Pequeña' | 'Mediana' | 'Grande';
export type SalarySchemeCO =
  | 'salario_fijo'
  | 'rango_salarial'
  | 'salario_comisiones'
  | 'salario_integral'
  | 'a_convenir';

export interface CompanyProfile {
  id: number;
  nombre: string;
  tipo_persona: CompanyPersonType;
  razon_social: string;
  nombre_comercial: string;
  nit: string;
  digito_verificacion: string;
  rut_numero: string;
  codigo_ciiu: string;
  sector: string;
  tamano_empresa: string;
  departamento: string;
  ciudad: string;
  direccion: string;
  sitio_web: string;
  linkedin_url: string;
  logo_url: string | null;
  descripcion: string;
  contacto_nombre: string;
  contacto_cargo: string;
  contacto_telefono: string;
  contacto_email: string;
  acepta_ley_1581: boolean;
  fecha_ley_1581: string | null;
  completitud: number;
  checklist: Record<string, boolean>;
  campos_faltantes: string[];
}

export interface CompanyProfileUpdatePayload {
  tipo_persona: CompanyPersonType;
  razon_social: string;
  nombre_comercial?: string;
  nit?: string;
  digito_verificacion?: string;
  rut_numero?: string;
  codigo_ciiu?: string;
  sector: string;
  tamano_empresa: CompanySizeCO;
  departamento: string;
  ciudad: string;
  direccion?: string;
  sitio_web?: string;
  linkedin_url?: string;
  descripcion?: string;
  contacto_nombre: string;
  contacto_cargo?: string;
  contacto_telefono: string;
  contacto_email: string;
  acepta_ley_1581: boolean;
}

export interface CompanyVacancyItem {
  id: number;
  titulo: string;
  categoria_area: string;
  cantidad_vacantes: number;
  descripcion: string;
  funciones: string;
  requisitos: string[];
  requisitos_raw: string;
  requisitos_indispensables: string;
  requisitos_deseables: string;
  habilidades_clave: string[];
  idiomas: VacancyIdioma[];
  preguntas_filtro?: VacancyPreguntaFiltro[];
  modalidad: string;
  departamento: string;
  ciudad: string;
  esquema_salarial: SalarySchemeCO;
  salario: string;
  salario_min_cop: number | null;
  salario_max_cop: number | null;
  salario_visible: boolean;
  beneficios: string;
  experiencia: string;
  nivel_educativo: string;
  tipo_contrato: string;
  jornada: string;
  puntaje_minimo: number;
  estado: 'borrador' | 'pendiente_aprobacion' | 'abierta' | 'pausada' | 'rechazada' | 'cerrada';
  motivo_rechazo: string | null;
  total_postulados: number;
  created_at: string | null;
  fecha_aprobacion: string | null;
}

export interface CompanyVacancyPayload {
  titulo: string;
  categoria_area: string;
  cantidad_vacantes: number;
  descripcion: string;
  funciones?: string;
  modalidad: 'presencial' | 'remoto' | 'hibrido';
  departamento?: string;
  ciudad?: string;
  tipo_contrato: string;
  jornada: string;
  esquema_salarial: SalarySchemeCO;
  salario_min_cop?: number | null;
  salario_max_cop?: number | null;
  salario_visible: boolean;
  salario?: string;
  beneficios?: string;
  experiencia: string;
  nivel_educativo: string;
  requisitos_indispensables: string;
  requisitos_deseables?: string;
  requisitos?: string;
  habilidades_clave: string[];
  idiomas: VacancyIdioma[];
  preguntas_filtro?: VacancyPreguntaFiltro[];
  puntaje_minimo?: number;
  empresa_id?: number | null;
}

export interface CompanyApplicantItem {
  id: number;
  usuario_id: number | null;
  nombre: string;
  email: string;
  telefono: string;
  ciudad: string;
  especialidad: string;
  nivel_experiencia: string;
  nivel_educativo: string;
  linkedin_url: string;
  github_url: string;
  vacante_id: number;
  vacante_titulo: string;
  estado: string;
  etapa_seleccion: ATSStage;
  etapa_label: string;
  revisado_por_empresa: boolean;
  notas_reclutador: string;
  calificacion_reclutador: number | null;
  cv_score: number | null;
  experiencia_anios: number | null;
  resumen_ejecutivo: string;
  requisitos_cumplidos: string[];
  requisitos_faltantes: string[];
  alertas: string[];
  preguntas_entrevista: string[];
  proveedor_ia: string;
  analisis_updated_at: string | null;
  tiene_analisis_guardado?: boolean;
  cv_nombre: string | null;
  tiene_cv: boolean;
  tiene_cv_archivo: boolean;
  cv_texto_preview: string;
  respuestas_filtro: VacancyRespuestaFiltro[];
  created_at: string | null;
}

export interface CompanyTalentItem {
  usuario_id: number;
  nombre: string;
  email: string;
  telefono: string;
  especialidad: string;
  ciudad: string;
  nivel_experiencia: string;
  nivel_educativo: string;
  linkedin_url: string;
  github_url: string;
  habilidades: string[];
  cv_nombre: string | null;
  tiene_cv_archivo: boolean;
  cv_score: number | null;
  ya_notificado: boolean;
}

export interface CompanyOverviewResponse {
  empresa: CompanyProfile | null;
  stats: {
    active_jobs: number;
    pending_jobs: number;
    rejected_jobs: number;
    total_applicants: number;
    unreviewed_applicants: number;
  };
  vacancies: CompanyVacancyItem[];
  applicants: CompanyApplicantItem[];
  talents: CompanyTalentItem[];
  empresas_disponibles?: { id: number; nombre: string; sector?: string | null }[];
}

export async function apiGetCompanyOverview(empresaId?: number | null): Promise<CompanyOverviewResponse> {
  const qs = empresaId ? `?empresa_id=${encodeURIComponent(String(empresaId))}` : '';
  const res = await authFetch(`/empresa/overview${qs}`);
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo cargar la información de la empresa.'));
  }
  return await res.json();
}

export async function apiUpdateCompanyProfile(
  payload: CompanyProfileUpdatePayload
): Promise<{ status: string; mensaje: string; empresa: CompanyProfile }> {
  const res = await authFetch('/empresa/perfil', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo guardar el perfil de la empresa.'));
  }
  return await res.json();
}

export async function apiUploadCompanyLogo(
  file: File
): Promise<{ status: string; mensaje: string; logo_url: string; empresa: CompanyProfile }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await authFetch('/empresa/perfil/logo', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo subir el logo de la empresa.'));
  }
  return await res.json();
}

export async function apiCreateCompanyVacancy(
  payload: CompanyVacancyPayload
): Promise<{ status: string; mensaje: string; vacancy: CompanyVacancyItem }> {
  const res = await authFetch('/empresa/vacantes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo publicar la vacante.'));
  }
  return await res.json();
}

export async function apiUpdateCompanyVacancy(
  vacanteId: number,
  payload: CompanyVacancyPayload
): Promise<{ status: string; mensaje: string; vacancy: CompanyVacancyItem }> {
  const res = await authFetch(`/empresa/vacantes/${vacanteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo actualizar la vacante.'));
  }
  return await res.json();
}

export async function apiDeleteCompanyVacancy(vacanteId: number): Promise<void> {
  const res = await authFetch(`/empresa/vacantes/${vacanteId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo eliminar la vacante.'));
  }
}

export async function apiChangeCompanyVacancyStatus(
  vacanteId: number,
  estado: 'abierta' | 'pausada' | 'cerrada'
): Promise<{ status: string; mensaje: string; vacancy: CompanyVacancyItem }> {
  const res = await authFetch(`/empresa/vacantes/${vacanteId}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo cambiar el estado de la vacante.'));
  }
  return await res.json();
}

export async function apiUpdateCompanyApplicantATS(
  postulacionId: number,
  payload: {
    etapa_seleccion?: ATSStage;
    notas_reclutador?: string;
    calificacion_reclutador?: number;
    revisado?: boolean;
    notificar_candidato?: boolean;
    mensaje_notificacion?: string;
  }
): Promise<{ status: string; notificado: boolean; mensaje: string; applicant: CompanyApplicantItem }> {
  const res = await authFetch(`/empresa/postulaciones/${postulacionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo actualizar el seguimiento del candidato.'));
  }
  return await res.json();
}

export async function apiFetchCompanyCVBlob(
  kind: 'applicant' | 'talent',
  targetId: number,
  download = false
): Promise<{ blob: Blob; contentType: string }> {
  const path =
    kind === 'applicant'
      ? `/empresa/postulaciones/${targetId}/cv${download ? '?download=true' : ''}`
      : `/empresa/candidatos/${targetId}/cv${download ? '?download=true' : ''}`;
  const res = await authFetch(path);
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo obtener el archivo de Hoja de Vida.'));
  }
  const blob = await res.blob();
  return { blob, contentType: res.headers.get('content-type') || blob.type || 'application/octet-stream' };
}

export interface TalentAIMatchResult {
  usuario_id: number;
  vacante_id: number;
  vacante_titulo: string;
  cv_nombre: string;
  proveedor_usado: string;
  puntaje_afinidad: number;
  experiencia_anios: number;
  resumen_ejecutivo: string;
  requisitos_cumplidos: string[];
  requisitos_faltantes: string[];
  alertas: string[];
  preguntas_entrevista: string[];
}

export interface CompanyComparisonItem {
  postulacion_id: number;
  nombre: string;
  puntaje_afinidad: number;
  experiencia_anios: number;
  fortalezas: string[];
  riesgos_brechas: string[];
  preguntas_entrevista: string[];
}

export interface CompanyComparisonResult {
  vacante_id: number;
  vacante_titulo: string;
  proveedor_usado: string;
  resumen_comparativo: string;
  recomendacion_contratacion: string;
  ranking: CompanyComparisonItem[];
}

export async function apiAnalyzeApplicantWithAI(
  postulacionId: number
): Promise<{ status: string; proveedor_usado: string; mensaje: string; applicant: CompanyApplicantItem }> {
  const res = await authFetch(`/empresa/postulaciones/${postulacionId}/analizar-ia`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo analizar la postulación con IA.'));
  }
  return await res.json();
}

export async function apiAnalyzePendingApplicantsWithAI(
  vacanteId: number,
  forzarReanalisis = false
): Promise<{
  status: string;
  vacante_id: number;
  procesados: number;
  con_gemini: number;
  omitidos_ya_analizados: number;
  errores: number;
  mensaje: string;
  updated_applicants: CompanyApplicantItem[];
}> {
  const res = await authFetch(`/empresa/vacantes/${vacanteId}/analizar-pendientes-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forzar_reanalisis: forzarReanalisis }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo ejecutar el análisis masivo con IA.'));
  }
  return await res.json();
}

export async function apiEvaluateTalentMatchWithAI(
  usuarioId: number,
  vacanteId: number
): Promise<{ status: string; match: TalentAIMatchResult }> {
  const res = await authFetch('/empresa/talento/evaluar-match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: usuarioId, vacante_id: vacanteId }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo evaluar la afinidad del candidato con IA.'));
  }
  return await res.json();
}

export async function apiCompareApplicantsWithAI(
  vacanteId: number,
  postulacionIds: number[]
): Promise<{ status: string; comparison: CompanyComparisonResult }> {
  const res = await authFetch(`/empresa/vacantes/${vacanteId}/comparar-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postulacion_ids: postulacionIds }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo generar la comparación con IA.'));
  }
  return await res.json();
}

export async function apiGetPreparationResources(): Promise<PreparationResource[]> {
  try {
    const res = await fetch(`${API_BASE}/auth/recursos`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend resources fetch error:', err);
  }
  return [];
}

export async function apiCreateAdminResource(formData: FormData): Promise<PreparationResource> {
  const res = await authFetch('/admin/recursos', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo publicar el recurso.'));
  }
  return await res.json();
}

export async function apiDeleteAdminResource(recursoId: number): Promise<void> {
  const res = await authFetch(`/admin/recursos/${recursoId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo eliminar el recurso.'));
  }
}

// ==========================================
// NOTIFICACIONES REALES E INTERÉS DE EMPRESAS
// ==========================================

export interface CandidateNotificationVacancy {
  id: number;
  titulo: string;
  descripcion: string;
  requisitos: string[];
  preguntas_filtro?: VacancyPreguntaFiltro[];
  modalidad: string;
  ciudad: string;
  salario: string;
  experiencia: string;
  tipo_contrato: string;
  jornada: string;
  puntaje_minimo: number;
  estado: string;
  ya_postulado: boolean;
}

export interface CandidateNotificationItem {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string | null;
  empresa: {
    id: number;
    nombre: string;
    sector: string;
    sitio_web?: string | null;
  } | null;
  vacante: CandidateNotificationVacancy | null;
  empresa_vacantes: CandidateNotificationVacancy[];
}

export async function apiGetCandidateNotifications(email?: string): Promise<CandidateNotificationItem[]> {
  const targetEmail = email || getCurrentUser()?.email || '';
  if (!targetEmail) return [];
  try {
    const res = await fetch(`${API_BASE}/auth/notificaciones?email=${encodeURIComponent(targetEmail)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend notifications fetch error:', err);
  }
  return [];
}

export async function apiMarkNotificationRead(notifId: number, email?: string): Promise<void> {
  const targetEmail = email || getCurrentUser()?.email || '';
  try {
    const qs = targetEmail ? `?email=${encodeURIComponent(targetEmail)}` : '';
    await fetch(`${API_BASE}/auth/notificaciones/${notifId}/leer${qs}`, { method: 'PATCH' });
  } catch (err) {
    console.warn('Mark notification read error:', err);
  }
}

export async function apiNotifyCandidateInterest(payload: {
  usuario_id: number;
  vacante_id?: number | null;
  mensaje?: string;
  tipo?: 'interes_empresa' | 'invitacion_entrevista';
}): Promise<{ status: string; notificacion_id: number; mensaje: string }> {
  const res = await authFetch('/empresa/notificar-interes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo enviar la notificación de interés.'));
  }
  return await res.json();
}

// ==========================================
// SERVICIOS DE SOPORTE Y MESA DE AYUDA
// ==========================================

export interface SupportTicketMessage {
  id: number;
  ticket_id: number;
  autor_id: number;
  autor_nombre: string;
  autor_rol: string;
  autor_es_superadmin: boolean;
  mensaje: string;
  created_at: string | null;
}

export interface SupportTicketItem {
  id: number;
  codigo: string;
  usuario_id: number;
  usuario_nombre: string;
  usuario_email: string;
  usuario_rol: string;
  agente_id: number | null;
  agente_nombre: string | null;
  agente_email: string | null;
  tipo_solicitud: 'duda' | 'problema_tecnico' | 'solicitud_funcion' | 'error';
  asunto: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta';
  estado: 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado';
  mensajes_count: number;
  created_at: string | null;
  updated_at: string | null;
  mensajes?: SupportTicketMessage[];
}

export interface SupportAgentOption {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  es_admin_principal: boolean;
}

export interface SupportTicketsOverview {
  viewer: {
    id: number;
    nombre: string;
    rol: string;
    es_admin_principal: boolean;
  };
  stats: {
    total: number;
    pendiente: number;
    en_proceso: number;
    resuelto: number;
    cerrado: number;
  };
  agents: SupportAgentOption[];
  tickets: SupportTicketItem[];
}

export async function apiGetMySupportTickets(): Promise<SupportTicketItem[]> {
  const res = await authFetch('/soporte/mis-tickets');
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudieron cargar tus tickets de soporte.'));
  }
  const data = await res.json();
  return data.tickets || [];
}

export async function apiCreateSupportTicket(payload: {
  tipo_solicitud: 'duda' | 'problema_tecnico' | 'solicitud_funcion' | 'error';
  asunto: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta';
}): Promise<SupportTicketItem> {
  const res = await authFetch('/soporte/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo crear el ticket de soporte.'));
  }
  const data = await res.json();
  return data.ticket;
}

export async function apiGetAllSupportTickets(estado = 'todos'): Promise<SupportTicketsOverview> {
  const qs = estado && estado !== 'todos' ? `?estado=${encodeURIComponent(estado)}` : '';
  const res = await authFetch(`/soporte/tickets${qs}`);
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No tienes permisos para acceder a la mesa de soporte.'));
  }
  return await res.json();
}

export async function apiUpdateSupportTicket(
  ticketId: number,
  payload: {
    estado?: 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado';
    prioridad?: 'baja' | 'media' | 'alta';
    agente_id?: number | null;
    desasignar_agente?: boolean;
  }
): Promise<SupportTicketItem> {
  const res = await authFetch(`/soporte/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo actualizar el ticket.'));
  }
  const data = await res.json();
  return data.ticket;
}

export async function apiReplySupportTicket(
  ticketId: number,
  mensaje: string
): Promise<SupportTicketItem> {
  const res = await authFetch(`/soporte/tickets/${ticketId}/mensajes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo enviar la respuesta al ticket.'));
  }
  const data = await res.json();
  return data.ticket;
}

// ==========================================
// SUPERADMIN / ADMIN: CHATBOT ABIERTO Y ANALIZADOR DE CVs
// ==========================================

export interface AdminCVAnalysisResult {
  status: string;
  candidato: { id: number; nombre: string; email: string; rol: string } | null;
  analisis: {
    score: number;
    es_apto: boolean;
    nivel_aptitud: string;
    nombre_archivo: string;
    habilidades_detectadas: string[];
    categorias_detectadas: Record<string, string[]>;
    elementos_faltantes: string[];
    puntos_fuertes: string[];
    total_palabras: number;
  };
  vacantes_match: {
    id: number;
    titulo: string;
    empresa: string;
    modalidad: string;
    match: number;
    puntaje_minimo: number;
    requisitos_cumplidos: string[];
    requisitos_faltantes: string[];
  }[];
  cv_texto_preview: string;
}

export async function apiAdminChat(payload: {
  mensaje: string;
  historial?: { sender: string; text: string }[];
  cv_texto?: string;
  candidato_id?: number | null;
}): Promise<{
  status: string;
  respuesta: string;
  fuente: string;
  tipo_consulta: string;
  accion_ejecutada: string | null;
}> {
  const res = await authFetch('/admin/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo consultar el asistente de administración.'));
  }
  return await res.json();
}

export async function apiAdminAnalyzeCVFile(
  file: File,
  vacanteId?: number | null
): Promise<AdminCVAnalysisResult> {
  const fd = new FormData();
  fd.append('file', file);
  if (vacanteId) {
    fd.append('vacante_id', String(vacanteId));
  }
  const res = await authFetch('/admin/cv/analizar-archivo', {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo analizar el archivo de Hoja de Vida.'));
  }
  return await res.json();
}

export async function apiAdminAnalyzeCVText(
  textoCv: string,
  vacanteId?: number | null,
  nombreArchivo = 'HojaDeVida_Admin.txt'
): Promise<AdminCVAnalysisResult> {
  const res = await authFetch('/admin/cv/analizar-texto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texto_cv: textoCv,
      nombre_archivo: nombreArchivo,
      vacante_id: vacanteId ?? null,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo analizar el texto de la Hoja de Vida.'));
  }
  return await res.json();
}

export async function apiAdminAuditCandidateCV(
  userId: number,
  vacanteId?: number | null
): Promise<AdminCVAnalysisResult> {
  const qs = vacanteId ? `?vacante_id=${encodeURIComponent(String(vacanteId))}` : '';
  const res = await authFetch(`/admin/candidatos/${userId}/cv-analisis${qs}`);
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'No se pudo auditar la Hoja de Vida del usuario.'));
  }
  return await res.json();
}
