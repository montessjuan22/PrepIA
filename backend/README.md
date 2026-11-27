# PrepIA — Backend (FastAPI + SQLAlchemy + PostgreSQL)

API REST de **PrepIA**, plataforma web de selección de candidatos y entrenamiento técnico con análisis de Hojas de Vida mediante Inteligencia Artificial (local y proveedores externos opcionales con consentimiento).

> Documentación ampliada del monorepo en [../README.md](../../README.md) y en [../docs/arquitectura_y_uso.md](../../docs/arquitectura_y_uso.md).

---

## 1. Stack Tecnológico Real

- **Framework:** FastAPI + Uvicorn + Pydantic v2 (`pydantic-settings`)
- **Base de Datos y Migraciones:** PostgreSQL 16 + SQLAlchemy 2.0 + Alembic (7 migraciones desde `33e43b79d2aa` hasta `f9d2b4e6a103`)
- **Modelos:** 27 clases ORM distribuidas en 7 módulos (`usuarios.py`, `ejercicios.py`, `seleccion.py`, `sesiones.py`, `retroalimentacion.py`, `privacidad.py`, `soporte.py`)
- **Autenticación:** JWT (`python-jose`, `bcrypt` con pre-hash SHA-256) + Google OAuth 2.0 (`httpx` contra `oauth2.googleapis.com`)
- **Procesamiento de CV e IA:** `pypdf`, lectura XML de `.docx`, `render_cover.ps1` para portadas PNG, capa multi-proveedor (`llm_provider.py`), anonimización y guardas de consentimiento (`cv_ai_analyzer.py`) y motor local determinístico (`cv_service.py`)
- **Pruebas:** `pytest` (17 pruebas unitarias e integrales sobre SQLite en memoria y mocks HTTP)

---

## 2. Routers Activos (`app/main.py`)

| Prefijo | Archivo | Alcance |
|---|---|---|
| `/health` | `app/main.py` | Verificación de disponibilidad del servicio |
| `/api/v1/auth` | `app/routers/auth.py` | Registro, login, refresh, logout, `/me`, recuperación de contraseña y Google OAuth |
| `/api/v1/auth` y `/api/v1/auth/candidato` | `app/routers/candidato.py` | Métricas del candidato, carga/eliminación/portada de CV, hoja estructurada, foto, chat IA, vacantes, postulaciones, consentimiento IA, recursos y notificaciones |
| `/api/v1/catalogos` | `app/routers/catalogos.py` | Niveles de dificultad, lenguajes de programación y temas |
| `/api/v1/empresa` | `app/routers/empresa.py` | Perfil empresarial Colombia (NIT/DV/RUT/Ley 1581), logo, vacantes flexibles, pipeline ATS, análisis IA individual/masivo, match de talento y comparador IA |
| `/api/v1/admin` | `app/routers/admin.py` | Overview de métricas reales, gestión jerárquica de roles y estados, categorías, aprobación/rechazo de vacantes y recursos de preparación |

---

## 3. Puesta en Marcha en Local (Windows PowerShell)

```powershell
cd D:\PrepIA\PrepIA\backend

# Crear y activar entorno virtual (si aún no existe)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# Copiar variables de entorno y ajustar credenciales
copy .env.example .env

# Levantar PostgreSQL (desde la raíz D:\PrepIA\PrepIA)
docker compose up -d db

# Aplicar migraciones Alembic
alembic upgrade head

# Iniciar servidor de desarrollo
uvicorn app.main:app --reload --port 8000
```

- **Swagger UI:** http://localhost:8000/docs
- **Healthcheck:** http://localhost:8000/health

---

## 4. IA, Privacidad y Respaldo Local

Por defecto, `AI_PROVIDER=local` y `AI_ALLOW_EXTERNAL=false`, operando sin costos ni llamadas externas.

Para activar **Gemini** (u otro proveedor soportado como `ollama`, `groq`, `openai`, `anthropic`):

```env
AI_PROVIDER=gemini
AI_ALLOW_EXTERNAL=true
GEMINI_API_KEY=tu_api_key
GEMINI_MODEL=gemini-3-flash-preview
```

Reglas implementadas en `app/services/cv_ai_analyzer.py` y `app/services/llm_provider.py`:
1. **Doble compuerta de privacidad:** Para candidatos, requiere `AI_ALLOW_EXTERNAL=true` y último registro `aceptado=true` en `historial_consentimientos` con `tipo='terceros'`. Para empresas, respeta revocaciones explícitas de `'terceros'` y valida consentimiento `'terceros'`, `'compartir_empresa'` o postulación voluntaria.
2. **Anonimización previa:** `anonimizar_texto()` redacta correos, enlaces, documentos de identidad, teléfonos, fechas de nacimiento, direcciones, nombre del candidato y líneas con atributos protegidos antes de enviar al LLM, truncando a `12.000` caracteres.
3. **Tolerancia a fallos:** `_call_gemini()` intenta secuencialmente `GEMINI_MODEL`, `gemini-3-flash-preview`, `gemini-3.1-flash-lite-preview` y `gemini-flash-latest` ante `HTTP 404/429/503`. Si falla la red, el proveedor o la validación Pydantic del JSON tras 2 intentos, conmuta automáticamente al motor local (`_local_fallback_analysis`).

---

## 5. Pruebas

```powershell
cd D:\PrepIA\PrepIA\backend
.\venv\Scripts\python.exe -m pytest tests -v
```
