# Documentación de Pruebas, Incidentes y Lecciones Aprendidas (QA) — PrepIA

> **Propósito:** Recopilar la estrategia de pruebas funcionales y de integración de **PrepIA**, los resultados verificados de la suite automatizada (`pytest`) y el registro real de incidentes de desarrollo, causas raíces y soluciones aplicadas en el repositorio.  
> **Marco de referencia:** [Pruebas-de-integracion.pdf](file:///C:/Users/monte/Downloads/Pruebas-de-integracion.pdf) (*Fundamentos de Software — Pruebas de Integración*).

---

## 1. Enfoque Metodológico de Pruebas de Integración

De acuerdo con la guía de [Pruebas-de-integracion.pdf](file:///C:/Users/monte/Downloads/Pruebas-de-integracion.pdf), una prueba de integración verifica que dos o más módulos funcionen correctamente al colaborar de principio a fin, validando tres momentos clave:

1. **Conectar:** un módulo invoca a otro mediante su interfaz (por ejemplo, Frontend Vite → Proxy `/api` → FastAPI → PostgreSQL / Google OAuth / Gemini API).
2. **Intercambiar:** los datos viajan completos, tipados y con el significado esperado (contratos Pydantic v2, JSON validado en `AnalisisCVOutput`, tokens JWT, respuestas ATS).
3. **Continuar:** el flujo avanza coherentemente o gestiona errores sin corromper la base de datos ni exponer información sensible (ej. respaldo automático al motor local si falla Gemini, o rechazo HTTP 400/403 ante vacantes no aprobadas o consentimientos revocados).

---

## 2. Suite Automatizada Verificada (`backend/tests/`)

Ejecución verificada con el entorno virtual del proyecto (`D:\PrepIA\PrepIA\backend\venv\Scripts\python.exe -m pytest tests -v`):
- **Resultado observado:** **`17 passed` (17/17 aprobadas)**, 2 advertencias informativas (deprecación de `class Config` en Pydantic v2 y permisos de caché en directorio de ejecución).
- **Alcance técnico de esta suite:** utiliza base de datos **SQLite en memoria** (`sqlite:///:memory:`) y *mocks/monkeypatch* de `httpx` / `completar()` para aislar pruebas sin consumir cuotas reales de Gemini ni requerir PostgreSQL encendido durante la prueba unitaria/integral.

### 2.1 Inventario de Casos Automatizados Verificados

| Archivo | Caso de Prueba (`def test_*`) | Qué verifica (Conectar → Intercambiar → Continuar) | Resultado |
|---|---|---|---|
| `test_ats_empresa.py` | `test_overview_rankea_postulantes_y_calcula_sin_revisar` | Ordenamiento descendente por `cv_score`, cálculo de `unreviewed_applicants`, habilidades cumplidas/faltantes y respuestas filtro | `PASSED` |
| `test_ats_empresa.py` | `test_cambio_etapa_ats_guarda_notas_estrellas_y_notifica` | Actualización de etapa ATS (`en_entrevista`), registro en `decisiones_postulacion` y creación de `notificaciones` | `PASSED` |
| `test_ats_empresa.py` | `test_pausar_reactivar_y_cerrar_vacante_aprobada` | Transiciones válidas `abierta ↔ pausada`, bloqueo HTTP `400` si la vacante está en `pendiente_aprobacion` | `PASSED` |
| `test_ats_empresa.py` | `test_reanalisis_individual_y_lote_pendientes_con_gemini_simulado` | Omisión de postulantes ya evaluados con Gemini en lote, re-análisis individual y guardado de `preguntas_entrevista` | `PASSED` |
| `test_ats_empresa.py` | `test_talento_match_y_comparar_candidatos_ia` | Evaluación de talento y comparador IA multi-candidato con validación de consentimiento `compartir_empresa` | `PASSED` |
| `test_empresa_colombia.py` | `test_calcular_dv_nit_oficial_dian` | Cálculo exacto del Dígito de Verificación oficial DIAN para NITs reales de referencia | `PASSED` |
| `test_empresa_colombia.py` | `test_empresa_profile_valida_dv_y_ley_1581` | Rechazo de `acepta_ley_1581=False`, rechazo de DV incorrecto, autocalculo de DV y soporte a Persona Natural con RUT | `PASSED` |
| `test_empresa_colombia.py` | `test_completitud_empresa` | Cálculo de porcentaje `0%` a `100%` y listado de campos faltantes en perfil empresarial | `PASSED` |
| `test_empresa_colombia.py` | `test_vacante_flexible_multi_industria_y_salario_cop` | Formato salarial en COP, ocultamiento público cuando `salario_visible=False` y rechazo de rango invertido | `PASSED` |
| `test_empresa_colombia.py` | `test_prompt_ia_incluye_contexto_multi_industria` | Inclusión de área, educación, habilidades clave e idiomas en `build_user_prompt()` | `PASSED` |
| `test_ia_analisis_cv.py` | `test_anonimizar_texto_elimina_pii_y_atributos_protegidos` | Eliminación de edad, estado civil, género, correo, teléfono, CC, URLs, dirección, fecha de nacimiento y nombre | `PASSED` |
| `test_ia_analisis_cv.py` | `test_anonimizar_texto_trunca_a_12000_caracteres` | Límite estricto `MAX_CV_CHARS = 12_000` y bandera `truncado=True` | `PASSED` |
| `test_ia_analisis_cv.py` | `test_system_and_user_prompts_incluyen_reglas_y_delimitadores` | Regla `DATO NO CONFIABLE` y etiquetas `<vacante>` / `<hoja_de_vida>` contra *prompt injection* | `PASSED` |
| `test_ia_analisis_cv.py` | `test_validacion_rechaza_puntajes_fuera_de_rango_y_json_malo` | Reintento ante JSON roto o `puntaje_afinidad=150` y conmutación segura al motor local | `PASSED` |
| `test_ia_analisis_cv.py` | `test_respaldo_ante_error_http_de_proveedor` | Respaldo automático al motor local ante respuesta `HTTP 503` del proveedor externo | `PASSED` |
| `test_ia_analisis_cv.py` | `test_puede_enviar_a_ia_externa_respeta_ambas_condiciones` | Validación conjunta de `AI_ALLOW_EXTERNAL` + historial *append-only* (`aceptado=True` y revocación `False`) | `PASSED` |
| `test_ia_analisis_cv.py` | `test_analizar_postulacion_upsert_y_transicion_segura` | Upsert único en `analisis_cv` sin duplicados y transición segura sin aprobar/rechazar automáticamente | `PASSED` |

---

## 3. Casos de Prueba Funcionales y de Integración E2E (Por Módulo)

Los siguientes casos cubren la integración completa (**Frontend React `:3000` → Backend FastAPI `:8000` → PostgreSQL `:5432` / Servicios Externos**) para validación manual o futura automatización con `TestClient` / Playwright:

| ID | Módulo / Flujo | Precondición | Pasos y Verificación | Estado |
|---|---|---|---|---|
| **CP-01** | **Salud Backend y BD** | PostgreSQL activo y `alembic upgrade head` aplicado | `GET /health` → `200 {"status": "ok"}`; `GET /api/v1/auth/ping` → `200 {"message": "pong"}` | Por ejecutar con BD activa |
| **CP-02** | **Registro, Login y Rol Seguro** | Backend y BD activos | Registrar vía `POST /api/v1/auth/register`; verificar que el usuario persiste con `rol="usuario"`, hash `bcrypt` y `POST /login` retorna JWT `access_token` + `refresh_token` | Por ejecutar E2E |
| **CP-03** | **Google OAuth en `localhost:3000`** | `GOOGLE_CLIENT_ID` configurado en `backend/.env` y origen `http://localhost:3000` autorizado en Google Cloud | Abrir `/login` → "Continuar con Google" → `GET /auth/google/config` devuelve `configured=true` → `POST /auth/google` valida `aud`/`iss`/`email_verified` y crea fila en `identidades_oauth` | Por ejecutar E2E |
| **CP-04** | **Recuperación de Contraseña** | Usuario registrado | `POST /auth/forgot-password` genera código en `tokens_recuperacion`; `POST /auth/reset-password` valida expiración (15 min) y actualiza `password_hash` | Por ejecutar E2E |
| **CP-05** | **Privacidad y Consentimiento IA** | Candidato en `/dashboard/candidate` y `AI_ALLOW_EXTERNAL=true` | Consultar `GET /privacidad/consentimiento-ia`; activar/revocar con `POST /privacidad/consentimiento-ia` y verificar inserción *append-only* en `historial_consentimientos` | Lógica verificada en `pytest`; flujo UI E2E pendiente |
| **CP-06** | **Carga de CV, Portada PNG y Análisis Dual** | Candidato autenticado | Subir PDF/DOCX en `/cv/analizar-archivo`; verificar extracción de texto, guardado en `uploads/cv/`, renderizado en `/cv/portada` y análisis con Gemini (si autorizado) o motor local | Motor IA verificado en `pytest`; flujo archivo/portada E2E pendiente |
| **CP-07** | **Exploración y Postulación con Preguntas Filtro** | Vacante aprobada (`estado="abierta"`) con pregunta obligatoria | Intentar postular sin responder → error `400`; responder y postular → `200` con `estado_postulacion="cv_analizado"` y registro en `postulaciones` + `analisis_cv` | Lógica ATS/postulación verificada; flujo HTTP completo pendiente |
| **CP-08** | **Panel Empresa: Perfil DIAN y Vacantes** | Usuario promovido a `reclutador` por admin | Guardar perfil con NIT válido (`POST /nit/calcular-dv`) y `acepta_ley_1581=true`; crear vacante (`estado="pendiente_aprobacion"`); verificar que no aparece en `/vacantes` hasta aprobación admin | Lógica verificada en `pytest`; UI E2E pendiente |
| **CP-09** | **Panel Admin: Jerarquía y Aprobaciones** | Cuenta con `es_admin_principal=True` | Promover usuario a `reclutador` (`PATCH /admin/users/{id}/role`), aprobar vacante (`PATCH /admin/vacantes/{id}/approval`), publicar recurso y verificar bloqueo al intentar modificar al Admin Principal | Por ejecutar E2E |

---

## 4. Registro de Errores e Incidentes de Desarrollo y Solución

Bitácora consolidada a partir de la arquitectura actual, configuraciones de Windows/PowerShell, código defensivo implementado y comprobaciones ejecutadas en el entorno:

| ID | Error / Síntoma Observado | Causa Raíz | Solución Aplicada / Mitigación en Código | Estado de Verificación |
|---|---|---|---|---|
| **ERR-01** | **`ECONNREFUSED` en proxy de Vite (`/api/*` → `http://localhost:8000`)** al iniciar sesión o consultar métricas desde el navegador | El frontend (`npm run dev` en `:3000`) reenvía todas las rutas `/api` al backend configurado en `vite.config.ts`, pero Uvicorn/FastAPI no estaba ejecutándose en el puerto `8000` (o el contenedor `prepia-backend` estaba detenido) | Levantar primero PostgreSQL y el backend (`uvicorn app.main:app --reload --port 8000` o `docker compose up -d`) antes de consumir el frontend; el cliente `src/services/api.ts` captura el fallo de red y muestra mensaje controlado sin romper la SPA | Verificado en configuración (`vite.config.ts`, `api.ts`) |
| **ERR-02** | **Fallo al invocar `vite build` sobre el *junction* `frontend/` (`Cannot read directory "../frontend": Acceso denegado`) y errores de ruta en PowerShell/venv** | En Windows, `D:\PrepIA\PrepIA\frontend` y `backend` son *junctions*; `esbuild` dentro de Vite puede fallar al resolver rutas relativas sobre el *junction* si no se ejecuta desde el directorio real `prepia-frontend` (o sin `preserveSymlinks`). Además, activar `venv` en PowerShell requiere `.\venv\Scripts\Activate.ps1` o invocar `.\venv\Scripts\python.exe` directamente cuando `ExecutionPolicy` restringe scripts | Configurar `resolve: { preserveSymlinks: true }` en `vite.config.ts`; ejecutar comandos de build/dev desde `prepia-frontend` y comandos Python directamente con `.\venv\Scripts\python.exe -m pytest` o `uvicorn` | **Observado directamente** al ejecutar `npm --prefix frontend run build` vs `prepia-frontend` |
| **ERR-03** | **Error de inicio con Google OAuth (`Google OAuth no está configurado` o token rechazado en `http://localhost:3000`)** | Falta `GOOGLE_CLIENT_ID` en `backend/.env`, el `aud` del token no coincide con `GOOGLE_CLIENT_ID`, o `http://localhost:3000` no está registrado en *Authorized JavaScript origins* (Google Cloud Console) ni en `CORS_ORIGINS` | Se implementó `GET /api/v1/auth/google/config` para detectar configuración antes de renderizar el botón en `GoogleAuthModal.tsx`, validación explícita de `aud`, `iss` y `email_verified` en `auth_service.py`, y `CORS_ORIGINS=["http://localhost:3000"]` por defecto | Verificado en `auth.py`, `auth_service.py` y `GoogleAuthModal.tsx` |
| **ERR-04** | **Análisis con Gemini no se dispara aunque exista `GEMINI_API_KEY` (cae al motor local)** | Doble compuerta de privacidad: `AI_ALLOW_EXTERNAL` es `false` por defecto en `.env.example` / `config.py`, o el candidato no ha otorgado (o revocó) su consentimiento `'terceros'` en `historial_consentimientos` | El candidato debe activar explícitamente el consentimiento desde el panel (`/privacidad/consentimiento-ia`) y el servidor debe tener `AI_PROVIDER=gemini` y `AI_ALLOW_EXTERNAL=true`. Validado por `puede_enviar_a_ia_externa` y `puede_empresa_enviar_a_ia_externa` | **Verificado en `pytest`** (`test_puede_enviar_a_ia_externa_respeta_ambas_condiciones`) |
| **ERR-05** | **Respuestas `HTTP 404` (modelo no encontrado/deprecado), `429` o `503` al llamar a la API de Gemini, o JSON malformado del LLM** | Cambios o retiros de versiones de modelos en el endpoint `v1beta/models/{model}:generateContent`, límites de tasa de capa gratuita o respuestas envueltas en bloques Markdown / puntajes fuera de rango | En `llm_provider.py`, `_call_gemini()` recorre en cascada `[GEMINI_MODEL, "gemini-3-flash-preview", "gemini-3.1-flash-lite-preview", "gemini-flash-latest"]` ante `404/429/503` con reintento (`_post_with_retry`). En `cv_ai_analyzer.py`, `_extract_json_object` limpia bloques ` ```json ` y `AnalisisCVOutput` valida rangos; tras 2 fallos conmuta a `_local_fallback_analysis` | **Verificado en `pytest`** (`test_validacion_rechaza_puntajes_fuera_de_rango_y_json_malo`, `test_respaldo_ante_error_http_de_proveedor`) |
| **ERR-06** | **Error al insertar texto extraído de CV en PostgreSQL o PDF escaneado sin texto seleccionable** | Algunos PDFs contienen bytes nulos `\x00` o caracteres de control rechazados por PostgreSQL `UTF8`, o son imágenes escaneadas donde `pypdf` extrae cadena vacía | `cv_service._sanitize_extracted_text()` limpia `[\x00-\x08\x0b\x0c\x0e-\x1f]` y `candidato.py` aplica `.replace("\x00", "")`; si el texto extraído tiene `< 20` caracteres, asigna una plantilla técnica descriptiva mínima basada en el nombre del archivo para no bloquear la carga | Verificado en código (`cv_service.py`, `candidato.py`) |
| **ERR-07** | **Vacante recién creada por empresa no aparece en el portal público ni puede pausarse/reactivarse** | Regla de moderación agregada en el módulo Colombia/ATS: toda vacante creada en `POST /api/v1/empresa/vacantes` inicia en `estado="pendiente_aprobacion"` hasta aprobación administrativa | El administrador debe aprobar la vacante desde `/dashboard/admin` (`PATCH /api/v1/admin/vacantes/{id}/approval` con `accion="aprobar"`), pasando a `estado="abierta"` | **Verificado en `pytest`** (`test_pausar_reactivar_y_cerrar_vacante_aprobada`) |
| **ERR-08** | **Advertencias en `pytest`: `PydanticDeprecatedSince20` en `app/core/config.py` y `PytestCacheWarning` en `C:\Windows\System32`** | `Settings` usa `class Config:` heredado de Pydantic v1 en lugar de `model_config = ConfigDict(...)`, y ejecutar `pytest` con directorio de trabajo en `System32` impide escribir `.pytest_cache` | Ejecutar `pytest` posicionado dentro de `D:\PrepIA\PrepIA\backend` (donde sí tiene permisos de escritura); migrar `Settings.Config` a `SettingsConfigDict` queda registrado como mejora menor de mantenimiento | **Observado directamente** en salida de `pytest` |

---

## 5. Comandos Recomendados de Verificación Rápida

```powershell
# 1. Ejecutar suite backend desde la carpeta del backend
cd D:\PrepIA\PrepIA\backend
.\venv\Scripts\python.exe -m pytest tests -v

# 2. Verificar tipos TypeScript del frontend (desde prepia-frontend)
cd D:\PrepIA\PrepIA\prepia-frontend
npx tsc --noEmit
```
