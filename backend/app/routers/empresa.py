"""Router de empresa / reclutador (Colombia): perfil, vacantes flexibles y seguimiento ATS de postulantes."""
from datetime import datetime, timezone
import json
import mimetypes
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, text
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import require_roles
from app.models.privacidad import HistorialConsentimiento
from app.models.seleccion import (
    DecisionPostulacion,
    Empresa,
    HojaDeVida,
    Notificacion,
    Postulacion,
    Vacante,
)
from app.models.usuarios import Usuario
from app.schemas.empresa import (
    ATS_STAGE_LABELS,
    ATS_STAGE_TO_ESTADO,
    AnalizarPendientesRequest,
    CompararCandidatosRequest,
    EmpresaProfileUpdateRequest,
    EvaluarTalentoMatchRequest,
    NitCalcularRequest,
    PostulacionATSUpdateRequest,
    VacanteEstadoRequest,
    VacanteUpsertRequest,
    build_combined_requirements_text,
    build_salary_display,
    calcular_dv_nit,
    parse_analisis_cv,
    parse_json_idiomas,
    parse_json_list_str,
    parse_json_preguntas,
    parse_json_respuestas,
    serialize_company_profile,
)
from app.services import cv_ai_analyzer, cv_service

router = APIRouter()
LOGO_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "logos"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _resolve_empresa(usuario: Usuario, db: Session) -> Optional[Empresa]:
    if usuario.empresa_id:
        return db.query(Empresa).filter(Empresa.id == usuario.empresa_id).first()
    if usuario.rol == "admin":
        return db.query(Empresa).order_by(Empresa.id.asc()).first()
    return None


def _extract_education_level(perfil_cv_json: Any, cv_text: Optional[str] = None) -> str:
    """Infiere el nivel educativo más alto del candidato desde su perfil estructurado o texto del CV."""
    raw_obj = perfil_cv_json
    if isinstance(raw_obj, str):
        try:
            raw_obj = json.loads(raw_obj)
        except Exception:
            raw_obj = {}
    estudios_txt = ""
    if isinstance(raw_obj, dict) and isinstance(raw_obj.get("estudios"), list):
        estudios_txt = " ".join(
            f"{e.get('titulo', '')} {e.get('nivel', '')} {e.get('institucion', '')}"
            for e in raw_obj["estudios"]
            if isinstance(e, dict)
        ).lower()
    hay = f"{estudios_txt} {(cv_text or '').lower()}"
    if any(k in hay for k in ("maestría", "maestria", "especialización", "especializacion", "posgrado", "doctorado", "mba")):
        return "Posgrado"
    if any(k in hay for k in ("ingenier", "profesional", "pregrado", "licenciad", "universitari")):
        return "Profesional"
    if any(k in hay for k in ("tecnólogo", "tecnologo", "tecnología", "tecnologia en")):
        return "Tecnólogo"
    if any(k in hay for k in ("técnico", "tecnico", "sena")):
        return "Técnico"
    if "bachiller" in hay:
        return "Bachiller"
    return "No especificado"


def _serialize_company_vacancy(v: Vacante, postulados_count: int) -> dict:
    reqs_list = [
        line.strip().lstrip("•-*").strip()
        for line in (v.requisitos or "").splitlines()
        if line.strip() and len(line.strip().lstrip("•-*").strip()) > 3
    ]
    min_cop = int(v.salario_min_cop) if v.salario_min_cop is not None else None
    max_cop = int(v.salario_max_cop) if v.salario_max_cop is not None else None
    salario_visible = True if v.salario_visible is None else bool(v.salario_visible)
    salario_label = build_salary_display(
        esquema_salarial=v.esquema_salarial,
        salario_min_cop=min_cop,
        salario_max_cop=max_cop,
        salario_visible=salario_visible,
        fallback_text=v.salario,
        for_public=False,
    )
    habilidades = parse_json_list_str(v.habilidades_clave)
    idiomas = parse_json_idiomas(v.idiomas)
    preguntas_filtro = parse_json_preguntas(v.preguntas_filtro)

    return {
        "id": v.id,
        "titulo": v.titulo,
        "categoria_area": v.categoria_area or "Tecnología y Sistemas",
        "cantidad_vacantes": int(v.cantidad_vacantes or 1),
        "descripcion": v.descripcion or "",
        "funciones": v.funciones or "",
        "requisitos": reqs_list,
        "requisitos_raw": v.requisitos or "",
        "requisitos_indispensables": v.requisitos_indispensables or v.requisitos or "",
        "requisitos_deseables": v.requisitos_deseables or "",
        "habilidades_clave": habilidades,
        "idiomas": idiomas,
        "preguntas_filtro": preguntas_filtro,
        "modalidad": v.modalidad or "remoto",
        "departamento": v.departamento or "",
        "ciudad": v.ciudad or ("Remoto (Colombia)" if v.modalidad == "remoto" else "Colombia"),
        "esquema_salarial": v.esquema_salarial or "a_convenir",
        "salario": salario_label,
        "salario_min_cop": min_cop,
        "salario_max_cop": max_cop,
        "salario_visible": salario_visible,
        "beneficios": v.beneficios or "",
        "experiencia": v.experiencia or "Sin experiencia / Primer empleo",
        "nivel_educativo": v.nivel_educativo or "No requerido",
        "tipo_contrato": v.tipo_contrato or "Término Indefinido",
        "jornada": v.jornada or "Tiempo Completo",
        "puntaje_minimo": float(v.puntaje_minimo or 60.0),
        "estado": v.estado,
        "motivo_rechazo": v.motivo_rechazo,
        "total_postulados": postulados_count,
        "created_at": v.created_at.isoformat() if v.created_at else None,
        "fecha_aprobacion": v.fecha_aprobacion.isoformat() if v.fecha_aprobacion else None,
    }


