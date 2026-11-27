# PrepIA — Plataforma de Selección y Entrenamiento de Candidatos con Inteligencia Artificial

> **Proyecto Formativo SENA — Centro Nacional Colombo Alemán (Ficha N°. 3233926, Malambo/Atlántico)**  
> **Equipo de Desarrollo (Repositorio):** Juan Sebastian Montes Osorio, Thomas Cortez, Luis Eduardo Ibarra Salazar *(y colaboradores documentados en la documentación consolidada v4: Leandro David Fonseca Pérez, Lesly Mirjadys Altamar Angulo, Edgar Fabián Pedraza Barrios, Deivis Jesús Corrales Rengifo)*.  
> **Principio Rector:** *La Inteligencia Artificial analiza, puntúa y sugiere preguntas o recomendaciones objetivas, pero la decisión final de contratación siempre es 100% humana.*

---

## 1. Visión General del Proyecto

**PrepIA** es una plataforma web integral orientada a la preselección de talento y preparación de candidatos. Permite a las **empresas** gestionar su perfil tributario y legal colombiano (NIT/DV oficial DIAN, RUT, aceptación de Ley 1581 de 2012), publicar vacantes multi-industria (sujetas a aprobación administrativa), administrar postulantes en un flujo ATS con ranking por afinidad, comparar candidatos con IA y enviar notificaciones de avance o invitación a entrevista.

Para los **candidatos**, ofrece carga y análisis de Hoja de Vida (PDF, DOCX, TXT) con vista previa de portada, constructor de hoja de vida estructurada, explorador de empleos con filtros salariales en COP y preguntas filtro, evaluador de compatibilidad contra vacantes, asistente conversacional sobre su perfil y vacantes, simulador de entrevistas, guía de vestimenta (*Dress Code*), recursos de preparación y control explícito de consentimiento para envío anonimizado a IA externa.

Para el **administrador**, proporciona tablero global de analíticas desde PostgreSQL, aprobación/rechazo de vacantes, gestión de categorías profesionales y publicación de recursos de estudio, además de administración jerárquica de roles protegida por la figura de **Administrador Principal** (`es_admin_principal`).

---

## 2. Documentación del Proyecto (`docs/`)

Todos los documentos técnicos, académicos, de calidad y sus versiones en **Microsoft Word (`.docx`)** listas para presentar se encuentran en la carpeta `docs/`:

- [docs/arquitectura_y_uso.md](docs/arquitectura_y_uso.md) ([Word](docs/01_Documentacion_Tecnica_Arquitectura_PrepIA.docx)) — Arquitectura real, modelos SQLAlchemy, migraciones Alembic, catálogo de endpoints REST, variables `.env`, Google OAuth, consentimiento de privacidad e IA con Gemini + respaldo local.
- [docs/documentacion_app_web.md](docs/documentacion_app_web.md) ([Word](docs/02_Documentacion_App_Web_PrepIA.docx)) — Documentación actualizada de la aplicación web SPA (React + TypeScript + Vite): rutas, paneles de Candidato/Empresa/Admin, componentes, `api.ts` y catálogos Colombia.
- [docs/tesis_borrador.md](docs/tesis_borrador.md) ([Word](docs/03_Tesis_Borrador_PrepIA.docx)) — Borrador académico estructurado en 9 capítulos según la guía de tesis de grado de software y la documentación consolidada v4 (con marcas `[VERIFICAR / COMPLETAR]`).
- [docs/pruebas_y_errores.md](docs/pruebas_y_errores.md) ([Word](docs/04_Pruebas_y_Errores_QA_PrepIA.docx)) — Casos de prueba funcionales y de integración, resultado de la suite automatizada (`pytest`) y bitácora de errores reales de desarrollo.

---

## 3. Estructura Real del Monorepo

```text
D:\PrepIA\PrepIA\
├── backend/                              # API FastAPI, SQLAlchemy, Alembic y pruebas pytest
│   ├── alembic/
│   │   └── versions/                     # 7 migraciones (33e43b79d2aa -> f9d2b4e6a103)
│   ├── app/
│   │   ├── main.py                       # App FastAPI, CORS y montaje de routers /api/v1/*
│   │   ├── core/                         # config.py, database.py, deps.py, security.py
│   │   ├── models/                       # Modelos SQLAlchemy en 7 archivos (soporte, selección, usuarios, etc.)
│   │   ├── routers/                      # auth.py, candidato.py, catalogos.py, empresa.py, admin.py, soporte.py
│   │   ├── schemas/                      # auth.py, catalogos.py, empresa.py (Pydantic v2)
│   │   └── services/                     # auth_service, cv_service, cv_ai_analyzer, llm_provider, render_cover.ps1
│   ├── tests/                            # 4 suites pytest (20 pruebas unitarias/integrales)
│   ├── .env.example                      # Plantilla de variables de entorno
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                             # Aplicación Web SPA (React 18 + TypeScript + Vite)
│   ├── src/
│   │   ├── App.tsx                       # Enrutamiento React Router v7
│   │   ├── main.tsx
│   │   ├── index.css                     # Estilos Tailwind + soporte claro/oscuro
│   │   ├── services/                     # api.ts (cliente REST), theme.ts
│   │   └── app/
│   │       ├── components/               # GoogleAuthModal, ForgotPasswordModal, JobSearchExplorer, etc.
│   │       └── pages/                    # Landing, Login, Register, Candidate/Company/AdminDashboard, Empleos
│   ├── vite.config.ts                    # Puerto 3000 + proxy /api -> http://localhost:8000
│   ├── nginx.conf                        # Proxy /api/ -> http://backend:8000 en contenedor
│   ├── Dockerfile
│   └── package.json
├── docs/                                 # Documentación técnica, tesis y QA
├── docker-compose.yml                    # Orquestación: db (postgres:16), backend (:8000), frontend (:3000->80)
└── package.json                          # Scripts auxiliares en la raíz
```

