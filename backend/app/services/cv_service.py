"""Servicio de análisis inteligente de Hoja de Vida (CV) para PrepIA.

Evalúa la idoneidad técnica del candidato para vacantes de desarrollo de software,
detecta habilidades, identifica brechas críticas (lo que le hace falta) y genera
consejos prácticos para maximizar su éxito al postularse a una oferta laboral.
"""
import io
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from typing import Any, Dict, List, Optional
import httpx
import pypdf


# Diccionario de competencias y palabras clave para tecnología y software
TECH_KEYWORDS = {
    "lenguajes": [
        "python", "javascript", "typescript", "java", "c#", "c++", "go", "golang", "php", "ruby", "sql", "html", "css"
    ],
    "backend": [
        "fastapi", "django", "flask", "node.js", "nodejs", "express", "spring boot", "spring", "asp.net", ".net", "laravel"
    ],
    "frontend": [
        "react", "react.js", "vue", "vue.js", "angular", "next.js", "nextjs", "tailwind", "bootstrap", "redux"
    ],
    "bases_datos": [
        "postgresql", "postgres", "mysql", "sql server", "sqlite", "mongodb", "redis", "oracle", "mariadb"
    ],
    "devops_herramientas": [
        "docker", "kubernetes", "git", "github", "gitlab", "ci/cd", "aws", "azure", "gcp", "linux", "nginx"
    ],
    "metodologias": [
        "scrum", "agile", "tdd", "kanban", "rest", "restful", "apis", "api rest", "microservicios", "clean code"
    ]
}


def _sanitize_extracted_text(value: str) -> str:
    """Elimina bytes nulos y caracteres de control inválidos para PostgreSQL."""
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", value)
    return cleaned.strip()


def extract_text_from_file_bytes(file_bytes: bytes, filename: str) -> str:
    """Extrae texto plano desde bytes de un archivo (PDF, DOCX, TXT, etc.)."""
    lower_name = (filename or "").lower()
    extracted_text = ""

    if lower_name.endswith(".pdf"):
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text = [page.extract_text() or "" for page in reader.pages]
            extracted_text = "\n".join(pages_text).strip()
        except Exception:
            extracted_text = ""
    elif lower_name.endswith(".docx"):
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                xml_bytes = zf.read("word/document.xml")
            root = ET.fromstring(xml_bytes)
            paragraphs = []
            for p in root.iter():
                if p.tag.endswith("}p"):
                    texts = [t.text for t in p.iter() if t.tag.endswith("}t") and t.text]
                    if texts:
                        paragraphs.append("".join(texts))
            extracted_text = "\n".join(paragraphs).strip()
        except Exception:
            extracted_text = ""
    elif not lower_name.endswith(".doc"):
        for enc in ("utf-8", "latin-1", "cp1252"):
            try:
                extracted_text = file_bytes.decode(enc).strip()
                break
            except UnicodeDecodeError:
                continue

    return _sanitize_extracted_text(extracted_text)