def _apply_vacancy_payload(vacante: Vacante, data: VacanteUpsertRequest) -> None:
    """Aplica campos validados de creación o edición a una instancia Vacante."""
    habilidades = [h.strip() for h in data.habilidades_clave if h and h.strip()]
    idiomas_dicts = [
        {"idioma": item.idioma.strip(), "nivel": item.nivel.strip() or "Intermedio"}
        for item in data.idiomas
        if item.idioma.strip()
    ]
    preguntas_dicts = [
        {
            "id": item.id.strip(),
            "pregunta": item.pregunta.strip(),
            "tipo": item.tipo,
            "obligatoria": bool(item.obligatoria),
        }
        for item in data.preguntas_filtro
        if item.pregunta.strip()
    ]
    combined_reqs = build_combined_requirements_text(
        indispensables=data.requisitos_indispensables,
        deseables=data.requisitos_deseables,
        habilidades=habilidades,
        idiomas=idiomas_dicts,
        nivel_educativo=data.nivel_educativo,
        fallback_requisitos=data.requisitos,
    )
    salario_label = build_salary_display(
        esquema_salarial=data.esquema_salarial,
        salario_min_cop=data.salario_min_cop,
        salario_max_cop=data.salario_max_cop,
        salario_visible=data.salario_visible,
        fallback_text=data.salario,
        for_public=False,
    )

    vacante.perfil_id = data.perfil_id
    vacante.titulo = data.titulo.strip()
    vacante.categoria_area = data.categoria_area.strip()
    vacante.cantidad_vacantes = data.cantidad_vacantes
    vacante.descripcion = data.descripcion.strip()
    vacante.funciones = data.funciones.strip() if data.funciones and data.funciones.strip() else None
    vacante.requisitos = combined_reqs
    vacante.requisitos_indispensables = (
        data.requisitos_indispensables.strip()
        if data.requisitos_indispensables and data.requisitos_indispensables.strip()
        else None
    )
    vacante.requisitos_deseables = (
        data.requisitos_deseables.strip()
        if data.requisitos_deseables and data.requisitos_deseables.strip()
        else None
    )
    vacante.habilidades_clave = json.dumps(habilidades, ensure_ascii=False)
    vacante.idiomas = json.dumps(idiomas_dicts, ensure_ascii=False)
    vacante.preguntas_filtro = json.dumps(preguntas_dicts, ensure_ascii=False)
    vacante.modalidad = data.modalidad
    vacante.departamento = data.departamento.strip() if data.departamento and data.departamento.strip() else None
    vacante.ciudad = data.ciudad.strip() if data.ciudad and data.ciudad.strip() else None
    vacante.esquema_salarial = data.esquema_salarial
    vacante.salario_min_cop = data.salario_min_cop
    vacante.salario_max_cop = data.salario_max_cop
    vacante.salario_visible = data.salario_visible
    vacante.salario = salario_label[:120]
    vacante.beneficios = data.beneficios.strip() if data.beneficios and data.beneficios.strip() else None
    vacante.experiencia = data.experiencia.strip()
    vacante.nivel_educativo = data.nivel_educativo.strip()
    vacante.tipo_contrato = data.tipo_contrato.strip()
    vacante.jornada = data.jornada.strip()
    vacante.puntaje_minimo = data.puntaje_minimo


