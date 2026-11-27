# Documentación Actualizada de la Aplicación Web (Frontend) — PrepIA

> **Alcance:** Documentación técnica y funcional de la aplicación web SPA (**Single Page Application**) ubicada en `D:\PrepIA\PrepIA\prepia-frontend` (accesible vía *junction* `D:\PrepIA\PrepIA\frontend`).  
> **Stack:** React 18.3.1 + TypeScript 5.6.3 + Vite 5.4.10 + React Router DOM 7.18.6 + TailwindCSS 3.4.15 + Radix UI + Lucide React.

---

## 1. Arquitectura y Configuración de la App Web

### 1.1 Archivos de Configuración Base

| Archivo | Propósito | Detalle Clave |
|---|---|---|
| `package.json` | Scripts y dependencias | `dev` (`vite`), `build` (`tsc && vite build`), `preview` (`vite preview`) |
| `vite.config.ts` | Servidor de desarrollo y proxy | Puerto `3000`, `resolve.preserveSymlinks: true`, alias `@` → `./src`, proxy `/api` → `http://localhost:8000` (`changeOrigin: true`) |
| `nginx.conf` | Servidor de producción (Docker) | Escucha puerto `80` (mapeado a `3000` en `docker-compose.yml`), `try_files $uri $uri/ /index.html` y `proxy_pass http://backend:8000` para `/api/` |
| `Dockerfile` | Imagen multi-etapa | Compila con Node y sirve estáticos con Nginx |
| `tsconfig.json` | Configuración TypeScript | Tipado estricto para módulos React/Vite |
| `tailwind.config.js` / `src/index.css` | Estilos y accesibilidad | Soporte dual de **Modo Claro y Modo Oscuro** (`dark:` classes) con alto contraste |

### 1.2 Estructura de Carpetas en `src/`

```text
frontend/src/
├── main.tsx                     # Punto de entrada React (monta <App />)
├── App.tsx                      # Definición de rutas con BrowserRouter
├── index.css                    # Estilos globales Tailwind + tema claro/oscuro
├── services/
│   ├── api.ts                   # Cliente HTTP (/api/v1), sesión JWT en localStorage y contratos TS
│   └── theme.ts                 # Controlador de tema claro/oscuro
├── data/
│   ├── colombia.ts              # 33 departamentos/ciudades, 18 sectores CIIU, contratos, salarios, etapas ATS y WhatsApp CO
│   └── mockData.ts              # Datos auxiliares heredados
├── app/
│   ├── pages/                   # Vistas principales enrutadas en App.tsx
│   └── components/              # Componentes activos de negocio y primitivos UI (ui/)
└── components/                  # Componentes de prototipo inicial heredados (no montados en App.tsx)
```

---

## 2. Mapa de Navegación y Rutas (`src/App.tsx`)

Todas las rutas se renderizan dentro del layout raíz `Root.tsx`:

| Ruta URL | Componente Página | Acceso / Rol | Descripción |
|---|---|---|---|
| `/` | `Landing` | Público | Hero principal, propuesta de valor, tarjetas de características y CTA a registro/empleos |
| `/login` | `Login` | Público | Inicio de sesión por correo/contraseña, botón Google OAuth (`GoogleAuthModal`), modal de recuperación (`ForgotPasswordModal`) y modal de registro rápido |
| `/register` | `Register` | Público | Registro de candidatos (`RegisterFormCard`) con correo o Google OAuth y aceptación obligatoria de términos/datos personales |
| `/empleos` | `Empleos` | Público / Candidato | Explorador de vacantes abiertas (`JobSearchExplorer`), evaluación de afinidad con CV, preguntas filtro, postulación y control de consentimiento IA |
| `/dashboard` | Redirección | — | Redirige automáticamente a `/dashboard/candidate` |
| `/dashboard/candidate` | `CandidateDashboard` | Candidato (`usuario`) | Panel completo de preparación, CV, chat IA, postulaciones, empleos, notificaciones y recursos |
| `/dashboard/company` | `CompanyDashboard` | Empresa (`reclutador`) | Panel ATS para vacantes, postulantes, comparador IA, talento y perfil colombiano |
| `/dashboard/admin` | `AdminDashboard` | Administrador (`admin`) | Panel de control global, usuarios/roles, moderación de vacantes, categorías y recursos |
| `/resources` | Redirección | — | Redirige automáticamente a `/dashboard/candidate` |
| `/showcase` | `Showcase` | Público | Vista demostrativa de interfaz |
| `*` | Redirección | — | Cualquier ruta desconocida redirige a `/` |