def analyze_cv_content(
    text: str,
    filename: str = "HojaDeVida.pdf",
    target_vacancy: Optional[str] = None
) -> Dict[str, Any]:
    """Analiza en profundidad el contenido del CV y entrega diagnóstico completo."""
    clean_text = text.lower()

    # 1. Detección de habilidades técnicas presentes
    habilidades_encontradas: List[str] = []
    categorias_detectadas: Dict[str, List[str]] = {}

    for categoria, lista_palabras in TECH_KEYWORDS.items():
        coincidencias = []
        for kw in lista_palabras:
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, clean_text):
                coincidencias.append(kw.capitalize() if len(kw) > 3 else kw.upper())
                habilidades_encontradas.append(kw.capitalize() if len(kw) > 3 else kw.upper())
        if coincidencias:
            categorias_detectadas[categoria] = coincidencias

    # 2. Análisis de Secciones Esenciales
    tiene_contacto = bool(re.search(r'[\w\.-]+@[\w\.-]+', clean_text))
    tiene_telefono = bool(re.search(r'(\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3}[\s-]?\d{4}', clean_text))
    tiene_github = "github.com" in clean_text or "gitlab.com" in clean_text or "portafolio" in clean_text or "portfolio" in clean_text
    tiene_linkedin = "linkedin.com" in clean_text

    tiene_resumen = bool(re.search(r'\b(resumen|perfil|acerca de|sobre mí|profile|summary)\b', clean_text))
    tiene_experiencia = bool(re.search(r'\b(experiencia|trayectoria|laboral|trabajo|experience|proyectos)\b', clean_text))
    tiene_educacion = bool(re.search(r'\b(educación|formación|estudios|universidad|sena|grado|education)\b', clean_text))

    # Detección de métricas cuantificables (%, números de mejora, optimizaciones)
    tiene_metricas = bool(re.search(r'\b(\d+%\s*|\d+\s*(usuarios|peticiones|requests|transacciones|segundos|días|semanas))\b', clean_text))
    tiene_pruebas = bool(re.search(r'\b(test|tests|pruebas unitarias|pytest|jest|tdd|unitarias)\b', clean_text))
    tiene_docker = "docker" in clean_text or "kubernetes" in clean_text or "ci/cd" in clean_text

    # 3. Cálculo de Puntuación de Idoneidad (0 - 100)
    score = 0

    # Stack técnico detectado (hasta 35 pts)
    cant_skills = len(set(habilidades_encontradas))
    if cant_skills >= 8:
        score += 35
    elif cant_skills >= 5:
        score += 28
    elif cant_skills >= 3:
        score += 20
    else:
        score += max(cant_skills * 5, 5)

    # Estructura fundamental (hasta 20 pts)
    if tiene_contacto: score += 5
    if tiene_resumen: score += 5
    if tiene_experiencia: score += 5
    if tiene_educacion: score += 5

    # Enlaces a proyectos y portafolio (hasta 15 pts)
    if tiene_github: score += 10
    if tiene_linkedin: score += 5

    # Calidad de redacción técnica y logros cuantificables (hasta 20 pts)
    if tiene_metricas: score += 10
    if tiene_pruebas: score += 5
    if tiene_docker: score += 5

    # Extensión y densidad adecuada (hasta 10 pts)
    words_count = len(text.split())
    if 150 <= words_count <= 900:
        score += 10
    elif words_count > 900:
        score += 6
    else:
        score += 4

    score = min(max(score, 20), 98)

    # 4. Veredicto de Aptitud
    es_apto = score >= 70
    if score >= 85:
        nivel_aptitud = "Altamente Competitivo para Vacantes Tech"
        veredicto_color = "green"
    elif score >= 70:
        nivel_aptitud = "Apto para Postulación (Con Oportunidades Clave)"
        veredicto_color = "blue"
    elif score >= 50:
        nivel_aptitud = "En Desarrollo — Requiere Ajustes Antes de Postular"
        veredicto_color = "amber"
    else:
        nivel_aptitud = "Requiere Reestructuración Fundamental"
        veredicto_color = "red"

    # 5. Puntos Fuertes Identificados
    puntos_fuertes: List[str] = []
    if "python" in clean_text or "fastapi" in clean_text:
        puntos_fuertes.append("Stack backend moderno con Python y FastAPI muy solicitado en la industria.")
    if "react" in clean_text or "typescript" in clean_text:
        puntos_fuertes.append("Conocimientos sólidos en desarrollo frontend contemporáneo (React / TS).")
    if "postgresql" in clean_text or "sql" in clean_text:
        puntos_fuertes.append("Manejo de bases de datos relacionales para persistencia estructurada.")
    if tiene_github:
        puntos_fuertes.append("Inclusión de enlaces a código fuente y portafolio verificable en GitHub.")
    if tiene_resumen:
        puntos_fuertes.append("Cuenta con perfil profesional definido que facilita la lectura a reclutadores.")
    if tiene_metricas:
        puntos_fuertes.append("Presenta resultados cuantitativos que evidencian impacto en proyectos previos.")
    if not puntos_fuertes:
        puntos_fuertes.append("Estructura clara de datos personales y disposición para el aprendizaje continuo.")

    # 6. Elementos Faltantes (Gaps / Oportunidades para Ser Mejor Aspirante)
    elementos_faltantes: List[str] = []
    if not tiene_github:
        elementos_faltantes.append("Falta enlace a tu perfil de GitHub o portafolio web con proyectos funcionales demostrables.")
    if not tiene_metricas:
        elementos_faltantes.append("Faltan logros cuantificables en la experiencia (ej: 'reduje tiempos de respuesta un 30%' o 'desarrollé 5 módulos').")
    if not tiene_pruebas:
        elementos_faltantes.append("No se mencionan pruebas unitarias (Pytest, Jest) ni aseguramiento de calidad de software (TDD).")
    if not tiene_docker:
        elementos_faltantes.append("Falta evidencia de contenedores (Docker) o conceptos de integración continua (CI/CD).")
    if not tiene_linkedin:
        elementos_faltantes.append("Se recomienda añadir el enlace actualizado a tu perfil profesional de LinkedIn.")
    if not tiene_telefono:
        elementos_faltantes.append("No se detectó un número telefónico de contacto rápido para agendamiento de entrevistas.")

    if not elementos_faltantes:
        elementos_faltantes.append("Tu CV es muy completo. Considera añadir certificaciones recientes del sector tecnológico.")

    # 7. Consejos Accionables para Postularse
    consejos: List[str] = [
        "Alinea las palabras clave de tu resumen con los términos exactos de la vacante antes de enviar cada postulación.",
        "Aplica la estructura STAR (Situación, Tarea, Acción, Resultado) para redactar cada proyecto o empleo anterior.",
        "Asegúrate de que tus repositorios en GitHub cuenten con un README bien documentado y captura visual de la aplicación.",
        "Prepara tu discurso de presentación destacando cómo resuelves problemas concretos para la empresa."
    ]

    # 8. Vacantes Compatibles Recomendadas (respaldo si no se pasan vacantes reales de BD)
    vacantes_compatibles = [
        {
            "titulo": "Desarrollador Fullstack Python & React",
            "empresa": "TechNova Solutions",
            "match": min(score + 4, 98),
            "modalidad": "Remoto"
        }
    ]

    return {
        "es_apto": es_apto,
        "score": score,
        "nivel_aptitud": nivel_aptitud,
        "veredicto_color": veredicto_color,
        "nombre_archivo": filename,
        "total_palabras": words_count,
        "habilidades_detectadas": list(set(habilidades_encontradas)),
        "categorias_detectadas": categorias_detectadas,
        "puntos_fuertes": puntos_fuertes,
        "elementos_faltantes": elementos_faltantes,
        "consejos_para_postularse": consejos,
        "vacantes_compatibles": vacantes_compatibles,
    }