def _load_candidate_extra_map(db: Session, user_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    clean_ids = [int(uid) for uid in user_ids if uid is not None]
    if not clean_ids:
        return {}
    placeholders = ", ".join(str(uid) for uid in clean_ids)
    try:
        rows = db.execute(
            text(
                f"SELECT id, especialidad, ciudad, nivel_experiencia, linkedin_url, github_url, biografia, perfil_cv_json "
                f"FROM usuarios WHERE id IN ({placeholders})"
            )
        ).fetchall()
    except Exception:
        return {}
    out: Dict[int, Dict[str, Any]] = {}
    for r in rows:
        out[r[0]] = {
            "especialidad": r[1],
            "ciudad": r[2],
            "nivel_experiencia": r[3],
            "linkedin_url": r[4],
            "github_url": r[5],
            "biografia": r[6],
            "perfil_cv_json": r[7],
        }
    return out


def _serialize_company_applicant(p: Postulacion, extra_map: Dict[int, Dict[str, Any]]) -> dict:
    cand = p.usuario
    vac = p.vacante
    cv = p.hoja_vida
    extra = extra_map.get(cand.id, {}) if cand else {}

    analisis_parsed = parse_analisis_cv(p.analisis, float(p.puntaje_cv) if p.puntaje_cv is not None else None)
    cv_score = analisis_parsed["puntaje_afinidad"]
    if cv_score is None and cv and cv.texto_extraido:
        cv_score = float(cv_service.analyze_cv_content(cv.texto_extraido, cv.nombre_archivo)["score"])

    etapa = p.etapa_seleccion or "postulado"
    has_cv_file = bool(cv and cv.url_archivo and Path(cv.url_archivo).is_file())
    nivel_edu = _extract_education_level(extra.get("perfil_cv_json"), cv.texto_extraido if cv else None)

    return {
        "id": p.id,
        "usuario_id": cand.id if cand else None,
        "nombre": (cand.nombre or cand.email.split("@")[0]) if cand else "Candidato",
        "email": cand.email if cand else "",
        "telefono": cand.telefono if cand else "",
        "ciudad": extra.get("ciudad") or "Colombia",
        "especialidad": extra.get("especialidad") or "Profesional",
        "nivel_experiencia": extra.get("nivel_experiencia") or "Sin especificar",
        "nivel_educativo": nivel_edu,
        "linkedin_url": extra.get("linkedin_url") or "",
        "github_url": extra.get("github_url") or "",
        "vacante_id": p.vacante_id,
        "vacante_titulo": vac.titulo if vac else "Vacante",
        "estado": p.estado,
        "etapa_seleccion": etapa,
        "etapa_label": ATS_STAGE_LABELS.get(etapa, etapa.replace("_", " ").title()),
        "revisado_por_empresa": bool(p.revisado_por_empresa),
        "notas_reclutador": p.notas_reclutador or "",
        "calificacion_reclutador": p.calificacion_reclutador,
        "cv_score": cv_score,
        "experiencia_anios": analisis_parsed["experiencia_anios"],
        "resumen_ejecutivo": analisis_parsed["resumen_ejecutivo"],
        "requisitos_cumplidos": analisis_parsed["requisitos_cumplidos"],
        "requisitos_faltantes": analisis_parsed["requisitos_faltantes"],
        "alertas": analisis_parsed["alertas"],
        "preguntas_entrevista": analisis_parsed["preguntas_entrevista"],
        "proveedor_ia": analisis_parsed["proveedor_ia"] or "local",
        "analisis_updated_at": analisis_parsed["analisis_updated_at"],
        "tiene_analisis_guardado": bool(p.analisis),
        "cv_nombre": cv.nombre_archivo if cv else None,
        "tiene_cv": bool(cv),
        "tiene_cv_archivo": has_cv_file,
        "cv_texto_preview": (cv.texto_extraido or "")[:2000] if cv else "",
        "respuestas_filtro": parse_json_respuestas(p.respuestas_filtro),
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.get("/overview")
def get_company_overview(
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Retorna datos reales de la empresa, vacantes, postulantes rankeados por IA y buscador de talento."""
    empresa = _resolve_empresa(usuario, db)
    if not empresa:
        return {
            "empresa": None,
            "stats": {
                "active_jobs": 0,
                "pending_jobs": 0,
                "rejected_jobs": 0,
                "total_applicants": 0,
                "unreviewed_applicants": 0,
            },
            "vacancies": [],
            "applicants": [],
            "talents": [],
        }

    vacancies = (
        db.query(Vacante)
        .filter(Vacante.empresa_id == empresa.id)
        .order_by(Vacante.created_at.desc(), Vacante.id.desc())
        .all()
    )
    vac_ids = [v.id for v in vacancies]

    post_counts = (
        dict(
            db.query(Postulacion.vacante_id, func.count(Postulacion.id))
            .filter(Postulacion.vacante_id.in_(vac_ids))
            .group_by(Postulacion.vacante_id)
            .all()
        )
        if vac_ids
        else {}
    )

    posts = (
        db.query(Postulacion)
        .options(
            joinedload(Postulacion.usuario),
            joinedload(Postulacion.vacante),
            joinedload(Postulacion.hoja_vida),
            joinedload(Postulacion.analisis),
        )
        .filter(Postulacion.vacante_id.in_(vac_ids))
        .order_by(Postulacion.created_at.desc())
        .all()
        if vac_ids
        else []
    )

    cand_ids = list({p.usuario_id for p in posts if p.usuario_id})
    extra_map = _load_candidate_extra_map(db, cand_ids)
    applicants = [_serialize_company_applicant(p, extra_map) for p in posts]
    # Ranking por defecto de mayor a menor afinidad IA (Gemini)
    applicants.sort(key=lambda item: (item["cv_score"] if item["cv_score"] is not None else -1.0, item["id"]), reverse=True)

    return {
        "empresa": serialize_company_profile(empresa),
        "stats": {
            "active_jobs": sum(1 for v in vacancies if v.estado == "abierta"),
            "pending_jobs": sum(1 for v in vacancies if v.estado == "pendiente_aprobacion"),
            "rejected_jobs": sum(1 for v in vacancies if v.estado == "rechazada"),
            "total_applicants": len(applicants),
            "unreviewed_applicants": sum(1 for a in applicants if not a["revisado_por_empresa"]),
        },
        "vacancies": [_serialize_company_vacancy(v, post_counts.get(v.id, 0)) for v in vacancies],
        "applicants": applicants,
        "talents": _load_available_talents(db, empresa.id),
    }


@router.get("/perfil")
def get_company_profile(
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Obtiene el perfil legal y operativo completo de la empresa en Colombia."""
    empresa = _resolve_empresa(usuario, db)
    if not empresa:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tu cuenta no tiene una empresa asociada.")
    return serialize_company_profile(empresa)


@router.post("/nit/calcular-dv")
def calculate_nit_dv(data: NitCalcularRequest):
    """Calcula el Dígito de Verificación (DV) oficial de la DIAN para un NIT colombiano."""
    try:
        dv = calcular_dv_nit(data.nit)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    clean_nit = "".join(ch for ch in data.nit if ch.isdigit())
    return {"nit": clean_nit, "digito_verificacion": dv}


@router.put("/perfil")
def update_company_profile(
    data: EmpresaProfileUpdateRequest,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Actualiza el perfil completo de la empresa (Colombia) y registra autorización Ley 1581."""
    empresa = _resolve_empresa(usuario, db)
    if not empresa:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tu cuenta no tiene una empresa asociada.")

    if data.nit:
        nit_dup = db.query(Empresa).filter(Empresa.nit == data.nit, Empresa.id != empresa.id).first()
        if nit_dup:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"El NIT {data.nit} ya se encuentra registrado en otra empresa.",
            )

    razon = data.razon_social.strip()
    comercial = (data.nombre_comercial or "").strip() or razon

    empresa.tipo_persona = data.tipo_persona
    empresa.razon_social = razon[:180]
    empresa.nombre_comercial = comercial[:150]
    empresa.nombre = comercial[:150]
    empresa.nit = data.nit
    empresa.digito_verificacion = data.digito_verificacion
    empresa.rut_numero = data.rut_numero
    empresa.codigo_ciiu = data.codigo_ciiu
    empresa.sector = data.sector.strip()[:100]
    empresa.tamano_empresa = data.tamano_empresa
    empresa.departamento = data.departamento.strip()[:80]
    empresa.ciudad = data.ciudad.strip()[:100]
    empresa.direccion = data.direccion.strip()[:200] if data.direccion and data.direccion.strip() else None
    empresa.sitio_web = data.sitio_web.strip()[:255] if data.sitio_web and data.sitio_web.strip() else None
    empresa.linkedin_url = data.linkedin_url.strip()[:255] if data.linkedin_url and data.linkedin_url.strip() else None
    empresa.descripcion = data.descripcion.strip() if data.descripcion and data.descripcion.strip() else None
    empresa.contacto_nombre = data.contacto_nombre.strip()[:120]
    empresa.contacto_cargo = (
        data.contacto_cargo.strip()[:100] if data.contacto_cargo and data.contacto_cargo.strip() else None
    )
    empresa.contacto_telefono = data.contacto_telefono.strip()[:30]
    empresa.contacto_email = data.contacto_email

    if not empresa.acepta_ley_1581:
        empresa.acepta_ley_1581 = True
        empresa.fecha_ley_1581 = _utcnow()
        db.add(HistorialConsentimiento(usuario_id=usuario.id, tipo="ley_1581_empresa", aceptado=True))

    db.commit()
    db.refresh(empresa)
    return {
        "status": "ok",
        "mensaje": "Perfil de empresa guardado correctamente en PostgreSQL.",
        "empresa": serialize_company_profile(empresa),
    }


@router.post("/perfil/logo")
async def upload_company_logo(
    file: UploadFile = File(...),
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Sube el logotipo corporativo de la empresa (PNG, JPG, WEBP)."""
    empresa = _resolve_empresa(usuario, db)
    if not empresa:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tu cuenta no tiene una empresa asociada.")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Formato no permitido. Usa PNG, JPG o WEBP.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El archivo del logo está vacío.")
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El logo supera el límite de 5 MB.")

    if empresa.logo_path:
        old_path = Path(empresa.logo_path)
        if old_path.is_file():
            old_path.unlink(missing_ok=True)

    LOGO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest_path = LOGO_UPLOAD_DIR / f"empresa_{empresa.id}_{uuid.uuid4().hex[:10]}{ext}"
    dest_path.write_bytes(contents)

    empresa.logo_path = str(dest_path)[:255]
    db.commit()
    db.refresh(empresa)
    profile = serialize_company_profile(empresa)
    return {
        "status": "ok",
        "mensaje": "Logo corporativo actualizado correctamente.",
        "logo_url": profile["logo_url"],
        "empresa": profile,
    }


@router.get("/perfil/logo/{empresa_id}")
def get_company_logo(empresa_id: int, db: Session = Depends(get_db)):
    """Sirve el logo de una empresa para mostrarlo en el dashboard y en las ofertas."""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa or not empresa.logo_path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Logo no encontrado.")
    path = Path(empresa.logo_path)
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Archivo de logo no encontrado.")
    return FileResponse(path=str(path), content_disposition_type="inline")


def _load_available_talents(db: Session, empresa_id: int) -> list[dict]:
    candidatos = (
        db.query(Usuario)
        .filter(Usuario.rol == "usuario", Usuario.deleted_at.is_(None))
        .order_by(Usuario.created_at.desc(), Usuario.id.desc())
        .all()
    )
    extra_map = _load_candidate_extra_map(db, [c.id for c in candidatos])

    cvs = (
        db.query(HojaDeVida)
        .order_by(HojaDeVida.usuario_id.asc(), HojaDeVida.created_at.desc(), HojaDeVida.id.desc())
        .all()
    )
    cv_map: dict[int, HojaDeVida] = {}
    for cv in cvs:
        if cv.usuario_id not in cv_map:
            cv_map[cv.usuario_id] = cv

    notified_ids = {
        row[0]
        for row in db.query(Notificacion.usuario_id)
        .filter(Notificacion.empresa_id == empresa_id, Notificacion.tipo == "interes_empresa")
        .all()
    }

    talents = []
    for c in candidatos:
        extra = extra_map.get(c.id, {})
        cv = cv_map.get(c.id)
        cv_score = None
        habilidades: List[str] = []
        if cv and cv.texto_extraido:
            cv_eval = cv_service.analyze_cv_content(cv.texto_extraido, cv.nombre_archivo)
            cv_score = cv_eval["score"]
            habilidades = cv_eval.get("habilidades_detectadas") or []
        raw_cv_json = extra.get("perfil_cv_json")
        if isinstance(raw_cv_json, str):
            try:
                raw_cv_json = json.loads(raw_cv_json)
            except Exception:
                raw_cv_json = {}
        if isinstance(raw_cv_json, dict) and isinstance(raw_cv_json.get("habilidades"), list):
            for sk in raw_cv_json["habilidades"]:
                if isinstance(sk, str) and sk.strip() and sk.strip() not in habilidades:
                    habilidades.append(sk.strip())

        nivel_edu = _extract_education_level(raw_cv_json, cv.texto_extraido if cv else None)
        talents.append({
            "usuario_id": c.id,
            "nombre": c.nombre or c.email.split("@")[0],
            "email": c.email,
            "telefono": c.telefono or "",
            "especialidad": extra.get("especialidad") or "Profesional",
            "ciudad": extra.get("ciudad") or "Colombia",
            "nivel_experiencia": extra.get("nivel_experiencia") or "Sin especificar",
            "nivel_educativo": nivel_edu,
            "linkedin_url": extra.get("linkedin_url") or "",
            "github_url": extra.get("github_url") or "",
            "habilidades": habilidades[:12],
            "cv_nombre": cv.nombre_archivo if cv else None,
            "tiene_cv_archivo": bool(cv and cv.url_archivo and Path(cv.url_archivo).is_file()),
            "cv_score": cv_score,
            "ya_notificado": c.id in notified_ids,
        })
    return talents


def _build_stage_notification(empresa_nombre: str, vacante_titulo: str, etapa: str) -> tuple[str, str]:
    etapa_label = ATS_STAGE_LABELS.get(etapa, etapa)
    mensajes = {
        "preseleccionado": (
            f"¡Avanzaste a Preseleccionado en {empresa_nombre}!",
            f"Tu perfil para '{vacante_titulo}' en {empresa_nombre} fue preseleccionado. Pronto el equipo de talento se pondrá en contacto contigo.",
        ),
        "en_entrevista": (
            f"Citación a Entrevista — {empresa_nombre}",
            f"{empresa_nombre} movió tu postulación para '{vacante_titulo}' a la etapa 'En Entrevista'. Revisa tu correo o WhatsApp para coordinar horario.",
        ),
        "prueba_tecnica": (
            f"Prueba Técnica / Práctica habilitada — {empresa_nombre}",
            f"Tu postulación para '{vacante_titulo}' en {empresa_nombre} avanzó a la etapa de Prueba Técnica / Práctica.",
        ),
        "finalista": (
            f"¡Eres Finalista en {empresa_nombre}!",
            f"Tu postulación para '{vacante_titulo}' en {empresa_nombre} pasó a etapa Finalista / Oferta.",
        ),
        "contratado": (
            f"¡Felicitaciones! Seleccionado en {empresa_nombre}",
            f"{empresa_nombre} registró tu proceso para '{vacante_titulo}' como Contratado.",
        ),
        "descartado": (
            f"Actualización de proceso en {empresa_nombre}",
            f"Gracias por participar en '{vacante_titulo}' con {empresa_nombre}. En esta oportunidad el proceso continuó con otros perfiles (etapa: {etapa_label}).",
        ),
    }
    return mensajes.get(
        etapa,
        (
            f"Actualización de tu postulación en {empresa_nombre}",
            f"Tu postulación para '{vacante_titulo}' ahora se encuentra en etapa: {etapa_label}.",
        ),
    )


@router.patch("/postulaciones/{postulacion_id}")
def update_company_applicant_ats(
    postulacion_id: int,
    data: PostulacionATSUpdateRequest,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Actualiza etapa ATS, notas privadas o calificación (1-5) y notifica al candidato si cambia la etapa."""
    empresa = _resolve_empresa(usuario, db)
    postulacion = (
        db.query(Postulacion)
        .options(
            joinedload(Postulacion.usuario),
            joinedload(Postulacion.vacante),
            joinedload(Postulacion.hoja_vida),
            joinedload(Postulacion.analisis),
        )
        .filter(Postulacion.id == postulacion_id)
        .first()
    )
    if not postulacion:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Postulación no encontrada.")
    if usuario.rol != "admin" and (not empresa or not postulacion.vacante or postulacion.vacante.empresa_id != empresa.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para gestionar esta postulación.")

    etapa_anterior = postulacion.etapa_seleccion or "postulado"
    etapa_cambiada = False

    if data.etapa_seleccion is not None and data.etapa_seleccion != etapa_anterior:
        postulacion.etapa_seleccion = data.etapa_seleccion
        if data.etapa_seleccion in ATS_STAGE_TO_ESTADO:
            postulacion.estado = ATS_STAGE_TO_ESTADO[data.etapa_seleccion]
        etapa_cambiada = True

        db.add(
            DecisionPostulacion(
                postulacion_id=postulacion.id,
                reclutador_id=usuario.id,
                resultado=data.etapa_seleccion,
                notas=(data.notas_reclutador or "").strip() or None,
            )
        )

    if data.notas_reclutador is not None:
        postulacion.notas_reclutador = data.notas_reclutador.strip() or None

    if data.calificacion_reclutador is not None:
        postulacion.calificacion_reclutador = data.calificacion_reclutador

    if data.revisado is not None:
        postulacion.revisado_por_empresa = data.revisado
    else:
        postulacion.revisado_por_empresa = True

    notif_creada = False
    if etapa_cambiada and data.notificar_candidato and postulacion.usuario_id and postulacion.vacante:
        emp_obj = empresa or postulacion.vacante.empresa
        emp_nombre = (emp_obj.nombre_comercial or emp_obj.nombre) if emp_obj else "Empresa"
        titulo_default, msg_default = _build_stage_notification(
            emp_nombre,
            postulacion.vacante.titulo,
            postulacion.etapa_seleccion,
        )
        mensaje_final = (data.mensaje_notificacion or "").strip() or msg_default
        db.add(
            Notificacion(
                usuario_id=postulacion.usuario_id,
                empresa_id=emp_obj.id if emp_obj else None,
                vacante_id=postulacion.vacante_id,
                reclutador_id=usuario.id,
                tipo="cambio_etapa",
                titulo=titulo_default[:180],
                mensaje=mensaje_final,
                leida=False,
            )
        )
        notif_creada = True

    db.commit()
    db.refresh(postulacion)

    extra_map = _load_candidate_extra_map(db, [postulacion.usuario_id] if postulacion.usuario_id else [])
    return {
        "status": "ok",
        "notificado": notif_creada,
        "mensaje": (
            f"Etapa actualizada a '{ATS_STAGE_LABELS.get(postulacion.etapa_seleccion, postulacion.etapa_seleccion)}' y candidato notificado."
            if notif_creada
            else "Seguimiento del candidato actualizado."
        ),
        "applicant": _serialize_company_applicant(postulacion, extra_map),
    }


@router.get("/postulaciones/{postulacion_id}/cv")
def download_applicant_cv(
    postulacion_id: int,
    download: bool = False,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Permite a la empresa visualizar o descargar el archivo CV de un postulante propio."""
    empresa = _resolve_empresa(usuario, db)
    postulacion = (
        db.query(Postulacion)
        .options(joinedload(Postulacion.vacante), joinedload(Postulacion.hoja_vida))
        .filter(Postulacion.id == postulacion_id)
        .first()
    )
    if not postulacion:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Postulación no encontrada.")
    if usuario.rol != "admin" and (not empresa or not postulacion.vacante or postulacion.vacante.empresa_id != empresa.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para acceder a este CV.")

    cv = postulacion.hoja_vida
    if not cv or not cv.url_archivo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Este postulante no tiene archivo de Hoja de Vida.")
    file_path = Path(cv.url_archivo)
    if not file_path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "El archivo de Hoja de Vida no existe en el servidor.")

    media_type, _ = mimetypes.guess_type(cv.nombre_archivo or file_path.name)
    return FileResponse(
        path=str(file_path),
        media_type=media_type or "application/octet-stream",
        filename=cv.nombre_archivo or file_path.name,
        content_disposition_type="attachment" if download else "inline",
    )


@router.get("/candidatos/{usuario_id}/cv")
def download_talent_cv(
    usuario_id: int,
    download: bool = False,
    _usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Permite visualizar o descargar la última Hoja de Vida de un candidato del directorio de talento."""
    cv = (
        db.query(HojaDeVida)
        .filter(HojaDeVida.usuario_id == usuario_id)
        .order_by(HojaDeVida.created_at.desc(), HojaDeVida.id.desc())
        .first()
    )
    if not cv or not cv.url_archivo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "El candidato no ha subido Hoja de Vida.")
    file_path = Path(cv.url_archivo)
    if not file_path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Archivo de CV no disponible en disco.")

    media_type, _ = mimetypes.guess_type(cv.nombre_archivo or file_path.name)
    return FileResponse(
        path=str(file_path),
        media_type=media_type or "application/octet-stream",
        filename=cv.nombre_archivo or file_path.name,
        content_disposition_type="attachment" if download else "inline",
    )


class NotifyInterestRequest(BaseModel):
    usuario_id: int
    vacante_id: Optional[int] = None
    mensaje: Optional[str] = Field(default=None, max_length=1000)
    tipo: Optional[Literal["interes_empresa", "invitacion_entrevista"]] = "interes_empresa"


@router.post("/notificar-interes", status_code=status.HTTP_201_CREATED)
def notify_candidate_interest(
    data: NotifyInterestRequest,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Permite a una empresa notificar o invitar a un candidato a postularse / entrevista."""
    empresa = _resolve_empresa(usuario, db)
    if not empresa:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tu cuenta no tiene una empresa asociada.")

    candidato = (
        db.query(Usuario)
        .filter(Usuario.id == data.usuario_id, Usuario.rol == "usuario", Usuario.deleted_at.is_(None))
        .first()
    )
    if not candidato:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidato no encontrado.")

    vacante = None
    if data.vacante_id is not None:
        vacante = db.query(Vacante).filter(Vacante.id == data.vacante_id, Vacante.empresa_id == empresa.id).first()
        if not vacante:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "La vacante seleccionada no pertenece a tu empresa.")

    emp_nombre = empresa.nombre_comercial or empresa.nombre
    if data.tipo == "invitacion_entrevista":
        titulo = (
            f"{emp_nombre} te invita a entrevista para {vacante.titulo}"
            if vacante
            else f"{emp_nombre} te envió una invitación a entrevista"
        )
    else:
        titulo = (
            f"{emp_nombre} está interesada en tu perfil para {vacante.titulo}"
            if vacante
            else f"{emp_nombre} revisó tu perfil y está interesada en ti"
        )

    mensaje = (data.mensaje or "").strip() or (
        f"Hola {candidato.nombre or ''}, en {emp_nombre} revisamos tu perfil y nos gustaría invitarte a postularte."
    ).strip()

    notif = Notificacion(
        usuario_id=candidato.id,
        empresa_id=empresa.id,
        vacante_id=vacante.id if vacante else None,
        reclutador_id=usuario.id,
        tipo=data.tipo or "interes_empresa",
        titulo=titulo[:180],
        mensaje=mensaje,
        leida=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    return {
        "status": "ok",
        "notificacion_id": notif.id,
        "mensaje": f"Se envió la notificación a {candidato.nombre or candidato.email}.",
    }


@router.post("/vacantes", status_code=status.HTTP_201_CREATED)
def create_company_vacancy(
    data: VacanteUpsertRequest,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Crea una vacante flexible en PostgreSQL en estado 'pendiente_aprobacion' hasta aprobación admin."""
    empresa = _resolve_empresa(usuario, db)
    if not empresa:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Tu cuenta no tiene una empresa asociada para publicar vacantes.",
        )

    nueva = Vacante(
        empresa_id=empresa.id,
        reclutador_id=usuario.id,
        estado="pendiente_aprobacion",
    )
    _apply_vacancy_payload(nueva, data)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return {
        "status": "ok",
        "mensaje": "Vacante enviada para aprobación del administrador. Se publicará cuando sea aprobada.",
        "vacancy": _serialize_company_vacancy(nueva, 0),
    }


@router.put("/vacantes/{vacante_id}")
def update_company_vacancy(
    vacante_id: int,
    data: VacanteUpsertRequest,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Permite editar una vacante de la empresa (si fue rechazada vuelve a revisión de administrador)."""
    empresa = _resolve_empresa(usuario, db)
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if not vacante:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vacante no encontrada.")
    if usuario.rol != "admin" and (not empresa or vacante.empresa_id != empresa.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para editar esta vacante.")

    _apply_vacancy_payload(vacante, data)
    if vacante.estado == "rechazada":
        vacante.estado = "pendiente_aprobacion"
        vacante.motivo_rechazo = None

    db.commit()
    db.refresh(vacante)
    postulados_count = db.query(func.count(Postulacion.id)).filter(Postulacion.vacante_id == vacante.id).scalar() or 0
    return {
        "status": "ok",
        "mensaje": "Vacante actualizada correctamente.",
        "vacancy": _serialize_company_vacancy(vacante, postulados_count),
    }


@router.patch("/vacantes/{vacante_id}/estado")
def change_company_vacancy_status(
    vacante_id: int,
    data: VacanteEstadoRequest,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Permite pausar, reactivar o cerrar una vacante ya aprobada por un administrador."""
    empresa = _resolve_empresa(usuario, db)
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if not vacante:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vacante no encontrada.")
    if usuario.rol != "admin" and (not empresa or vacante.empresa_id != empresa.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para modificar esta vacante.")

    if vacante.estado in ("pendiente_aprobacion", "rechazada", "borrador") and data.estado in ("abierta", "pausada"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Solo puedes activar o pausar vacantes que ya fueron aprobadas por un administrador.",
        )

    vacante.estado = data.estado
    if data.estado == "cerrada":
        vacante.fecha_cierre = _utcnow()
    elif data.estado == "abierta":
        vacante.fecha_cierre = None

    db.commit()
    db.refresh(vacante)
    postulados_count = db.query(func.count(Postulacion.id)).filter(Postulacion.vacante_id == vacante.id).scalar() or 0
    etiquetas = {"abierta": "reactivada", "pausada": "pausada", "cerrada": "cerrada"}
    return {
        "status": "ok",
        "mensaje": f"Vacante '{vacante.titulo}' {etiquetas.get(data.estado, data.estado)}.",
        "vacancy": _serialize_company_vacancy(vacante, postulados_count),
    }


@router.delete("/vacantes/{vacante_id}")
def delete_company_vacancy(
    vacante_id: int,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    empresa = _resolve_empresa(usuario, db)
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if not vacante:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vacante no encontrada.")
    if usuario.rol != "admin" and (not empresa or vacante.empresa_id != empresa.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para eliminar esta vacante.")

    db.delete(vacante)
    db.commit()
    return {"status": "ok", "deleted_vacante_id": vacante_id}


@router.post("/postulaciones/{postulacion_id}/analizar-ia")
def analyze_company_applicant_with_ai(
    postulacion_id: int,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Analiza o re-analiza con Gemini (o respaldo local) el CV de un postulante y persiste en analisis_cv."""
    empresa = _resolve_empresa(usuario, db)
    postulacion = (
        db.query(Postulacion)
        .options(
            joinedload(Postulacion.vacante),
            joinedload(Postulacion.usuario),
            joinedload(Postulacion.hoja_vida),
            joinedload(Postulacion.analisis),
        )
        .filter(Postulacion.id == postulacion_id)
        .first()
    )
    if not postulacion:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Postulación no encontrada.")
    if usuario.rol != "admin" and (not empresa or not postulacion.vacante or postulacion.vacante.empresa_id != empresa.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para analizar esta postulación.")

    try:
        res = cv_ai_analyzer.analizar_postulacion_con_ia(db, postulacion.id, es_empresa=True)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    db.refresh(postulacion)
    extra_map = _load_candidate_extra_map(db, [postulacion.usuario_id] if postulacion.usuario_id else [])
    etiqueta_prov = "Gemini IA" if res["proveedor_usado"] == "gemini" else f"Motor {res['proveedor_usado']}"
    return {
        "status": "ok",
        "proveedor_usado": res["proveedor_usado"],
        "mensaje": f"CV analizado con {etiqueta_prov} ({round(res['puntaje_afinidad'])}% de afinidad).",
        "applicant": _serialize_company_applicant(postulacion, extra_map),
    }


@router.post("/vacantes/{vacante_id}/analizar-pendientes-ia")
def analyze_pending_applicants_with_ai(
    vacante_id: int,
    data: Optional[AnalizarPendientesRequest] = None,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Analiza en lote las postulaciones pendientes o con motor local de una vacante usando Gemini."""
    empresa = _resolve_empresa(usuario, db)
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if not vacante:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vacante no encontrada.")
    if usuario.rol != "admin" and (not empresa or vacante.empresa_id != empresa.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para analizar postulantes de esta vacante.")

    forzar = bool(data.forzar_reanalisis) if data else False
    target_provider = (settings.AI_PROVIDER or "local").strip().lower()

    posts = (
        db.query(Postulacion)
        .options(
            joinedload(Postulacion.usuario),
            joinedload(Postulacion.vacante),
            joinedload(Postulacion.hoja_vida),
            joinedload(Postulacion.analisis),
        )
        .filter(Postulacion.vacante_id == vacante.id)
        .all()
    )

    procesados = 0
    omitidos = 0
    errores = 0
    con_gemini = 0
    updated_applicants: List[dict] = []

    for p in posts:
        analisis = p.analisis
        ya_analizado_objetivo = bool(
            analisis
            and (
                (analisis.proveedor_ia or "").lower() == target_provider
                or (target_provider == "local" and analisis is not None)
            )
        )
        if not forzar and ya_analizado_objetivo:
            omitidos += 1
            continue
        try:
            res = cv_ai_analyzer.analizar_postulacion_con_ia(db, p.id, es_empresa=True)
            procesados += 1
            if res["proveedor_usado"] == "gemini":
                con_gemini += 1
            db.refresh(p)
            extra_map = _load_candidate_extra_map(db, [p.usuario_id] if p.usuario_id else [])
            updated_applicants.append(_serialize_company_applicant(p, extra_map))
        except Exception:
            errores += 1

    return {
        "status": "ok",
        "vacante_id": vacante.id,
        "procesados": procesados,
        "con_gemini": con_gemini,
        "omitidos_ya_analizados": omitidos,
        "errores": errores,
        "mensaje": (
            f"Análisis masivo completado: {procesados} evaluados ({con_gemini} con Gemini IA), "
            f"{omitidos} ya tenían análisis vigente guardado en PostgreSQL."
        ),
        "updated_applicants": updated_applicants,
    }


@router.post("/talento/evaluar-match")
def evaluate_talent_match_with_ai(
    data: EvaluarTalentoMatchRequest,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Evalúa compatibilidad rápida de un candidato registrado contra una vacante antes de invitarlo."""
    empresa = _resolve_empresa(usuario, db)
    if not empresa:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tu cuenta no tiene una empresa asociada.")

    vacante = db.query(Vacante).filter(Vacante.id == data.vacante_id, Vacante.empresa_id == empresa.id).first()
    if not vacante:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "La vacante seleccionada no pertenece a tu empresa.")

    candidato = (
        db.query(Usuario)
        .filter(Usuario.id == data.usuario_id, Usuario.rol == "usuario", Usuario.deleted_at.is_(None))
        .first()
    )
    if not candidato:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidato no encontrado.")

    try:
        resultado = cv_ai_analyzer.evaluar_talento_para_vacante(db, candidato, vacante)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    return {"status": "ok", "match": resultado}


@router.post("/vacantes/{vacante_id}/comparar-ia")
def compare_applicants_with_ai(
    vacante_id: int,
    data: CompararCandidatosRequest,
    usuario: Usuario = Depends(require_roles("reclutador", "admin")),
    db: Session = Depends(get_db),
):
    """Compara de 2 a 5 postulantes seleccionados de una vacante usando Gemini con respaldo local."""
    empresa = _resolve_empresa(usuario, db)
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if not vacante:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vacante no encontrada.")
    if usuario.rol != "admin" and (not empresa or vacante.empresa_id != empresa.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para comparar postulantes de esta vacante.")

    unique_ids = list(dict.fromkeys(data.postulacion_ids))
    if len(unique_ids) < 2 or len(unique_ids) > 5:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Debes seleccionar entre 2 y 5 postulantes para comparar.")

    posts = (
        db.query(Postulacion)
        .options(joinedload(Postulacion.usuario), joinedload(Postulacion.analisis))
        .filter(Postulacion.vacante_id == vacante.id, Postulacion.id.in_(unique_ids))
        .all()
    )
    if len(posts) < 2:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Los postulantes seleccionados deben pertenecer a la misma vacante.")

    comparison = cv_ai_analyzer.comparar_postulantes_con_ia(db, vacante, posts)
    return {"status": "ok", "comparison": comparison}