---

## 4. Puesta en Marcha Rápida

### Opción A: Docker Compose (todo el ecosistema)

```powershell
# Desde D:\PrepIA\PrepIA
docker compose up -d --build
```

- **Frontend:** http://localhost:3000 (Nginx interno en puerto 80 mapeado a `3000`)
- **Backend API & Swagger:** http://localhost:8000/docs y `/health`
- **PostgreSQL 16:** `localhost:5432` (usuario `prepia_user`, BD `prepia_db`)

### Opción B: Ejecución Local en Desarrollo (Windows PowerShell)

1. **Base de datos PostgreSQL:**
   ```powershell
   docker compose up -d db
   ```
2. **Backend (FastAPI + Alembic):**
   ```powershell
   cd D:\PrepIA\PrepIA\backend
   copy .env.example .env   # Configura DATABASE_URL, JWT_SECRET_KEY y llaves opcionales
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload --port 8000
   ```
3. **Frontend (React + Vite):**
   ```powershell
   cd D:\PrepIA\PrepIA\frontend
   npm install
   npm run dev
   ```
   El servidor Vite inicia en `http://localhost:3000` y redirige `/api/*` hacia `http://localhost:8000`.

---

## 5. Variables de Entorno Clave (`backend/.env`)

| Variable | Valor por defecto | Propósito |
|---|---|---|
| `DATABASE_URL` | `postgresql://prepia_user:prepia_pass@localhost:5432/prepia_db` | Cadena de conexión a PostgreSQL |
| `JWT_SECRET_KEY` | *(obligatoria)* | Clave de firma HS256 para access y refresh tokens |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Orígenes permitidos por `CORSMiddleware` |
| `GOOGLE_CLIENT_ID` | `""` | Client ID de Google Identity Services para OAuth 2.0 |
| `AI_PROVIDER` | `local` | Motor de análisis (`local`, `ollama`, `groq`, `gemini`, `openai`, `anthropic`) |
| `AI_ALLOW_EXTERNAL` | `false` | Interruptor global que habilita envío a proveedores externos |
| `GEMINI_API_KEY` | `""` | API key de Google AI Studio (requiere `AI_ALLOW_EXTERNAL=true`) |
| `GEMINI_MODEL` | `gemini-3-flash-preview` | Modelo principal de Gemini con cadena automática de respaldo |

---

## 6. Módulos y Roles Implementados

- **Autenticación y Seguridad (`/api/v1/auth`):**
  - Registro público (`POST /register`) asigna siempre `rol="usuario"` por seguridad; solo el Administrador Principal asigna `reclutador`, `admin` o `agente_soporte`.
  - Login estándar (`POST /login`) con `bcrypt` (pre-hash SHA-256 + base64) y tokens JWT (`access` 30 min, `refresh` 7 días persistido como hash SHA-256 en `sesiones_auth`).
  - Recuperación de contraseña (`POST /forgot-password`, `POST /reset-password`) con código de 6 dígitos en `tokens_recuperacion`.
  - OAuth Google (`GET /google/config`, `POST /google`) con verificación de token contra Google y vinculación en `identidades_oauth`.
- **Panel de Candidato (`/dashboard/candidate`, `/empleos`):**
  - Métricas reales (`/metricas`), carga de CV PDF/DOCX/TXT (`/cv/analizar-archivo`) con generación de portada PNG vía `render_cover.ps1` (`/cv/portada`), hoja estructurada (`/hoja-estructurada`), foto de perfil (`/perfil/foto`), chat auditor (`/cv/chat`), explorador de vacantes (`/vacantes`), evaluación previa (`/vacantes/evaluar`), postulación con preguntas filtro (`/vacantes/postular`), notificaciones (`/notificaciones`), recursos (`/recursos`) y control de consentimiento IA (`/privacidad/consentimiento-ia`).
- **Panel de Empresa / Reclutador (`/dashboard/company`, `/api/v1/empresa`):**
  - Perfil empresarial colombiano (`/perfil`, `POST /nit/calcular-dv`, `/perfil/logo`), publicación y edición de vacantes flexibles (`/vacantes`), cambio de estado (`abierta`/`pausada`/`cerrada` tras aprobación admin), pipeline ATS con etapas, notas, estrellas y notificaciones (`/postulaciones/{id}`), análisis IA individual y masivo (`/postulaciones/{id}/analizar-ia`, `/vacantes/{id}/analizar-pendientes-ia`), búsqueda de talento (`/talento/evaluar-match`, `POST /notificar-interes`) y comparador IA de 2 a 5 candidatos (`/vacantes/{id}/comparar-ia`).
- **Panel de Administración (`/dashboard/admin`, `/api/v1/admin`):**
  - Estadísticas globales (`/overview`), asignación de roles con creación/asociación de empresa (`PATCH /users/{id}/role`), suspensión/reactivación y eliminación segura de cuentas, categorías profesionales (`/categories`), aprobación/rechazo de vacantes (`PATCH /vacantes/{id}/approval`) y publicación de recursos (`/recursos`).

---

## 7. Pruebas Automatizadas

Para ejecutar las pruebas unitarias e integrales del backend desde `D:\PrepIA\PrepIA\backend`:

```powershell
.\venv\Scripts\python.exe -m pytest tests -v
```

Actualmente existen **20 pruebas automatizadas** distribuidas en `tests/test_ats_empresa.py`, `tests/test_empresa_colombia.py`, `tests/test_ia_analisis_cv.py` y `tests/test_soporte.py`. Ver el detalle completo en [docs/pruebas_y_errores.md](docs/pruebas_y_errores.md).