def build_real_vacancy_matches(cv_text: str, vacancies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Evalúa un CV real contra las vacantes reales almacenadas en PostgreSQL."""
    if not vacancies:
        return []

    ranked: List[Dict[str, Any]] = []
    for vac in vacancies:
        if cv_text and len(cv_text.strip()) >= 15:
            eval_res = evaluate_cv_for_vacancy(
                cv_text=cv_text,
                vacancy_title=vac.get("titulo", "Vacante"),
                vacancy_requirements_raw=vac.get("requisitos_raw") or "",
                company_name=vac.get("empresa", "Empresa"),
            )
            match_score = eval_res["match_score"]
            cumplidos = eval_res["requisitos_cumplidos"]
            faltantes = eval_res["requisitos_faltantes"]
        else:
            match_score = 0
            cumplidos = []
            faltantes = vac.get("requisitos") or []

        ranked.append({
            "id": vac.get("id"),
            "titulo": vac.get("titulo", "Vacante"),
            "empresa": vac.get("empresa", "Empresa"),
            "sector": vac.get("sector", ""),
            "modalidad": vac.get("modalidad", "Remoto"),
            "puntaje_minimo": vac.get("puntaje_minimo", 70.0),
            "estado": vac.get("estado", "abierta"),
            "match": match_score,
            "requisitos_cumplidos": cumplidos,
            "requisitos_faltantes": faltantes,
        })

    ranked.sort(key=lambda item: item["match"], reverse=True)
    return ranked


def _call_external_llm_if_configured(
    user_message: str,
    context_payload: Dict[str, Any],
    history: Optional[List[Dict[str, str]]] = None,
) -> Optional[str]:
    """Si hay proveedor IA configurado en .env, responde con un LLM real usando datos de PostgreSQL."""
    try:
        from app.core.config import settings
        from app.services.llm_provider import completar_con_proveedor
    except Exception:
        return None

    system_prompt = (
        "Eres el Asistente IA de PrepIA. Responde siempre en español, de forma natural, conversacional, clara y accionable, "
        "usando los datos reales de PostgreSQL incluidos en el contexto JSON. "
        "No inventes empresas, puntajes ni postulaciones que no estén en el contexto. "
        "Si falta algún dato (ej. no ha subido CV, no tiene teléfono o no tiene postulaciones), indícalo con exactitud. "
        "Evita repetir plantillas rígidas; responde directamente a lo que el usuario pregunta.\n\n"
        f"CONTEXTO REAL DE POSTGRESQL:\n{json.dumps(context_payload, ensure_ascii=False, default=str)}"
    )

    clean_history = (history or [])[-6:]
    history_lines = []
    for turn in clean_history:
        who = "Asistente" if turn.get("sender") == "bot" else "Candidato"
        text_val = (turn.get("text") or "").strip()
        if text_val:
            history_lines.append(f"{who}: {text_val}")

    user_prompt = user_message
    if history_lines:
        user_prompt = "Historial reciente:\n" + "\n".join(history_lines) + f"\n\nPregunta actual del candidato:\n{user_message}"

    provider = (settings.AI_PROVIDER or "local").strip().lower()
    candidates_to_try = []
    if provider != "local":
        candidates_to_try.append(provider)
    if settings.GEMINI_API_KEY and "gemini" not in candidates_to_try:
        candidates_to_try.append("gemini")
    if settings.GROQ_API_KEY and "groq" not in candidates_to_try:
        candidates_to_try.append("groq")
    if settings.OPENAI_API_KEY and "openai" not in candidates_to_try:
        candidates_to_try.append("openai")
    if settings.ANTHROPIC_API_KEY and "anthropic" not in candidates_to_try:
        candidates_to_try.append("anthropic")

    for prov in candidates_to_try:
        try:
            answer = completar_con_proveedor(prov, system_prompt, user_prompt)
            if answer:
                return answer
        except Exception:
            continue

    return None


def _generate_technical_question_for_skills(skills: List[str], specialty: str) -> str:
    """Genera una pregunta técnica adaptada al stack real detectado en el CV o perfil."""
    lower_skills = {s.lower() for s in skills}
    if "react" in lower_skills or "typescript" in lower_skills or "javascript" in lower_skills:
        return (
            "En una aplicación **React / TypeScript** con múltiples filtros en tiempo real, "
            "¿cómo evitarías renderizados innecesarios y qué estrategia usarías para manejar el estado asíncrono de la API?"
        )
    if "fastapi" in lower_skills or "python" in lower_skills or "django" in lower_skills:
        return (
            "En una API con **Python / FastAPI** conectada a **PostgreSQL**, "
            "¿cómo detectarías y optimizarías una consulta N+1 en un endpoint muy concurrido?"
        )
    if "postgresql" in lower_skills or "sql" in lower_skills or "mysql" in lower_skills:
        return (
            "Si una consulta con varios `JOIN` y filtros `WHERE` en **PostgreSQL** empieza a tardar varios segundos, "
            "¿qué pasos seguirías con `EXPLAIN ANALYZE` e índices para optimizarla?"
        )
    if "docker" in lower_skills or "aws" in lower_skills or "kubernetes" in lower_skills:
        return (
            "¿Cómo estructurarías un `Dockerfile` multi-stage para reducir el tamaño de imagen de una app web "
            "y evitar exponer credenciales en las capas?"
        )
    return (
        f"Para un rol en **{specialty or 'Desarrollo de Software'}**, cuéntame usando el método **STAR** "
        "(Situación, Tarea, Acción, Resultado) sobre un problema técnico complejo que hayas resuelto recientemente."
    )


def generate_dynamic_chat_response(
    user_message: str,
    context: Dict[str, Any],
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """Responde consultas dinámicas sobre CV, vacantes reales, postulaciones, perfil y entrevistas en PostgreSQL."""
    llm_answer = _call_external_llm_if_configured(user_message, context, history)
    if llm_answer:
        return {"respuesta": llm_answer, "fuente": "llm+postgresql", "tipo_consulta": "ia_generativa"}

    msg = user_message.lower().strip()
    profile = context.get("perfil") or {}
    cv_data = context.get("cv")
    cv_raw_text = (context.get("cv_texto") or "").lower()
    vacancies = context.get("vacantes_evaluadas") or []
    applications = context.get("postulaciones") or []
    sessions = context.get("sesiones") or []

    first_name = (profile.get("nombre") or "Candidato").split()[0]
    has_cv = bool(cv_data and cv_data.get("score"))
    skills = cv_data.get("habilidades_detectadas", []) if cv_data else []

    # 1. Consulta sobre perfil, datos guardados o completitud en BD
    if any(k in msg for k in ["perfil", "completitud", "porcentaje", "telefono", "teléfono", "correo", "email", "github", "linkedin", "mis datos"]):
        faltantes_perfil = []
        if not profile.get("telefono"):
            faltantes_perfil.append("Teléfono de contacto (+20%)")
        if not has_cv:
            faltantes_perfil.append("Hoja de Vida (+40%)")
        if not profile.get("linkedin_url") and not profile.get("github_url"):
            faltantes_perfil.append("Enlaces de LinkedIn o GitHub")

        resp = (
            f"📋 **Estado real de tu perfil en PostgreSQL ({profile.get('completitud', 0)}%):**\n"
            f"• **Nombre:** {profile.get('nombre') or 'Sin configurar'}\n"
            f"• **Correo:** {profile.get('email') or 'Sin configurar'}\n"
            f"• **Teléfono:** {profile.get('telefono') or 'Pendiente'}\n"
            f"• **Ciudad / Especialidad:** {profile.get('ciudad') or 'Sin definir'} — {profile.get('especialidad') or 'Sin definir'} ({profile.get('nivel_experiencia') or 'Sin definir'})\n"
            f"• **Hoja de Vida:** {cv_data.get('nombre_archivo') if has_cv else 'No cargada aún'}\n"
        )
        if faltantes_perfil:
            resp += "\n⚠️ **Para completar tu perfil te falta:** " + ", ".join(faltantes_perfil) + "."
        else:
            resp += "\n✅ Tienes todos los datos clave y tu CV registrados en PostgreSQL."
        return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "perfil"}

    # 2. Consulta sobre postulaciones reales del candidato
    if any(k in msg for k in ["postulacion", "postulación", "postulaciones", "aplicacion", "aplicación", "aplicaciones", "postule", "postulé", "apliqué", "estado"]):
        if not applications:
            resp = (
                f"Aún no tienes postulaciones registradas en PostgreSQL, {first_name}.\n\n"
                f"Actualmente hay **{len(vacancies)} vacantes abiertas** disponibles"
            )
            if has_cv and vacancies:
                top = vacancies[0]
                resp += f", y tu mayor compatibilidad es con **{top['titulo']}** en *{top['empresa']}* (**{top['match']}% de match**)."
            elif not has_cv:
                resp += ". Sube tu Hoja de Vida en **Resumen** para poder postularte."
            return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "postulaciones"}

        resp = f"📨 **Tus postulaciones reales en PostgreSQL ({len(applications)}):**\n\n"
        for app in applications:
            resp += (
                f"• **{app['position']}** en *{app['company']}* — "
                f"Estado: **{app['status']}** | Match CV: **{app['match']}%** | Fecha: {app['date']}\n"
            )
        return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "postulaciones"}

    # 3. Consulta sobre historial de entrevistas o sesiones de prueba reales
    if any(k in msg for k in ["mis entrevistas", "historial", "sesiones", "pruebas realizadas", "mis pruebas"]):
        if not sessions:
            resp = (
                f"No tienes sesiones de prueba o entrevistas registradas aún en PostgreSQL, {first_name}. "
                "Puedes practicar desde la pestaña **Simulador** o preguntar aquí mismo *'simula una pregunta técnica'*."
            )
        else:
            resp = f"🎯 **Tu historial de sesiones en PostgreSQL ({len(sessions)}):**\n\n"
            for s in sessions[:5]:
                puntaje_txt = f"{s['puntaje']}/100" if s.get("puntaje") is not None else "Sin calificar"
                resp += f"• Sesión #{s['id']} ({s['modo']}) — Estado: **{s['estado']}** | Puntaje: **{puntaje_txt}**\n"
        return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "sesiones"}

    # 4. Consulta específica por una vacante o empresa real existente en PostgreSQL
    matched_vacancy = None
    for vac in vacancies:
        titulo_tokens = [t for t in re.findall(r"[a-z0-9áéíóúñ]+", vac["titulo"].lower()) if len(t) > 3]
        empresa_tokens = [t for t in re.findall(r"[a-z0-9áéíóúñ]+", vac["empresa"].lower()) if len(t) > 3]
        if any(tok in msg for tok in empresa_tokens) or sum(1 for tok in titulo_tokens if tok in msg) >= 2:
            matched_vacancy = vac
            break

    if matched_vacancy:
        if not has_cv:
            reqs = "\n".join(f"• {r}" for r in (matched_vacancy.get("requisitos_faltantes") or [])[:5])
            resp = (
                f"📌 Encontré la vacante **{matched_vacancy['titulo']}** en *{matched_vacancy['empresa']}* "
                f"({matched_vacancy['modalidad']}, puntaje mínimo {matched_vacancy['puntaje_minimo']}%).\n\n"
                f"Como aún no tienes Hoja de Vida cargada en PostgreSQL, no puedo calcular tu match exacto. "
                f"Estos son los requisitos que pide el empleador:\n{reqs}"
            )
        else:
            cumplidos = matched_vacancy.get("requisitos_cumplidos") or []
            faltantes = matched_vacancy.get("requisitos_faltantes") or []
            resp = (
                f"🎯 **Diagnóstico para {matched_vacancy['titulo']} ({matched_vacancy['empresa']}):**\n"
                f"• **Compatibilidad actual:** **{matched_vacancy['match']}%** (mínimo sugerido: {matched_vacancy['puntaje_minimo']}%)\n"
                f"• **Modalidad:** {matched_vacancy['modalidad']}\n\n"
            )
            if cumplidos:
                resp += "✅ **Requisitos que cumples:**\n" + "\n".join(f"• {r}" for r in cumplidos) + "\n\n"
            if faltantes:
                resp += "⚠️ **Requisitos que te faltan o no aparecen en tu CV:**\n" + "\n".join(f"• {r}" for r in faltantes)
            else:
                resp += "✅ Cumples con todos los requisitos clave de esta vacante."
        return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "vacante_especifica"}

    # 5. Consulta sobre vacantes disponibles o filtro por modalidad / tecnología
    if any(k in msg for k in ["vacante", "vacantes", "empleo", "empleos", "trabajo", "oferta", "ofertas", "remoto", "hibrido", "híbrido", "presencial", "postular"]):
        filtered = vacancies
        modalidad_filtro = None
        if "remoto" in msg:
            modalidad_filtro = "remoto"
        elif "hibrido" in msg or "híbrido" in msg:
            modalidad_filtro = "hibrido"
        elif "presencial" in msg:
            modalidad_filtro = "presencial"

        if modalidad_filtro:
            filtered = [v for v in vacancies if modalidad_filtro in (v.get("modalidad") or "").lower()]

        if not filtered:
            return {
                "respuesta": f"No encontré vacantes abiertas con ese filtro en PostgreSQL (total abiertas: {len(vacancies)}).",
                "fuente": "postgresql",
                "tipo_consulta": "vacantes",
            }

        resp = f"💼 **Vacantes abiertas en PostgreSQL ({len(filtered)}):**\n\n"
        for v in filtered:
            if has_cv:
                resp += f"• **{v['titulo']}** — *{v['empresa']}* ({v['modalidad']}) → **{v['match']}% de match** (mín. {v['puntaje_minimo']}%)\n"
            else:
                resp += f"• **{v['titulo']}** — *{v['empresa']}* ({v['modalidad']}) — mín. {v['puntaje_minimo']}%\n"
        if has_cv:
            resp += "\n💡 Puedes preguntarme por el nombre de cualquiera de estas empresas o cargos para ver exactamente qué requisitos cumples y cuáles te faltan."
        else:
            resp += "\n💡 Sube tu Hoja de Vida para calcular el % de compatibilidad con cada una."
        return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "vacantes"}

    # 6. Pregunta si el CV incluye una tecnología específica o qué habilidades tiene
    all_known_tech = [kw for group in TECH_KEYWORDS.values() for kw in group]
    asked_tech = [kw for kw in all_known_tech if re.search(r"\b" + re.escape(kw) + r"\b", msg)]
    if asked_tech and has_cv:
        presentes = [t for t in asked_tech if re.search(r"\b" + re.escape(t) + r"\b", cv_raw_text)]
        ausentes = [t for t in asked_tech if t not in presentes]
        resp = f"🔎 **Verificación en tu Hoja de Vida ({cv_data.get('nombre_archivo')}):**\n"
        if presentes:
            resp += "• ✅ Sí aparece mencionado: **" + ", ".join(presentes) + "**.\n"
        if ausentes:
            resp += "• ❌ No aparece detectado en tu CV: **" + ", ".join(ausentes) + "**.\n"
        return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "verificacion_habilidad"}

    if any(k in msg for k in ["habilidad", "habilidades", "tecnologia", "tecnologías", "stack", "skills", "detectaste"]) and has_cv:
        cats = cv_data.get("categorias_detectadas") or {}
        if not skills:
            resp = f"En tu CV **{cv_data.get('nombre_archivo')}** no detecté palabras clave técnicas todavía. Asegúrate de listar tus lenguajes, frameworks y bases de datos."
        else:
            resp = f"🛠️ **Habilidades detectadas en tu CV ({len(skills)}):**\n\n"
            for cat, items in cats.items():
                resp += f"• **{cat.replace('_', ' ').title()}:** {', '.join(items)}\n"
        return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "habilidades"}

    # 7. Simulación de pregunta de entrevista adaptada al stack real del candidato
    if any(k in msg for k in ["entrevista", "pregunta", "preguntas", "simular", "practicar"]):
        pregunta = _generate_technical_question_for_skills(skills, profile.get("especialidad") or "")
        stack_desc = ", ".join(skills[:5]) if skills else (profile.get("especialidad") or "tu área profesional")
        resp = (
            f"🎙️ **Pregunta técnica adaptada a tu perfil ({stack_desc}):**\n\n"
            f"{pregunta}\n\n"
            "Escríbeme tu respuesta y te daré retroalimentación."
        )
        return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "entrevista"}

    # 8. Si aún no tiene CV cargado y pregunta por el CV
    if not has_cv:
        resp = (
            f"Hola {first_name}. Todavía no tienes una Hoja de Vida guardada en PostgreSQL, "
            "por eso aún no puedo auditar tu CV.\n\n"
            "Mientras la subes en **Resumen**, también puedes consultarme por:\n"
            f"• **Vacantes abiertas** ({len(vacancies)} disponibles en BD)\n"
            f"• **Estado de tu perfil** ({profile.get('completitud', 0)}% completado)\n"
            "• **Preguntas de práctica** para entrevista"
        )
        return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "sin_cv"}

    # 9. Auditoría del CV (bien/mal, qué falta, puntaje, o consulta general)
    score = cv_data.get("score", 0)
    es_apto = cv_data.get("es_apto", False)
    nivel = cv_data.get("nivel_aptitud", "En Evaluación")
    faltantes = cv_data.get("elementos_faltantes", [])
    fuertes = cv_data.get("puntos_fuertes", [])

    if any(k in msg for k in ["falta", "faltan", "faltante", "mejorar", "corregir", "gaps"]):
        resp = f"🚀 **Oportunidades de mejora en `{cv_data.get('nombre_archivo')}` (Puntaje {score}/100):**\n\n"
        for idx, ef in enumerate(faltantes, 1):
            resp += f"**{idx}.** {ef}\n"
        if vacancies:
            top = vacancies[0]
            if top.get("requisitos_faltantes"):
                resp += f"\n📌 Para la vacante mejor alineada (**{top['titulo']}** en *{top['empresa']}*, {top['match']}% match), te falta evidenciar: {', '.join(top['requisitos_faltantes'][:2])}."
        return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "gaps_cv"}

    if any(k in msg for k in ["puntaje", "puntuacion", "puntuación", "calificacion", "calificación", "score", "subir", "puntos"]):
        resp = (
            f"📊 **Puntaje actual de tu CV `{cv_data.get('nombre_archivo')}`: {score}/100** (*{nivel}*)\n\n"
            f"• **Extensión analizada:** {cv_data.get('total_palabras', 0)} palabras\n"
            f"• **Tecnologías detectadas ({len(skills)}):** {', '.join(skills[:8]) if skills else 'Ninguna detectada'}\n\n"
            "🔧 **Qué sumar para subir tu puntaje:**\n"
        )
        for ef in faltantes[:3]:
            resp += f"• {ef}\n"
        return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "puntaje_cv"}

    # Respuesta de diagnóstico completo basada en datos reales del CV + mejor vacante en BD
    veredicto = "✅ Tu CV tiene buena base técnica" if es_apto else "⚠️ Tu CV necesita refuerzos antes de postularte"
    resp = (
        f"**{veredicto}** — `{cv_data.get('nombre_archivo')}` (**{score}/100** · {len(skills)} habilidades detectadas).\n\n"
        f"🌟 **Fortaleza principal:** {fuertes[0] if fuertes else 'Estructura básica presente'}\n"
        f"🚨 **Principal punto a mejorar:** {faltantes[0] if faltantes else 'Añadir certificaciones recientes'}\n"
    )
    if vacancies:
        top = vacancies[0]
        resp += f"\n💼 **Mejor coincidencia actual en BD:** *{top['titulo']}* en **{top['empresa']}** (**{top['match']}% de match**)."
    resp += "\n\nPuedes consultarme por tus **habilidades**, **vacantes abiertas**, **requisitos de una empresa**, **mis postulaciones** o **estado de mi perfil**."
    return {"respuesta": resp, "fuente": "postgresql", "tipo_consulta": "auditoria_cv"}


def generate_cv_chat_response(
    user_message: str,
    cv_data: Optional[Dict[str, Any]],
    candidate_name: str = "Candidato"
) -> str:
    """Wrapper compatible hacia atrás usando el nuevo motor dinámico."""
    res = generate_dynamic_chat_response(
        user_message=user_message,
        context={
            "perfil": {"nombre": candidate_name, "completitud": 40},
            "cv": cv_data,
            "cv_texto": "",
            "vacantes_evaluadas": [],
            "postulaciones": [],
            "sesiones": [],
        },
    )
    return res["respuesta"]


def evaluate_cv_for_vacancy(
    cv_text: str,
    vacancy_title: str,
    vacancy_requirements_raw: str,
    company_name: str = "Empresa"
) -> Dict[str, Any]:
    """Compara el texto real de la hoja de vida con los requerimientos específicos del empleador.
    
    Retorna los requisitos que el candidato sí cumple, los que le faltan para esta vacante,
    el porcentaje de compatibilidad real y recomendaciones específicas.
    """
    clean_cv = cv_text.lower()

    raw_lines = [
        line.strip().lstrip("•-*").strip()
        for line in vacancy_requirements_raw.splitlines()
        if line.strip() and len(line.strip().lstrip("•-*").strip()) > 3
    ]

    if not raw_lines:
        raw_lines = [
            "Conocimientos en el stack tecnológico solicitado",
            "Buenas prácticas de desarrollo y control de versiones",
            "Disponibilidad y datos de contacto actualizados"
        ]

    requisitos_cumplidos: List[str] = []
    requisitos_faltantes: List[str] = []

    stopwords = {
        "dominio", "experiencia", "manejo", "conocimientos", "habilidades",
        "nivel", "avanzado", "intermedio", "basico", "para", "con", "del",
        "las", "los", "una", "uno", "que", "menos", "años", "año", "trabajo"
    }

    for req in raw_lines:
        req_clean = req.lower()
        words = re.findall(r'[a-zA-Záéíóúñ#+]{3,}', req_clean)
        meaningful_words = [w for w in words if w not in stopwords]

        cumple = False
        if meaningful_words:
            for w in meaningful_words:
                if re.search(r'\b' + re.escape(w) + r'\b', clean_cv):
                    cumple = True
                    break
        else:
            cumple = True

        if cumple:
            requisitos_cumplidos.append(req)
        else:
            requisitos_faltantes.append(req)

    total_reqs = len(raw_lines)
    match_score = int(round((len(requisitos_cumplidos) / max(total_reqs, 1)) * 100))
    match_score = min(max(match_score, 20), 98)
    es_apto = match_score >= 60

    consejos = []
    if requisitos_faltantes:
        consejos.append(f"El empleador en {company_name} requiere específicamente: '{requisitos_faltantes[0]}'. Si tienes conocimientos o proyectos personales en esa área, destácalos en tu postulación.")
    if "github" in clean_cv or "portafolio" in clean_cv:
        consejos.append("Tu inclusión de proyectos verificables en GitHub te da ventaja competitiva frente a otros candidatos.")
    else:
        consejos.append("Añadir un enlace a tu GitHub o portafolio web aumentará la probabilidad de que el empleador te convoque a la entrevista técnica.")

    return {
        "vacante_titulo": vacancy_title,
        "empresa": company_name,
        "match_score": match_score,
        "es_apto": es_apto,
        "requisitos_cumplidos": requisitos_cumplidos,
        "requisitos_faltantes": requisitos_faltantes,
        "consejos_vacante": consejos,
        "total_requisitos": total_reqs
    }