---

## 3. Barra de Navegación y Gestión de Sesión (`Navbar.tsx` + `api.ts`)

### 3.1 Persistencia de Sesión en el Navegador
El archivo `src/services/api.ts` administra la sesión mediante `localStorage`:
- `prepia_current_user`: objeto `UserSession` (`id`, `nombre`, `email`, `telefono`, `rol`, `es_admin_principal`, `email_verificado`, etc.).
- `prepia_access_token`: JWT *Bearer* de acceso (expiración configurada en backend: 30 min).
- `prepia_refresh_token`: token de renovación (7 días).
- Al actualizar la sesión (`setCurrentUser`), despacha los eventos `user-session-update` y `storage` para sincronizar inmediatamente la barra de navegación (`Navbar.tsx`) sin recargar la página.

### 3.2 Redirección por Rol (`getDashboardRouteForRole`)
- `reclutador` / `company` / `empresa` → `/dashboard/company`
- `admin` / `administrador` → `/dashboard/admin`
- `usuario` (por defecto) → `/dashboard/candidate`

### 3.3 Barra de Navegación (`Navbar.tsx`)
Incluye logotipo corporativo, menú móvil (`MobileMenu.tsx`), conmutador de tema claro/oscuro (`ThemeToggle.tsx`), insignia visual del rol autenticado (*Candidato*, *Empresa* o *Admin*), acceso directo a **Mi Panel** y cierre de sesión (`logoutUser()`).

---

## 4. Módulos y Funcionalidades por Panel

### 4.1 Panel de Candidato (`CandidateDashboard.tsx`)

Organizado en **9 pestañas interactivas**:

1. **`overview` (Resumen):**
   - Indicadores reales de PostgreSQL (`apiGetCandidateMetrics`): puntaje de CV, total de aplicaciones, sesiones de entrevista y barra de completitud del perfil.
   - Carga de Hoja de Vida PDF/DOCX/TXT (`apiAnalyzeCVFile`), visualización de portada PNG (`cv_portada_url`) con modal de zoom y eliminación de CV (`apiDeleteCV`).
   - Tarjeta `StructuredResumeCard.tsx` para editar experiencias laborales, estudios, idiomas, habilidades y movilidad (`apiUpdateStructuredCV`), además de foto de perfil (`apiUploadProfilePhoto`, `apiDeleteProfilePhoto`) y modal de edición de perfil (`apiUpdateProfile`).
2. **`cv-chat` (Copiloto / Chat IA):**
   - Asistente conversacional (`apiChatWithCV`) que consulta en el backend el CV real del candidato, sus postulaciones, sesiones y las vacantes abiertas en PostgreSQL.
3. **`cv-analysis` (Análisis de CV):**
   - Diagnóstico detallado del CV cargado o pegado como texto (`apiAnalyzeCVText`): veredicto de aptitud, habilidades detectadas por categoría, brechas críticas y recomendaciones accionables.
4. **`interview-simulator` (Simulador de Entrevistas):**
   - Interfaz interactiva (`InterviewSimulator` / `InterviewTypeSelector`) para practicar respuestas técnicas y conductuales con retroalimentación formativa en pantalla.
5. **`dress-code` (Vestimenta Profesional):**
   - Guía interactiva (`DressCodeGuide.tsx`) de código de vestimenta según tipo de empresa y modalidad de entrevista.
6. **`applications` (Mis Postulaciones):**
   - Listado de vacantes a las que se ha postulado el candidato (`apiGetUserApplications`), mostrando porcentaje de compatibilidad (*match*) y etapa ATS actualizada por la empresa.
7. **`jobs` (Empleos):**
   - Integra `JobSearchExplorer.tsx` con buscador por palabra clave, ciudad/departamento, modalidad, experiencia, tipo de contrato, rangos salariales en COP, fecha y ordenamiento.
   - Permite guardar vacantes favoritas en `localStorage` (`prepia_saved_vacancies`), evaluar afinidad previa contra el CV (`apiEvaluateVacancy`), responder preguntas filtro dinámicas (texto, número o selección) antes de postular (`apiApplyToVacancy`) y activar/revocar el **consentimiento de análisis con IA externa** (`apiGetAIConsent` / `apiSetAIConsent`).
