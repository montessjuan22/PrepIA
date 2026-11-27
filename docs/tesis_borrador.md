# Borrador de Tesis / Monografía de Software — PrepIA

> **Nota editorial:** Este documento articula la implementación real de **PrepIA** (`D:\PrepIA\PrepIA`) con las tres referencias base del proyecto:
> 1. [Estructura_Tesis_Software.pdf](file:///C:/Users/monte/Downloads/Estructura_Tesis_Software.pdf) (guía de estructura de 9 capítulos, trazabilidad y orientación metodológica).
> 2. [PrepIA_Documentacion_Consolidada_v4_EDITABLE.docx](archivo_historico/PrepIA_Documentacion_Consolidada_v4_EDITABLE.docx) (proyecto formativo SENA v4, requisitos RF01–RF26 y documento de metodología).
> 3. [Pruebas-de-integracion.pdf](file:///C:/Users/monte/Downloads/Pruebas-de-integracion.pdf) (enfoque de pruebas de integración: *Conectar → Intercambiar → Continuar*).
>
> Todo dato institucional pendiente, cita bibliográfica formal o métrica de validación con usuarios reales se encuentra marcado explícitamente con **`[VERIFICAR / COMPLETAR]`**.

---

## PRELIMINARES

### Portada (Propuesta)

- **Título Propuesto:** *Diseño e implementación de PrepIA: plataforma web para la preselección de talento y preparación de candidatos mediante análisis automatizado de hojas de vida con Inteligencia Artificial y supervisión humana*
- **Programa / Institución:** Servicio Nacional de Aprendizaje (SENA) — Centro Nacional Colombo Alemán — Análisis y Desarrollo de Software — Ficha N°. `3233926` (Malambo/Atlántico) `[VERIFICAR / COMPLETAR: confirmar si se presenta como proyecto SENA o trabajo de grado universitario adicional]`
- **Autores:**
  - Juan Sebastian Montes Osorio `[VERIFICAR / COMPLETAR: nombre completo / documento]`
  - Thomas Cortez `[VERIFICAR / COMPLETAR]`
  - Luis Eduardo Ibarra Salazar `[VERIFICAR / COMPLETAR]`
  - *(Equipo ampliado registrado en Documentación Consolidada v4: Leandro David Fonseca Pérez, Lesly Mirjadys Altamar Angulo, Edgar Fabián Pedraza Barrios, Deivis Jesús Corrales Rengifo)* `[VERIFICAR / COMPLETAR: definir lista oficial de sustentantes]`
- **Director / Instructor(a):** Eduardo Cano Vélez / Sivelys Sarmiento Crespo `[VERIFICAR / COMPLETAR: confirmar nombre del asesor principal]`
- **Fecha:** Noviembre de 2026 `[VERIFICAR / COMPLETAR: fecha oficial de entrega]`

### Resumen

La preselección de personal en organizaciones medianas y pequeñas suele depender de revisiones manuales de hojas de vida y criterios heterogéneos entre reclutadores, lo cual incrementa los tiempos operativos y la subjetividad en el filtrado inicial. Este trabajo presenta el análisis, diseño, implementación y verificación de **PrepIA**, una plataforma web full-stack desarrollada con **FastAPI**, **SQLAlchemy 2.0**, **Alembic** y **PostgreSQL 16** en el backend, y **React 18**, **TypeScript**, **Vite** y **TailwindCSS** en el frontend. El sistema evolucionó desde un simulador de práctica técnica (v3) hacia una plataforma multi-industria de selección de candidatos (v4) adaptada al contexto colombiano (validación de NIT/DV DIAN y cumplimiento de la Ley 1581 de 2012). PrepIA integra autenticación con JWT y Google OAuth 2.0, un flujo ATS por etapas, gestión jerárquica de roles y un motor dual de análisis de Hojas de Vida que combina modelos de lenguaje externos (como Google Gemini) —bajo consentimiento explícito *append-only* y anonimización previa de datos personales— con un motor determinístico local de respaldo. La verificación mediante 17 pruebas automatizadas en `pytest` confirma el funcionamiento de las reglas tributarias/legales, la privacidad y el pipeline ATS. `[VERIFICAR / COMPLETAR: añadir resultados de validación con usuarios piloto cuando se ejecuten]`.

### Abstract

`[VERIFICAR / COMPLETAR: traducir al inglés el resumen definitivo una vez aprobados título y métricas finales]`.

### Lista de Abreviaturas

- **ATS:** *Applicant Tracking System* (Sistema de Seguimiento de Postulantes).
- **CIIU:** Clasificación Industrial Internacional Uniforme.
- **COP:** Peso Colombiano.
- **CV / HV:** *Curriculum Vitae* / Hoja de Vida.
- **DIAN:** Dirección de Impuestos y Aduanas Nacionales (Colombia).
- **DV:** Dígito de Verificación del NIT.
- **IA / LLM:** Inteligencia Artificial / *Large Language Model*.
- **JWT:** *JSON Web Token*.
- **OAuth 2.0:** *Open Authorization 2.0*.
- **ORM:** *Object-Relational Mapping* (SQLAlchemy).
- **PII:** *Personally Identifiable Information* (Datos Personales Identificables).
- **RF / RNF:** Requerimiento Funcional / Requerimiento No Funcional.

---

## CAPÍTULO 1. PLANTEAMIENTO DEL PROBLEMA

### 1.1 Descripción del problema

En los procesos actuales de talento humano, la etapa de preselección exige contrastar decenas o cientos de hojas de vida contra los requisitos específicos de cada vacante, formular preguntas filtro pertinentes y consolidar observaciones de seguimiento. Cuando esta tarea se realiza manualmente mediante hojas de cálculo o correo electrónico, surgen tres problemáticas concretas:

1. **Consumo elevado de tiempo y heterogeneidad de criterios:** cada reclutador interpreta las brechas y fortalezas de manera distinta, dificultando la comparabilidad objetiva entre postulantes.
2. **Falta de retroalimentación transparente para el candidato:** los aspirantes suelen postularse sin conocer su nivel real de ajuste frente a los requisitos ni recibir orientación sobre brechas concretas antes de la entrevista.
3. **Riesgos de privacidad y dependencia tecnológica al usar IA:** enviar hojas de vida directamente a modelos de lenguaje externos sin anonimización ni consentimiento granular vulnera principios de protección de datos (Ley 1581 de 2012 en Colombia), mientras que depender únicamente de APIs en la nube expone el sistema a fallos ante cuotas agotadas, errores HTTP o ausencia de conectividad.

### 1.2 Formulación del problema

¿Cómo diseñar e implementar una plataforma web integral que permita a las empresas colombianas publicar vacantes, analizar objetivamente hojas de vida y gestionar postulantes en un flujo ATS, brindando simultáneamente preparación transparente a los candidatos y garantizando protección de datos personales, tolerancia a fallos de IA externa y decisión final 100 % humana?

### 1.3 Sistematización del problema

1. ¿Qué arquitectura modular y modelo de datos relacional permiten soportar tanto la preparación de candidatos como el flujo completo de selección multi-industria?
2. ¿Cómo integrar proveedores de IA generativa (como Google Gemini) evitando la exposición de datos personales sensibles y asegurando la continuidad operativa ante fallos externos?
3. ¿Qué mecanismos de autenticación, autorización jerárquica y cumplimiento normativo colombiano (NIT/DV, Ley 1581 de 2012) requiere la plataforma?
4. ¿Cómo verificar mediante pruebas de integración que los módulos de autenticación, privacidad, análisis IA y ATS intercambian datos correctamente y gestionan errores de forma coherente?

### 1.4 Objetivos

#### 1.4.1 Objetivo general
Desarrollar una plataforma web de selección y preparación de talento (**PrepIA**) que permita a las empresas evaluar objetivamente a los candidatos mediante el análisis automatizado de hojas de vida, gestión ATS y asistencia con Inteligencia Artificial bajo supervisión humana, ofreciendo al mismo tiempo herramientas de autoevaluación y resguardo de datos personales.

#### 1.4.2 Objetivos específicos
1. Especificar los requerimientos funcionales y no funcionales (RF01–RF26) a partir de las necesidades de candidatos, empresas reclutadoras y administradores.
2. Diseñar una arquitectura desacoplada y un modelo de datos relacional en PostgreSQL que soporte usuarios, identidades OAuth, empresas colombianas, vacantes flexibles, postulaciones, análisis de CV, decisiones ATS, consentimientos y catálogos.
3. Implementar el backend REST en FastAPI y el frontend SPA en React/TypeScript con autenticación JWT + Google OAuth 2.0, control de roles jerárquico y flujos completos para candidato, empresa y administrador.
4. Integrar un motor dual de análisis de CV (proveedores LLM como Gemini con anonimización previa, mitigación de *prompt injection* y respaldo local determinístico) sujeto a consentimiento explícito del usuario.
5. Proteger los datos personales y el cumplimiento normativo colombiano mediante historial de consentimientos *append-only*, validación DIAN de NIT/DV y aceptación de la Ley 1581 de 2012, garantizando que la decisión de contratación sea siempre humana.
6. Verificar la integración entre módulos mediante pruebas automatizadas unitarias/integrales y documentar los casos de prueba e incidentes técnicos del desarrollo.

### 1.5 Justificación

El desarrollo de PrepIA se justifica desde tres dimensiones:
- **Operativa:** reduce la carga manual inicial del reclutador al extraer texto de PDF/DOCX, calcular afinidad frente a requisitos obligatorios y deseables, detectar brechas y sugerir preguntas específicas de entrevista.
- **Ética y normativa:** implementa el principio de *human-in-the-loop* (la IA puntúa y recomienda, nunca aprueba ni rechaza automáticamente) y protege la privacidad mediante consentimiento trazable y anonimización previa al envío externo.
- **Tecnológica y económica:** al operar por defecto con un motor local sin costo (`AI_PROVIDER=local`) y contar con conmutación automática ante fallos de APIs externas, la plataforma es viable para PYMEs e instituciones educativas sin presupuestos elevados de cómputo.

### 1.6 Alcance

- **Incluido en el producto actual verificado:**
  - Registro e inicio de sesión (correo/contraseña + Google OAuth 2.0) y recuperación de contraseña por código.
  - Gestión administrativa de roles (con protección de Administrador Principal), categorías profesionales, aprobación/rechazo de vacantes y recursos de estudio.
  - Perfil empresarial colombiano (persona jurídica o natural con RUT, cálculo oficial de DV de NIT, Ley 1581 de 2012 y logo), creación y gestión de vacantes multi-industria con preguntas filtro y esquemas salariales en COP.
  - Carga, extracción de texto, previsualización de portada PNG y análisis de CV (local o Gemini con consentimiento), postulación, ranking ATS, notas, calificación por estrellas, comparador IA (2–5 postulantes) y notificaciones.
  - Constructor de hoja de vida estructurada, explorador de empleos, asistente conversacional sobre el CV, guía de vestimenta y simulador de entrevistas en interfaz.
- **Fuera de alcance actual (heredado o planificado):**
  - Contratación automática sin intervención humana.
  - Videoconferencia en vivo con entrevistadores humanos o integración con portales externos de empleo.
  - Ejecución en vivo de código en sandbox externo (Judge0) y procesamiento real de audio/video en `grabaciones_sesion` / `analisis_comunicacion` (cuyas tablas existen en BD para fases posteriores).

### 1.7 Limitaciones

- La anonimización mediante expresiones regulares reduce la exposición de datos personales evidentes, pero como señala explícitamente el código (`cv_ai_analyzer.py`), no garantiza eliminar el 100 % de la PII en formatos completamente libres; por ello actúa como capa complementaria al consentimiento explícito.
- La generación de portadas PNG del CV (`render_cover.ps1`) depende de utilidades de Windows/PowerShell en el entorno servidor local.
- Los módulos de banco de ejercicios por vacante (`vacante_ejercicios`), ejecución sandbox de código (`sesiones_prueba`) y tickets de soporte (`tickets_soporte`) cuentan con definición relacional/ORM en BD, pero aún no disponen de endpoints REST completos ni validación con usuarios reales en producción `[VERIFICAR / COMPLETAR]`.

### 1.8 Delimitación

- **Geográfica y normativa:** adaptada al mercado laboral y marco tributario/legal de Colombia (DIAN NIT/DV, departamentos y municipios colombianos, salario en COP, contratos colombianos incluyendo Contrato de Aprendizaje SENA, Ley 1581 de 2012).
- **Temporal y académica:** desarrollo realizado entre 2025 y noviembre de 2026 dentro del programa de Análisis y Desarrollo de Software (Ficha `3233926`) `[VERIFICAR / COMPLETAR: ajustar fechas exactas del período lectivo/productivo]`.

---

## CAPÍTULO 2. MARCO REFERENCIAL

### 2.1 Antecedentes

PrepIA inició en su versión v3 como un simulador de entrevistas técnicas enfocado exclusivamente en aspirantes a desarrollo de software (limitado inicialmente a ejercicios en JavaScript y Python). Con base en la retroalimentación del proyecto formativo documentada en [PrepIA_Documentacion_Consolidada_v4_EDITABLE.docx](archivo_historico/PrepIA_Documentacion_Consolidada_v4_EDITABLE.docx), el sistema evolucionó hacia la versión v4 para convertirse en una **plataforma de selección multi-industria**, incorporando empresas, reclutadores, vacantes con perfiles profesionales amplios, preguntas filtro, postulaciones con CV, ranking ATS y decisiones trazables, preservando al mismo tiempo el enfoque formativo de preparación para el candidato.

### 2.2 Marco teórico

- **Sistemas de Seguimiento de Postulantes (ATS):** plataformas orientadas a centralizar vacantes, postulaciones y etapas del embudo de contratación (`postulado` → `en_revision` → `preseleccionado` → `en_entrevista` → `finalista` / `aprobado` / `rechazado`). `[VERIFICAR / COMPLETAR: cita bibliográfica formal de RRHH/ATS]`.
- **Procesamiento de Lenguaje Natural y Modelos de Lenguaje (LLM) en Selección:** uso de *prompts* estructurados y validación de salidas JSON para extraer habilidades, estimar experiencia y formular preguntas de entrevista, mitigando alucinaciones e inyección de instrucciones (*prompt injection*). `[VERIFICAR / COMPLETAR: cita académica reciente sobre LLMs y mitigación de sesgos en selección]`.
- **Principio *Human-in-the-Loop* (IA Centrada en el Humano):** enfoque ético donde la IA genera insumos analíticos, puntajes explicables y alertas, manteniendo en manos humanas la decisión final vinculante. `[VERIFICAR / COMPLETAR: referencia ISO/IEC o UNESCO sobre ética de IA]`.
- **Pruebas de Integración de Software:** siguiendo el marco conceptual de [Pruebas-de-integracion.pdf](file:///C:/Users/monte/Downloads/Pruebas-de-integracion.pdf), las pruebas de integración verifican que dos o más módulos trabajen juntos cumpliendo tres fases: **Conectar** (llamado mediante interfaz), **Intercambiar** (datos con formato y significado esperados) y **Continuar** (avance del flujo o gestión coherente de errores sin corromper el estado).

### 2.3 Marco conceptual

- **Postulación y Hoja de Vida:** registro de interés de un candidato sobre una vacante abierta adjuntando el texto extraído de su CV.
- **Afinidad (*Match Score*):** porcentaje de `0` a `100` calculado según la rúbrica (`60 %` requisitos obligatorios, `25 %` experiencia relevante, `15 %` formación y complementarios).
- **Consentimiento Informado *Append-Only*:** patrón de auditoría donde cada cambio de autorización se inserta como una fila nueva con marca de tiempo sin sobrescribir la historia previa.
- **Respaldo Local (*Fallback*):** mecanismo que garantiza respuesta válida evaluando localmente los requisitos cuando el proveedor LLM externo no está autorizado o falla.

### 2.4 Marco tecnológico

- **Backend:** Python 3.12+ (ejecutado en entorno local con Python 3.14.7), FastAPI, Pydantic v2 (`pydantic-settings`), SQLAlchemy 2.0, Alembic, `python-jose` (HS256), `bcrypt`, `httpx`, `pypdf`, `pytest`.
- **Base de Datos:** PostgreSQL 16 (y SQLite en memoria para pruebas unitarias/integrales aisladas).
- **Frontend:** React 18.3.1, TypeScript 5.6, Vite 5.4, React Router DOM 7, TailwindCSS 3.4, Radix UI, Lucide React.
- **Contenerización:** Docker y Docker Compose v2 (`db`, `backend`, `frontend` con Nginx).

### 2.5 Marco legal

- **Ley Estatutaria 1581 de 2012 (Colombia):** Régimen General de Protección de Datos Personales. En PrepIA se materializa mediante la aceptación expresa de tratamiento de datos en el registro de candidatos, la casilla obligatoria `acepta_ley_1581` en el perfil empresarial y la tabla `historial_consentimientos` para controlar el envío a terceros (`tipo='terceros'` y `tipo='compartir_empresa'`). `[VERIFICAR / COMPLETAR: incluir Decreto 1377 de 2013 y artículo constitucional 15 de Habeas Data]`.
- **Validación Tributaria DIAN (NIT y DV):** algoritmo oficial módulo 11 con pesos `(3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71)` implementado en `calcular_dv_nit()`.

### 2.6 Estado del arte

`[VERIFICAR / COMPLETAR: redactar tabla comparativa de 3 a 5 plataformas comerciales o académicas (ej. LinkedIn Talent Solutions, Computrabajo/Magneto, Greenhouse, trabajos de grado afines) contrastando enfoque en Colombia, transparencia al candidato, anonimización IA y respaldo local]`.

---

## CAPÍTULO 3. METODOLOGÍA

### 3.1 Enfoque de investigación
Enfoque **aplicado y tecnológico** de corte cuantitativo-cualitativo (cuantitativo en métricas de afinidad y cobertura de pruebas; cualitativo en análisis documental de requisitos y retroalimentación textual).

### 3.2 Tipo de investigación
Investigación aplicada de desarrollo de software (ingeniería web), orientada a resolver una necesidad concreta mediante prototipado funcional y verificación técnica.

### 3.3 Población y muestra
`[VERIFICAR / COMPLETAR: definir población objetivo (reclutadores de PYMEs colombianas y candidatos/aprendices) y tamaño de muestra si se aplican encuestas o pruebas de validación con usuarios]`.

### 3.4 Técnicas de recolección de información
Análisis documental (requisitos v3/v4, diccionario de datos, esquema SQL), observación directa sobre el comportamiento del sistema e inspecciones de código y pruebas. `[VERIFICAR / COMPLETAR: agregar entrevistas o encuestas si se realizan]`.

### 3.5 Instrumentos
Matriz de requerimientos RF01–RF26, guion de casos de prueba en `pytest` y bitácora de incidentes técnicos (`docs/pruebas_y_errores.md`). `[VERIFICAR / COMPLETAR: anexar formato de encuesta de usabilidad SUS/UX si aplica]`.

### 3.6 Metodología de desarrollo de software
De acuerdo con [PrepIA_Documentacion_Consolidada_v4_EDITABLE.docx](archivo_historico/PrepIA_Documentacion_Consolidada_v4_EDITABLE.docx), se adoptó una **metodología en cascada con entregables estructurados**, complementada en la fase constructiva por incrementos evolutivos (v3 → v4 → módulo Colombia y ATS → integración Gemini con respaldo local).

### 3.7 Fases del proyecto
1. **Análisis de requerimientos:** definición de RF01–RF26 y RNF.
2. **Diseño:** modelado relacional (34 tablas diseñadas en documentación v4; 27 clases ORM activas + 7 migraciones Alembic implementadas) y diseño de interfaz claro/oscuro.
3. **Desarrollo:** construcción de backend FastAPI, frontend React/TypeScript, OAuth Google, módulo Colombia/ATS y capa IA.
4. **Pruebas (QA):** ejecución de pruebas unitarias e integrales en `pytest` y verificación de endpoints e interfaz.
5. **Despliegue y documentación:** configuración Docker Compose, documentación técnica y consolidación académica.

---

## CAPÍTULO 4. ANÁLISIS DEL SISTEMA

### 4.1 Descripción del sistema propuesto
Plataforma web de tres paneles especializados (`/dashboard/candidate`, `/dashboard/company`, `/dashboard/admin`) respaldados por una API REST unificada (`/api/v1/*`) y base de datos PostgreSQL.

### 4.2 Identificación de usuarios
- **Candidato (`rol='usuario'`):** carga CV, completa hoja de vida estructurada, consulta vacantes, evalúa compatibilidad, postula, gestiona consentimiento IA y consulta notificaciones/recursos.
- **Empresa / Reclutador (`rol='reclutador'`):** administra perfil fiscal colombiano, publica vacantes, evalúa y compara candidatos con IA, gestiona etapas ATS y envía notificaciones.
- **Administrador (`rol='admin'` / `es_admin_principal=True`):** supervisa métricas globales, aprueba/rechaza vacantes, administra categorías y recursos, y asigna roles de forma segura.
- **Agente de Soporte (`rol='agente_soporte'`):** rol previsto en el modelo de usuarios para atención de tickets (`tickets_soporte`).

### 4.3 Requerimientos funcionales (Resumen RF01–RF26)
*(Basado en la Documentación Consolidada v4 y contrastado con el código real)*:
- **Autenticación y Seguridad (RF01–RF02):** registro, login JWT, OAuth Google y recuperación por código (✅ implementado).
- **Entrenamiento y Retroalimentación del Candidato (RF03–RF15):** perfilamiento, análisis de CV, chat contextual, simulador de entrevista en UI y recursos (✅ implementado en CV/chat/recursos; 🟡 módulo de ejecución de pruebas `sesiones_prueba` en fase de modelo BD).
- **Análisis de Comunicación (RF16):** lenguaje corporal y tono informativo (🟡 modelos `grabaciones_sesion` y `analisis_comunicacion` creados en BD; pendiente captura multimedia).
- **Plataforma de Selección (RF17–RF26):** empresas/reclutadores, vacantes, preguntas filtro, postulación con CV, análisis IA de CV, ranking y etapas ATS, decisión trazable, perfiles profesionales y consentimiento de privacidad (✅ implementado en backend y frontend; configuración de pruebas por vacante `vacante_ejercicios` en modelo BD).

### 4.4 Requerimientos no funcionales
Seguridad de contraseñas (`bcrypt`), tokens firmados (`HS256`), CORS restringido, accesibilidad visual claro/oscuro, anonimización de PII antes de IA externa y resiliencia ante fallos de red/proveedores LLM.

### 4.5 Reglas de negocio principales
1. Todo registro público ingresa con `rol='usuario'`; la promoción a `reclutador` o `admin` requiere intervención administrativa, y solo el **Administrador Principal** puede crear/modificar/suspender otros administradores.
2. Ninguna vacante creada por una empresa es visible públicamente hasta ser aprobada (`estado='abierta'`) por un administrador.
3. Si el proveedor externo de IA no está habilitado globalmente (`AI_ALLOW_EXTERNAL=false`), carece de consentimiento vigente del candidato o falla técnicamente, el sistema conmuta al motor local sin bloquear la postulación.
4. La IA nunca cambia el estado de una postulación a `aprobado` o `rechazado`; únicamente asigna puntaje, resume brechas y transiciona de `postulado` a `cv_analizado`.

### 4.6 Matriz de Trazabilidad (Muestra Representativa)

| Objetivo Esp. | Requerimiento | Funcionalidad Implementada | Caso de Prueba (`tests/`) | Estado |
|---|---|---|---|---|
| OE3 | RF01, RF02 | `auth.py`, `auth_service.py`, `GoogleAuthModal.tsx` | Verificación manual / E2E (pendiente suite `pytest` dedicada a auth) | Implementado |
| OE5 | RF17, RF18 | `empresa.py`, `schemas/empresa.py` (DIAN NIT/DV, Ley 1581) | `test_calcular_dv_nit_oficial_dian`, `test_empresa_profile_valida_dv_y_ley_1581`, `test_vacante_flexible_multi_industria_y_salario_cop` | Verificado (`pytest`) |
| OE4, OE5 | RF21, RF26 | `cv_ai_analyzer.py`, `llm_provider.py`, `candidato.py` | `test_anonimizar_texto_elimina_pii_y_atributos_protegidos`, `test_puede_enviar_a_ia_externa_respeta_ambas_condiciones`, `test_respaldo_ante_error_http_de_proveedor`, `test_analizar_postulacion_upsert_y_transicion_segura` | Verificado (`pytest`) |
| OE3, OE4 | RF23, RF24 | `empresa.py` (ATS, notas, ranking, comparador IA) | `test_overview_rankea_postulantes_y_calcula_sin_revisar`, `test_cambio_etapa_ats_guarda_notas_estrellas_y_notifica`, `test_reanalisis_individual_y_lote_pendientes_con_gemini_simulado`, `test_talento_match_y_comparar_candidatos_ia` | Verificado (`pytest`) |

---

## CAPÍTULO 5. DISEÑO DEL SISTEMA

### 5.1 Arquitectura lógica y física
Arquitectura de 3 niveles contenedorizada: cliente navegador (React/Vite o Nginx) → API REST (Uvicorn/FastAPI) → PostgreSQL 16 + almacenamiento local de archivos. *(Detalle completo y diagrama en [docs/arquitectura_y_uso.md](arquitectura_y_uso.md)).*

### 5.2 Diseño de la base de datos
El esquema evolucionó mediante 7 migraciones Alembic (`33e43b79d2aa` a `f9d2b4e6a103`) y se modela en 27 clases ORM agrupadas en 7 dominios: usuarios/sesiones, ejercicios/recursos, selección/ATS, sesiones de prueba, retroalimentación, privacidad/auditoría y soporte. `[VERIFICAR / COMPLETAR: adjuntar diagrama Entidad-Relación actualizado como figura en Anexos]`.

### 5.3 Diseño de interfaces y seguridad
Interfaz *responsive* con soporte de modo claro y oscuro (`ThemeToggle.tsx`), protección contra *prompt injection* mediante delimitadores XML `<vacante>` y `<hoja_de_vida>`, almacenamiento de refresh tokens únicamente mediante hash SHA-256 (`sesiones_auth`) y contraseñas con pre-hash SHA-256 + `bcrypt`.

---

## CAPÍTULO 6. DESARROLLO E IMPLEMENTACIÓN

Se implementaron los routers `/api/v1/auth` (incluyendo `/candidato`), `/api/v1/catalogos`, `/api/v1/empresa` y `/api/v1/admin`, junto con el cliente frontend `src/services/api.ts` y las vistas en `src/app/pages/`. Se destacan:
- **Extracción y previsualización de CV (`cv_service.py`, `candidato.py`, `render_cover.ps1`):** lectura de PDF con `pypdf`, lectura de XML interno para `.docx`, saneamiento de bytes nulos `\x00` antes de persistir en PostgreSQL y renderizado de portada PNG.
- **Capa LLM tolerante a fallos (`llm_provider.py`):** soporte unificado para `local`, `ollama`, `groq`, `gemini`, `openai` y `anthropic`, con lista de respaldo de modelos Gemini ante `HTTP 404/429/503` y reintentos controlados.
- **Control de versiones:** `[VERIFICAR / COMPLETAR: documentar URL del repositorio Git remoto y estrategia de ramas utilizada]`.

---

## CAPÍTULO 7. PRUEBAS Y VALIDACIÓN

### 7.1 Estrategia basada en pruebas de integración
Aplicando el modelo de [Pruebas-de-integracion.pdf](file:///C:/Users/monte/Downloads/Pruebas-de-integracion.pdf), cada interacción entre módulos se valida en tres niveles:
1. **Conectar:** invocación correcta entre router/servicio/proveedor o frontend/proxy Vite.
2. **Intercambiar:** consistencia de esquemas Pydantic (`AnalisisCVOutput`, `VacanteUpsertRequest`, `EmpresaProfileUpdateRequest`).
3. **Continuar:** transición de estados (`postulado` → `cv_analizado`), generación de notificaciones y degradación segura al motor local ante fallos externos.

### 7.2 Resultados de pruebas automatizadas observados
La ejecución de `pytest` sobre `backend/tests/` arrojó **17 pruebas aprobadas (`17 passed`)** en `test_ats_empresa.py` (5), `test_empresa_colombia.py` (5) y `test_ia_analisis_cv.py` (7), empleando SQLite en memoria y mocks HTTP sin consumo real de cuotas de API. *(Ver detalle completo en [docs/pruebas_y_errores.md](pruebas_y_errores.md)).*

### 7.3 Validación con usuarios y pruebas de campo
`[VERIFICAR / COMPLETAR: registrar resultados de pruebas funcionales E2E en navegador con PostgreSQL real, pruebas de usabilidad con reclutadores/candidatos piloto y encuestas de satisfacción]`.

---

## CAPÍTULO 8. RESULTADOS

- **Producto alcanzado:** plataforma web funcional con autenticación dual (credenciales y Google OAuth), 3 paneles diferenciados por rol, gestión normativa empresarial colombiana, análisis de CV con privacidad por diseño y tablero ATS con comparador IA.
- **Comparación inicial vs solución:** se pasó de un proceso manual sin trazabilidad ni evaluación homogénea a un flujo centralizado donde cada postulación almacena texto extraído, puntaje de afinidad, brechas, preguntas sugeridas, historial de decisiones y consentimientos auditables.
- **Validación cuantitativa en entorno real:** `[VERIFICAR / COMPLETAR: tiempos promedio de preselección antes vs después de PrepIA en pruebas piloto]`.

---

## CAPÍTULO 9. CONCLUSIONES Y RECOMENDACIONES

### 9.1 Conclusiones
1. La arquitectura desacoplada FastAPI + PostgreSQL + React/TypeScript permitió evolucionar PrepIA desde un simulador hacia un sistema ATS multi-industria manteniendo modularidad y tipado estricto.
2. El diseño de doble compuerta (configuración del servidor + consentimiento *append-only* del usuario) y anonimización previa demuestra que es posible aprovechar modelos LLM como Gemini reduciendo riesgos de privacidad.
3. La incorporación de un motor local determinístico como respaldo automático elimina puntos únicos de fallo frente a APIs externas de IA.

### 9.2 Recomendaciones y trabajo futuro
1. Integrar un servicio de ejecución aislada de código (ej. Judge0) conectado a las tablas ya existentes `sesiones_prueba`, `respuestas_sesion` y `resultados_ejecucion`.
2. Exponer endpoints REST y vistas para el banco de preguntas por vacante (`vacante_ejercicios`), módulo de soporte (`tickets_soporte`) y solicitudes formales de descarga/eliminación de datos (`solicitudes_privacidad`).
3. Ejecutar pruebas de integración *end-to-end* automatizadas (ej. con Playwright + PostgreSQL en Docker) y validar métricas de usabilidad con usuarios reales.

---

## REFERENCIAS BIBLIOGRÁFICAS

- Documentación interna del proyecto: *PrepIA — Documentación Consolidada Versión 4* (SENA, Ficha N°. 3233926, Malambo/Atlántico, 2025–2026).
- Guía académica: *Estructura y Tabla de Contenido para una Tesis de Grado de Software* (`Estructura_Tesis_Software.pdf`).
- Material formativo: Altamar, L. *Fundamentos de Software: Pruebas de integración* (`Pruebas-de-integracion.pdf`).
- Congreso de la República de Colombia. *Ley Estatutaria 1581 de 2012, por la cual se dictan disposiciones generales para la protección de datos personales*. `[VERIFICAR / COMPLETAR: formato APA/IEEE completo]`.
- `[VERIFICAR / COMPLETAR: agregar referencias oficiales de FastAPI, SQLAlchemy, PostgreSQL, React, Google Identity Services, Google Gemini API y literatura académica de ingeniería de software]`.

---

## ANEXOS SUGERIDOS

- Anexo A: Diccionario de datos y script SQL v4 ([PrepIA_tabla_entidad_relacion_v4.txt](archivo_historico/PrepIA_tabla_entidad_relacion_v4.txt)).
- Anexo B: Documentación técnica de arquitectura y endpoints ([docs/arquitectura_y_uso.md](arquitectura_y_uso.md)).
- Anexo C: Evidencias de pruebas y bitácora de errores ([docs/pruebas_y_errores.md](pruebas_y_errores.md)).
- Anexo D: Capturas del sistema en modo claro y oscuro `[VERIFICAR / COMPLETAR]`.
- Anexo E: Enlace al repositorio de código fuente `[VERIFICAR / COMPLETAR]`.