8. **`notifications` (Notificaciones):**
   - Bandeja de mensajes enviados por empresas (`apiGetCandidateNotifications`): interés en el perfil, invitaciones a entrevista y cambios de etapa ATS, con detalle expandible de vacantes y marcado como leída (`apiMarkNotificationRead`).
9. **`resources` (Recursos de Estudio):**
   - Catálogo dinámico desde PostgreSQL (`apiGetPreparationResources`) clasificado en *Guías de Estudio*, *Videos Tutoriales* y *Plantillas Profesionales*, con descarga directa o enlace externo.

### 4.2 Panel de Empresa / Reclutador (`CompanyDashboard.tsx`)

Organizado en **4 pestañas principales**:

1. **`jobs` (Mis Vacantes):**
   - Creación y edición mediante `VacancyFormModal.tsx` con datos adaptados al mercado colombiano (`src/data/colombia.ts`): 14 áreas laborales, 33 departamentos y ciudades, 6 tipos de contrato (incluyendo *Contrato de Aprendizaje SENA*), 5 jornadas, 5 esquemas salariales en COP (fijo, rango, salario+comisiones, integral, a convenir y visibilidad configurable), habilidades clave, idiomas y constructor de preguntas filtro.
   - Gestión de estado (`abierta`, `pausada`, `cerrada`) para vacantes aprobadas por el administrador (`apiChangeCompanyVacancyStatus`) y eliminación (`apiDeleteCompanyVacancy`).
2. **`candidates` (Postulantes — `CompanyApplicantsTab.tsx`):**
   - Ranking de postulantes con puntaje de afinidad, estrellas (1–5), notas privadas del reclutador, selector de etapa ATS (`ATS_ETAPAS_CO`) y notificación automática opcional al candidato (`apiUpdateCompanyApplicantATS`).
   - Distinción visual de proveedor IA (*Analizado con Gemini IA* vs *Motor Local*), botón de re-análisis individual (`apiAnalyzeApplicantWithAI`), análisis masivo de pendientes (`apiAnalyzePendingApplicantsWithAI`), **comparador IA de 2 a 5 postulantes** (`apiCompareApplicantsWithAI`), visor/descarga de CV (`apiFetchCompanyCVBlob`) y botón directo de contacto por WhatsApp Colombia (`buildWhatsAppColombiaUrl`).
3. **`talents` (Buscar Talento — `CompanyTalentsTab.tsx`):**
   - Directorio de candidatos registrados filtrable por palabra clave, ciudad, experiencia y nivel educativo.
   - Evaluación rápida de afinidad IA frente a una vacante propia (`apiEvaluateTalentMatchWithAI`), descarga de CV y modal para enviar invitación formal (`apiNotifyCandidateInterest`).
4. **`profile` (Perfil de Empresa — `CompanyProfileTab.tsx`):**
   - Configuración de identidad tributaria colombiana: **Persona Jurídica** (NIT + cálculo automático de Dígito de Verificación DIAN) o **Persona Natural con RUT**, selección de código CIIU y sector, tamaño (`Micro`, `Pequeña`, `Mediana`, `Grande`), departamento/ciudad, carga de logo (`apiUploadCompanyLogo`), datos de contacto y aceptación obligatoria de **Ley 1581 de 2012**.

### 4.3 Panel de Administración (`AdminDashboard.tsx`)

Organizado en **7 pestañas** con navegación horizontal deslizable:

1. **`users` (Usuarios):** listado completo con búsqueda y filtro por rol; acciones de suspender/reactivar (`apiUpdateUserStatus`) y eliminación segura (`apiDeleteAdminUser`).
2. **`vacancies` (Aprobación de Empleos):** revisión de vacantes enviadas por empresas en `pendiente_aprobacion` para aprobar, rechazar con motivo obligatorio, cerrar o devolver a pendiente (`apiReviewAdminVacancy`).
3. **`roles` (Roles y Permisos):** asignación de roles (`usuario`, `reclutador` asociando empresa existente o creando una nueva, y `admin` habilitado únicamente si `current_admin.es_admin_principal` es verdadero) mediante `apiUpdateUserRole`.
4. **`categories` (Categorías Profesionales):** creación y eliminación de perfiles profesionales (`apiCreateAdminCategory`, `apiDeleteAdminCategory`).
5. **`resources` (Recursos de Preparación):** publicación con archivo real (`FormData`) o URL externa (`apiCreateAdminResource`) y eliminación (`apiDeleteAdminResource`).
6. **`analytics` (Analíticas):** métricas agregadas desde PostgreSQL (distribución porcentual por rol, tasa de completitud de CV, promedio de postulaciones por vacante, aprobaciones y nuevos usuarios en 30 días).
7. **`settings` (Configuración):** resumen operativo y controles administrativos del sistema.

---

## 5. Integración con el Backend (`src/services/api.ts`)

Todas las peticiones HTTP apuntan a `const API_BASE = '/api/v1'`, lo que permite que el frontend sea agnóstico al puerto o dominio del servidor:
- **En desarrollo local:** Vite (`http://localhost:3000`) intercepta `/api/*` y lo redirige a `http://localhost:8000`.
- **En Docker / Producción:** Nginx (`:80` mapeado a `:3000`) intercepta `/api/` y lo redirige a `http://backend:8000`.

### 5.1 Catálogo de Funciones Exportadas en `src/services/api.ts`

- **Sesión y Autenticación:** `getCurrentUser`, `setCurrentUser`, `logoutUser`, `getDashboardRouteForRole`, `validatePasswordStrength`, `apiLogin`, `apiRegister`, `apiForgotPassword`, `apiResetPassword`, `apiGetGoogleConfig`, `apiGoogleLogin`.
- **Candidato, CV y Privacidad:** `apiGetCandidateMetrics`, `apiAnalyzeCVFile`, `apiAnalyzeCVText`, `apiUpdateProfile`, `apiUpdateStructuredCV`, `apiUploadProfilePhoto`, `apiDeleteProfilePhoto`, `apiGetAIConsent`, `apiSetAIConsent`, `apiChatWithCV`, `apiGetVacancies`, `apiEvaluateVacancy`, `apiApplyToVacancy`, `apiGetUserApplications`, `apiDeleteCV`, `apiWithdrawApplication`, `apiGetPreparationResources`, `apiGetCandidateNotifications`, `apiMarkNotificationRead`.
- **Empresa y ATS:** `apiGetCompanyOverview`, `apiUpdateCompanyProfile`, `apiUploadCompanyLogo`, `apiCreateCompanyVacancy`, `apiUpdateCompanyVacancy`, `apiDeleteCompanyVacancy`, `apiChangeCompanyVacancyStatus`, `apiUpdateCompanyApplicantATS`, `apiFetchCompanyCVBlob`, `apiAnalyzeApplicantWithAI`, `apiAnalyzePendingApplicantsWithAI`, `apiEvaluateTalentMatchWithAI`, `apiCompareApplicantsWithAI`, `apiNotifyCandidateInterest`.
- **Administración:** `apiGetAdminOverview`, `apiUpdateUserRole`, `apiUpdateUserStatus`, `apiDeleteAdminUser`, `apiCreateAdminCategory`, `apiDeleteAdminCategory`, `apiReviewAdminVacancy`, `apiCreateAdminResource`, `apiDeleteAdminResource`.

---

## 6. Ejecución, Compilación y Recomendaciones en Windows

```powershell
# 1. Instalar dependencias y ejecutar en desarrollo (desde la carpeta real o junction)
cd D:\PrepIA\PrepIA\prepia-frontend
npm install
npm run dev
# Abre http://localhost:3000 (requiere backend activo en http://localhost:8000)

# 2. Verificar tipos TypeScript y generar compilación de producción
npx tsc --noEmit
npm run build
```

> **Nota técnica importante en Windows:** Debido a que `D:\PrepIA\PrepIA\frontend` es un *junction* hacia `D:\PrepIA\PrepIA\prepia-frontend`, se recomienda ejecutar `npm run build` directamente dentro de `prepia-frontend` para evitar bloqueos de resolución de rutas relativas en `esbuild`.
