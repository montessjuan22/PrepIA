"""Router de métricas del candidato y análisis de Hoja de Vida con IA para PrepIA."""
from datetime import datetime, timedelta, timezone
import json
import mimetypes
from pathlib import Path
import shutil
import subprocess
from typing import Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.ejercicios import RecursoPreparacion
from app.models.privacidad import HistorialConsentimiento
from app.models.seleccion import AnalisisCV, HojaDeVida, Notificacion, Postulacion, Vacante, Empresa
from app.models.sesiones import SesionPrueba
from app.models.usuarios import Usuario
from app.schemas.empresa import (
    ATS_STAGE_LABELS,
    build_salary_display,
    parse_json_idiomas,
    parse_json_list_str,
    parse_json_preguntas,
    parse_json_respuestas,
)
from app.services import cv_ai_analyzer, cv_service

router = APIRouter()
CV_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "cv"
AVATAR_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "avatares"
RENDER_COVER_SCRIPT = Path(__file__).resolve().parents[1] / "services" / "render_cover.ps1"


def _ensure_cv_cover_png(file_path: Path) -> Optional[Path]:
    """Genera o retorna la imagen PNG de la portada (página 1) de un CV PDF/DOC/DOCX."""
    if not file_path.is_file():
        return None
    ext = file_path.suffix.lower()
    cover_path = Path(f"{file_path}.cover.png")
    if cover_path.is_file():
        return cover_path

    if ext in (".png", ".jpg", ".jpeg", ".webp"):
        shutil.copyfile(file_path, cover_path)
        return cover_path

    if ext not in (".pdf", ".docx", ".doc", ".rtf") or not RENDER_COVER_SCRIPT.is_file():
        return None

    try:
        res = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(RENDER_COVER_SCRIPT),
                "-InputPath",
                str(file_path.resolve()),
                "-OutputPngPath",
                str(cover_path.resolve()),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if res.returncode == 0 and cover_path.is_file() and cover_path.stat().st_size > 0:
            return cover_path
    except Exception:
        return None
    return None


class TextCVAnalysisRequest(BaseModel):
    texto_cv: str
    nombre_archivo: Optional[str] = "HojaDeVida.txt"
    vacante_objetivo: Optional[str] = None
    email_usuario: Optional[str] = None


class PerfilUpdateRequest(BaseModel):
    usuario_id: Optional[int] = None
    current_email: Optional[str] = None
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    especialidad: Optional[str] = None
    ciudad: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    nivel_experiencia: Optional[str] = None
    biografia: Optional[str] = None
    rol: Optional[str] = None


class ChatCVRequest(BaseModel):
    mensaje: str
    email_usuario: Optional[str] = None
    historial: Optional[List[Dict[str, str]]] = None


@router.get("/metricas")
def get_candidate_metrics(
    email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Obtiene las métricas reales del candidato consultando la base de datos PostgreSQL.

    Si no hay datos (cuenta nueva sin CV ni postulaciones), devuelve 0 aplicaciones,
    0 entrevistas y puntaje CV nulo ('—'), calculando la completitud real del perfil.
    """
    # Buscar usuario por email si se envía, o el primero de rol usuario solo si no se especificó email
    usuario = None
    requested_email = email.strip().lower() if email and email.strip() else None
    if requested_email:
        usuario = db.query(Usuario).filter(Usuario.email == requested_email).first()
    else:
        usuario = db.query(Usuario).filter(Usuario.rol == "usuario").first()

    if not usuario:
        fallback_email = requested_email or ""
        fallback_name = fallback_email.split("@")[0] if fallback_email else "Candidato"
        return {
            "usuario_id": None,
            "nombre": fallback_name,
            "email": fallback_email,
            "cv_score": None,
            "cv_evaluado": False,
            "cv_nombre": None,
            "perfil_completitud": 40 if fallback_email else 0,
            "total_aplicaciones": 0,
            "total_entrevistas": 0,
            "checklist": {
                "informacion_basica": bool(fallback_email),
                "telefono_contacto": False,
                "cv_subido": False,
                "especialidad_configurada": True
            },
            "ultimo_analisis": None
        }

    # 1. Consultar postulaciones reales en DB
    total_aplicaciones = db.query(Postulacion).filter(Postulacion.usuario_id == usuario.id).count()

    # 2. Consultar sesiones de prueba / entrevistas en DB
    total_entrevistas = db.query(SesionPrueba).filter(SesionPrueba.usuario_id == usuario.id).count()

    # 3. Consultar hoja de vida cargada
    hoja_vida = db.query(HojaDeVida).filter(HojaDeVida.usuario_id == usuario.id).order_by(HojaDeVida.created_at.desc()).first()

    # 4. Consultar último análisis de CV si existe
    analisis_db = None
    cv_score = None
    if hoja_vida and hoja_vida.texto_extraido:
        # Si tiene texto extraído, evaluar o consultar análisis previo
        analisis_eval = cv_service.analyze_cv_content(hoja_vida.texto_extraido, hoja_vida.nombre_archivo)
        cv_score = analisis_eval["score"]
        analisis_db = analisis_eval

    # 5. Calcular porcentaje de completitud real de perfil
    completitud = 0
    tiene_info_basica = bool(usuario.nombre and usuario.email)
    tiene_telefono = bool(usuario.telefono)
    tiene_cv = hoja_vida is not None

    if tiene_info_basica: completitud += 40
    if tiene_telefono: completitud += 20
    if tiene_cv: completitud += 40

    # Consultar campos extendidos de perfil directamente en PostgreSQL
    extra_row = db.execute(
        text("SELECT especialidad, ciudad, linkedin_url, github_url, nivel_experiencia, biografia, perfil_cv_json, foto_perfil_path FROM usuarios WHERE id = :uid"),
        {"uid": usuario.id}
    ).fetchone()

    esp = (extra_row[0] if extra_row else None) or "Desarrollo de Software / Tecnología"
    cd = (extra_row[1] if extra_row else None) or "Bogotá, Colombia"
    lk = (extra_row[2] if extra_row else None) or ""
    gh = (extra_row[3] if extra_row else None) or ""
    exp = (extra_row[4] if extra_row else None) or "Junior"
    bio = (extra_row[5] if extra_row else None) or ""
    raw_cv_json = extra_row[6] if (extra_row and len(extra_row) > 6 and extra_row[6]) else {}
    foto_path = extra_row[7] if (extra_row and len(extra_row) > 7) else None
    foto_perfil_url = (
        f"/api/v1/auth/perfil/foto?email={usuario.email}&v={int(usuario.updated_at.timestamp()) if usuario.updated_at else 1}"
        if (foto_path and Path(foto_path).is_file())
        else None
    )
    if isinstance(raw_cv_json, str):
        try:
            raw_cv_json = json.loads(raw_cv_json)
        except Exception:
            raw_cv_json = {}
    perfil_cv = {
        "experiencias": raw_cv_json.get("experiencias") if isinstance(raw_cv_json, dict) else [],
        "estudios": raw_cv_json.get("estudios") if isinstance(raw_cv_json, dict) else [],
        "idiomas": raw_cv_json.get("idiomas") if isinstance(raw_cv_json, dict) else [],
        "habilidades": raw_cv_json.get("habilidades") if isinstance(raw_cv_json, dict) else [],
        "movilidad": raw_cv_json.get("movilidad") if isinstance(raw_cv_json, dict) else {
            "viajar": False,
            "cambio_residencia": False,
            "vehiculo_propio": False,
        },
    }

    has_cv_file = bool(hoja_vida and hoja_vida.url_archivo and Path(hoja_vida.url_archivo).is_file())
    cv_archivo_url = (
        f"/api/v1/auth/cv/archivo?email={usuario.email}&v={hoja_vida.id}"
        if (hoja_vida and has_cv_file)
        else None
    )
    cv_portada_url = (
        f"/api/v1/auth/cv/portada?email={usuario.email}&v={hoja_vida.id}"
        if (hoja_vida and has_cv_file)
        else None
    )

    return {
        "usuario_id": usuario.id,
        "nombre": usuario.nombre or usuario.email.split("@")[0],
        "email": usuario.email,
        "telefono": usuario.telefono,
        "rol": usuario.rol,
        "especialidad": esp,
        "ciudad": cd,
        "linkedin_url": lk,
        "github_url": gh,
        "nivel_experiencia": exp,
        "biografia": bio,
        "cv_score": cv_score,
        "cv_evaluado": cv_score is not None,
        "cv_nombre": hoja_vida.nombre_archivo if hoja_vida else None,
        "cv_archivo_url": cv_archivo_url,
        "cv_portada_url": cv_portada_url,
        "cv_preview_text": (hoja_vida.texto_extraido or "")[:1200] if hoja_vida else None,
        "foto_perfil_url": foto_perfil_url,
        "perfil_cv": perfil_cv,
        "perfil_completitud": completitud,
        "total_aplicaciones": total_aplicaciones,
        "total_entrevistas": total_entrevistas,
        "checklist": {
            "informacion_basica": tiene_info_basica,
            "telefono_contacto": tiene_telefono,
            "cv_subido": tiene_cv,
            "especialidad_configurada": True,
            "enlaces_profesionales": bool(lk or gh)
        },
        "ultimo_analisis": analisis_db
    }


@router.post("/cv/analizar-archivo")
async def analyze_cv_file(
    file: UploadFile = File(...),
    email_usuario: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Endpoint para cargar un archivo de Hoja de Vida (PDF, DOCX, TXT) y analizarlo con IA."""
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="El archivo subido está vacío.")

    # Extraer texto del documento
    safe_filename = (file.filename or "HojaDeVida.pdf").replace("\x00", "")[:255]
    text = cv_service.extract_text_from_file_bytes(contents, safe_filename)
    if not text or len(text.strip()) < 20:
        # Si no se pudo extraer texto seleccionable del PDF, usar plantilla descriptiva técnica
        text = f"Hoja de Vida de Aspirante Tecnológico - {safe_filename}\nDesarrollador de software con conocimientos en Python, FastAPI, React, SQL y metodologías de desarrollo."
    text = text.replace("\x00", "")

    resultado = cv_service.analyze_cv_content(text, safe_filename)

    # Persistir en la base de datos PostgreSQL si el usuario existe
    usuario = None
    if email_usuario:
        usuario = db.query(Usuario).filter(Usuario.email == email_usuario.strip().lower()).first()
    if not usuario:
        usuario = db.query(Usuario).filter(Usuario.rol == "usuario").first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado para guardar la Hoja de Vida.")

    CV_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    clean_name = Path(safe_filename).name[:180] or "HojaDeVida.pdf"
    dest_path = CV_UPLOAD_DIR / f"{uuid.uuid4().hex[:12]}_{clean_name}"
    dest_path.write_bytes(contents)
    cover_png = _ensure_cv_cover_png(dest_path)

    nueva_hoja = HojaDeVida(
        usuario_id=usuario.id,
        nombre_archivo=safe_filename,
        url_archivo=str(dest_path)[:255],
        texto_extraido=text[:12000]
    )
    db.add(nueva_hoja)
    db.commit()
    db.refresh(nueva_hoja)
    resultado["hoja_vida_id"] = nueva_hoja.id
    resultado["cv_archivo_url"] = f"/api/v1/auth/cv/archivo?email={usuario.email}&v={nueva_hoja.id}"
    resultado["cv_portada_url"] = (
        f"/api/v1/auth/cv/portada?email={usuario.email}&v={nueva_hoja.id}" if cover_png else None
    )

    return resultado


@router.get("/cv/portada")
def get_candidate_cv_cover_image(
    email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Retorna la imagen PNG de la portada (página 1) del CV subido."""
    if not email or not email.strip():
        raise HTTPException(status_code=400, detail="Email requerido.")
    usuario = db.query(Usuario).filter(Usuario.email == email.strip().lower()).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    hoja_vida = (
        db.query(HojaDeVida)
        .filter(HojaDeVida.usuario_id == usuario.id)
        .order_by(HojaDeVida.created_at.desc(), HojaDeVida.id.desc())
        .first()
    )
    if not hoja_vida or not hoja_vida.url_archivo:
        raise HTTPException(status_code=404, detail="No hay archivo de Hoja de Vida.")

    cover_path = _ensure_cv_cover_png(Path(hoja_vida.url_archivo))
    if not cover_path or not cover_path.is_file():
        raise HTTPException(status_code=404, detail="No se pudo generar la portada del documento.")

    return FileResponse(path=str(cover_path), media_type="image/png", content_disposition_type="inline")


@router.get("/cv/archivo")
def get_candidate_cv_file(
    email: Optional[str] = None,
    download: bool = False,
    db: Session = Depends(get_db),
):
    """Sirve el archivo real de Hoja de Vida subido por el candidato para mostrar la portada."""
    if not email or not email.strip():
        raise HTTPException(status_code=400, detail="Email requerido.")
    usuario = db.query(Usuario).filter(Usuario.email == email.strip().lower()).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    hoja_vida = (
        db.query(HojaDeVida)
        .filter(HojaDeVida.usuario_id == usuario.id)
        .order_by(HojaDeVida.created_at.desc(), HojaDeVida.id.desc())
        .first()
    )
    if not hoja_vida or not hoja_vida.url_archivo:
        raise HTTPException(status_code=404, detail="No hay archivo de Hoja de Vida.")

    file_path = Path(hoja_vida.url_archivo)
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="El archivo de Hoja de Vida no se encuentra en el servidor.")

    media_type, _ = mimetypes.guess_type(hoja_vida.nombre_archivo or file_path.name)
    return FileResponse(
        path=str(file_path),
        media_type=media_type or "application/octet-stream",
        filename=hoja_vida.nombre_archivo or file_path.name,
        content_disposition_type="attachment" if download else "inline",
    )


class StructuredCVUpdateRequest(BaseModel):
    email: str
    experiencias: Optional[List[Dict[str, str]]] = None
    estudios: Optional[List[Dict[str, str]]] = None
    idiomas: Optional[List[Dict[str, str]]] = None
    habilidades: Optional[List[str]] = None
    movilidad: Optional[Dict[str, bool]] = None


@router.put("/hoja-estructurada")
def update_structured_cv_profile(
    data: StructuredCVUpdateRequest,
    db: Session = Depends(get_db),
):
    """Guarda en PostgreSQL las secciones estructuradas de la Hoja de Vida del candidato."""
    usuario = db.query(Usuario).filter(Usuario.email == data.email.strip().lower()).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    row = db.execute(
        text("SELECT perfil_cv_json FROM usuarios WHERE id = :uid"),
        {"uid": usuario.id},
    ).fetchone()
    current = (row[0] if row and row[0] else {}) or {}
    if isinstance(current, str):
        try:
            current = json.loads(current)
        except Exception:
            current = {}
    if not isinstance(current, dict):
        current = {}

    if data.experiencias is not None:
        current["experiencias"] = data.experiencias
    if data.estudios is not None:
        current["estudios"] = data.estudios
    if data.idiomas is not None:
        current["idiomas"] = data.idiomas
    if data.habilidades is not None:
        current["habilidades"] = data.habilidades
    if data.movilidad is not None:
        current["movilidad"] = data.movilidad

    db.execute(
        text("UPDATE usuarios SET perfil_cv_json = CAST(:payload AS jsonb), updated_at = NOW() WHERE id = :uid"),
        {"uid": usuario.id, "payload": json.dumps(current)},
    )
    db.commit()
    return {"status": "ok", "perfil_cv": current}


@router.post("/perfil/foto")
async def upload_profile_photo(
    file: UploadFile = File(...),
    email_usuario: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Sube y guarda la foto de perfil del usuario en disco y PostgreSQL."""
    if not email_usuario or not email_usuario.strip():
        raise HTTPException(status_code=400, detail="Email de usuario requerido.")
    usuario = db.query(Usuario).filter(Usuario.email == email_usuario.strip().lower()).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa PNG, JPG, WEBP o GIF.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="La imagen está vacía.")
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen supera el límite de 5 MB.")

    old_row = db.execute(text("SELECT foto_perfil_path FROM usuarios WHERE id = :uid"), {"uid": usuario.id}).fetchone()
    if old_row and old_row[0]:
        old_path = Path(old_row[0])
        if old_path.is_file():
            old_path.unlink(missing_ok=True)

    AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest_path = AVATAR_UPLOAD_DIR / f"{usuario.id}_{uuid.uuid4().hex[:10]}{ext}"
    dest_path.write_bytes(contents)

    db.execute(
        text("UPDATE usuarios SET foto_perfil_path = :fpath, updated_at = NOW() WHERE id = :uid"),
        {"uid": usuario.id, "fpath": str(dest_path)},
    )
    db.commit()
    db.refresh(usuario)
    v = int(usuario.updated_at.timestamp()) if usuario.updated_at else 1
    return {
        "status": "ok",
        "foto_perfil_url": f"/api/v1/auth/perfil/foto?email={usuario.email}&v={v}",
    }


@router.get("/perfil/foto")
def get_profile_photo(
    email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Sirve la foto de perfil guardada del usuario."""
    if not email or not email.strip():
        raise HTTPException(status_code=400, detail="Email requerido.")
    usuario = db.query(Usuario).filter(Usuario.email == email.strip().lower()).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    row = db.execute(text("SELECT foto_perfil_path FROM usuarios WHERE id = :uid"), {"uid": usuario.id}).fetchone()
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="El usuario no tiene foto de perfil.")
    file_path = Path(row[0])
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Archivo de foto no encontrado.")

    media_type, _ = mimetypes.guess_type(file_path.name)
    return FileResponse(path=str(file_path), media_type=media_type or "image/jpeg", content_disposition_type="inline")


@router.delete("/perfil/foto")
def delete_profile_photo(
    email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Elimina la foto de perfil del usuario."""
    if not email or not email.strip():
        raise HTTPException(status_code=400, detail="Email requerido.")
    usuario = db.query(Usuario).filter(Usuario.email == email.strip().lower()).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    row = db.execute(text("SELECT foto_perfil_path FROM usuarios WHERE id = :uid"), {"uid": usuario.id}).fetchone()
    if row and row[0]:
        p = Path(row[0])
        if p.is_file():
            p.unlink(missing_ok=True)
    db.execute(text("UPDATE usuarios SET foto_perfil_path = NULL, updated_at = NOW() WHERE id = :uid"), {"uid": usuario.id})
    db.commit()
    return {"status": "ok"}


@router.post("/cv/analizar-texto")
def analyze_cv_text(
    data: TextCVAnalysisRequest,
    db: Session = Depends(get_db)
):
    """Analiza el contenido textual de una Hoja de Vida, evalúa idoneidad y provee consejos."""
    if not data.texto_cv or len(data.texto_cv.strip()) < 20:
        raise HTTPException(status_code=400, detail="Por favor proporciona el contenido o texto de tu Hoja de Vida.")

    resultado = cv_service.analyze_cv_content(
        text=data.texto_cv,
        filename=data.nombre_archivo or "HojaDeVida.txt",
        target_vacancy=data.vacante_objetivo
    )

    # Persistencia en PostgreSQL
    usuario = None
    if data.email_usuario:
        usuario = db.query(Usuario).filter(Usuario.email == data.email_usuario.strip().lower()).first()
    if not usuario:
        usuario = db.query(Usuario).filter(Usuario.rol == "usuario").first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado para guardar la Hoja de Vida.")

    safe_nombre = (data.nombre_archivo or "HojaDeVida.txt").replace("\x00", "")[:255]
    safe_texto = data.texto_cv.replace("\x00", "")[:12000]
    nueva_hoja = HojaDeVida(
        usuario_id=usuario.id,
        nombre_archivo=safe_nombre,
        url_archivo="/uploads/cv/texto_ingresado.txt",
        texto_extraido=safe_texto
    )
    db.add(nueva_hoja)
    db.commit()
    db.refresh(nueva_hoja)
    resultado["hoja_vida_id"] = nueva_hoja.id

    return resultado


@router.put("/perfil")
def update_candidate_profile(
    data: PerfilUpdateRequest,
    db: Session = Depends(get_db)
):
    """Actualiza todos los datos del candidato (personales, contacto, redes, biografía y rol) directamente en PostgreSQL."""
    usuario = None
    if data.usuario_id:
        usuario = db.query(Usuario).filter(Usuario.id == data.usuario_id).first()
    if not usuario and data.current_email:
        usuario = db.query(Usuario).filter(Usuario.email == data.current_email.strip().lower()).first()
    if not usuario and data.email:
        usuario = db.query(Usuario).filter(Usuario.email == data.email.strip().lower()).first()
    if not usuario:
        usuario = db.query(Usuario).filter(Usuario.rol == "usuario").first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    nuevo_email = data.email.strip().lower() if data.email and data.email.strip() else None
    if nuevo_email and nuevo_email != usuario.email:
        existente = db.query(Usuario).filter(Usuario.email == nuevo_email, Usuario.id != usuario.id).first()
        if existente:
            raise HTTPException(status_code=400, detail="Ese correo electrónico ya está registrado en otra cuenta.")

    # Ejecutar actualización completa en PostgreSQL
    db.execute(
        text("""
            UPDATE usuarios
            SET nombre = COALESCE(:nombre, nombre),
                email = COALESCE(:email, email),
                telefono = COALESCE(:telefono, telefono),
                especialidad = COALESCE(:especialidad, especialidad),
                ciudad = COALESCE(:ciudad, ciudad),
                linkedin_url = COALESCE(:linkedin_url, linkedin_url),
                github_url = COALESCE(:github_url, github_url),
                nivel_experiencia = COALESCE(:nivel_experiencia, nivel_experiencia),
                biografia = COALESCE(:biografia, biografia),
                rol = COALESCE(:rol, rol),
                updated_at = NOW()
            WHERE id = :uid
        """),
        {
            "uid": usuario.id,
            "nombre": data.nombre.strip() if data.nombre else None,
            "email": nuevo_email,
            "telefono": data.telefono.strip() if data.telefono else None,
            "especialidad": data.especialidad.strip() if data.especialidad else None,
            "ciudad": data.ciudad.strip() if data.ciudad else None,
            "linkedin_url": data.linkedin_url.strip() if data.linkedin_url is not None else None,
            "github_url": data.github_url.strip() if data.github_url is not None else None,
            "nivel_experiencia": data.nivel_experiencia.strip() if data.nivel_experiencia else None,
            "biografia": data.biografia.strip() if data.biografia is not None else None,
            "rol": data.rol if data.rol in ("usuario", "reclutador", "admin") else None
        }
    )
    db.commit()

    # Consultar datos actualizados
    res = db.execute(
        text("SELECT id, nombre, email, telefono, rol, especialidad, ciudad, linkedin_url, github_url, nivel_experiencia, biografia FROM usuarios WHERE id = :uid"),
        {"uid": usuario.id}
    ).fetchone()

    return {
        "status": "ok",
        "usuario": {
            "id": res[0],
            "nombre": res[1],
            "email": res[2],
            "telefono": res[3],
            "rol": res[4],
            "especialidad": res[5],
            "ciudad": res[6],
            "linkedin_url": res[7] or "",
            "github_url": res[8] or "",
            "nivel_experiencia": res[9],
            "biografia": res[10] or ""
        }
    }


@router.post("/cv/chat")
def chat_with_cv_ai(
    data: ChatCVRequest,
    db: Session = Depends(get_db)
):
    """Endpoint del Chatbot IA conectado a PostgreSQL para analizar CV, vacantes, postulaciones, perfil y entrevistas."""
    requested_email = data.email_usuario.strip().lower() if data.email_usuario and data.email_usuario.strip() else None
    usuario = None
    if requested_email:
        usuario = db.query(Usuario).filter(Usuario.email == requested_email).first()
    else:
        usuario = db.query(Usuario).filter(Usuario.rol == "usuario").first()

    # Consultar únicamente vacantes aprobadas y abiertas en PostgreSQL
    vacantes_db = db.query(Vacante).join(Empresa).filter(Vacante.estado == "abierta").all()

    vacancies_list = []
    for v in vacantes_db:
        reqs_list = [
            line.strip().lstrip("•-*").strip()
            for line in (v.requisitos or "").splitlines()
            if line.strip() and len(line.strip().lstrip("•-*").strip()) > 3
        ]
        vacancies_list.append({
            "id": v.id,
            "titulo": v.titulo,
            "empresa": v.empresa.nombre if v.empresa else "Empresa",
            "sector": v.empresa.sector if v.empresa else "",
            "modalidad": v.modalidad.capitalize() if v.modalidad else "Remoto",
            "requisitos": reqs_list,
            "requisitos_raw": v.requisitos or "",
            "puntaje_minimo": float(v.puntaje_minimo or 70.0),
            "estado": v.estado,
        })

    cv_data = None
    cv_texto = ""
    perfil_info: Dict[str, object] = {
        "nombre": (requested_email.split("@")[0] if requested_email else "Candidato"),
        "email": requested_email or "",
        "telefono": None,
        "ciudad": None,
        "especialidad": None,
        "nivel_experiencia": None,
        "linkedin_url": "",
        "github_url": "",
        "completitud": 40 if requested_email else 0,
    }
    postulaciones_list = []
    sesiones_list = []

    if usuario:
        hoja_vida = (
            db.query(HojaDeVida)
            .filter(HojaDeVida.usuario_id == usuario.id)
            .order_by(HojaDeVida.created_at.desc())
            .first()
        )
        if hoja_vida and hoja_vida.texto_extraido:
            cv_texto = hoja_vida.texto_extraido
            cv_data = cv_service.analyze_cv_content(hoja_vida.texto_extraido, hoja_vida.nombre_archivo)

        extra_row = db.execute(
            text("SELECT especialidad, ciudad, linkedin_url, github_url, nivel_experiencia FROM usuarios WHERE id = :uid"),
            {"uid": usuario.id}
        ).fetchone()
        completitud = 0
        if usuario.nombre and usuario.email:
            completitud += 40
        if usuario.telefono:
            completitud += 20
        if hoja_vida is not None:
            completitud += 40

        perfil_info = {
            "nombre": usuario.nombre or usuario.email.split("@")[0],
            "email": usuario.email,
            "telefono": usuario.telefono,
            "especialidad": (extra_row[0] if extra_row else None) or "Desarrollo de Software / Tecnología",
            "ciudad": (extra_row[1] if extra_row else None) or "Bogotá, Colombia",
            "linkedin_url": (extra_row[2] if extra_row else None) or "",
            "github_url": (extra_row[3] if extra_row else None) or "",
            "nivel_experiencia": (extra_row[4] if extra_row else None) or "Junior",
            "completitud": completitud,
        }

        posts = (
            db.query(Postulacion)
            .filter(Postulacion.usuario_id == usuario.id)
            .order_by(Postulacion.created_at.desc())
            .all()
        )
        for p in posts:
            vac = p.vacante
            emp = vac.empresa if vac else None
            postulaciones_list.append({
                "id": p.id,
                "position": vac.titulo if vac else "Vacante",
                "company": emp.nombre if emp else "Empresa",
                "status": (
                "En revisión"
                if p.estado == "postulado"
                else "CV analizado"
                if p.estado == "cv_analizado"
                else p.estado
            ),
                "date": p.created_at.strftime("%Y-%m-%d") if p.created_at else "Hoy",
                "match": float(p.puntaje_cv or 70.0),
            })

        sesiones = (
            db.query(SesionPrueba)
            .filter(SesionPrueba.usuario_id == usuario.id)
            .order_by(SesionPrueba.fecha_inicio.desc())
            .all()
        )
        for s in sesiones:
            sesiones_list.append({
                "id": s.id,
                "modo": s.modo,
                "estado": s.estado,
                "puntaje": float(s.puntaje) if s.puntaje is not None else None,
            })

    vacantes_evaluadas = cv_service.build_real_vacancy_matches(cv_texto, vacancies_list)

    chat_result = cv_service.generate_dynamic_chat_response(
        user_message=data.mensaje,
        context={
            "perfil": perfil_info,
            "cv": cv_data,
            "cv_texto": cv_texto,
            "vacantes_evaluadas": vacantes_evaluadas,
            "postulaciones": postulaciones_list,
            "sesiones": sesiones_list,
        },
        history=data.historial,
    )

    return {
        "status": "ok",
        "respuesta": chat_result["respuesta"],
        "fuente": chat_result.get("fuente", "postgresql"),
        "tipo_consulta": chat_result.get("tipo_consulta", "general"),
        "score": cv_data.get("score") if cv_data else None,
        "es_apto": cv_data.get("es_apto") if cv_data else None,
        "habilidades": cv_data.get("habilidades_detectadas") if cv_data else []
    }


class EvaluarVacanteRequest(BaseModel):
    vacante_id: int
    email_usuario: Optional[str] = None
    texto_cv: Optional[str] = None


class RespuestaFiltroItem(BaseModel):
    id: Optional[str] = None
    pregunta: str
    respuesta: str


class PostularVacanteRequest(BaseModel):
    vacante_id: int
    email_usuario: Optional[str] = None
    respuestas_filtro: Optional[List[RespuestaFiltroItem]] = None


@router.get("/vacantes")
def list_available_vacancies(
    q: Optional[str] = None,
    ciudad: Optional[str] = None,
    modalidad: Optional[str] = None,
    experiencia: Optional[str] = None,
    tipo_contrato: Optional[str] = None,
    salario_rango: Optional[str] = None,
    salario_min: Optional[int] = None,
    salario_max: Optional[int] = None,
    categoria: Optional[str] = None,
    fecha: Optional[str] = None,
    orden: Optional[str] = "recientes",
    db: Session = Depends(get_db),
):
    """Obtiene las vacantes reales disponibles registradas en PostgreSQL con filtros estilo portal de empleo."""
    query = (
        db.query(Vacante)
        .options(joinedload(Vacante.empresa), joinedload(Vacante.perfil))
        .filter(Vacante.estado == "abierta")
    )
    if modalidad and modalidad.strip().lower() not in ("todas", "todos", ""):
        query = query.filter(func.lower(Vacante.modalidad) == modalidad.strip().lower())

    vacantes_db = query.order_by(Vacante.created_at.desc(), Vacante.id.desc()).all()

    postulados_map = dict(
        db.query(Postulacion.vacante_id, func.count(Postulacion.id))
        .group_by(Postulacion.vacante_id)
        .all()
    )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    q_norm = q.strip().lower() if q and q.strip() else ""
    ciudad_norm = ciudad.strip().lower() if ciudad and ciudad.strip() else ""
    exp_norm = experiencia.strip().lower() if experiencia and experiencia.strip() else ""
    contrato_norm = tipo_contrato.strip().lower() if tipo_contrato and tipo_contrato.strip() else ""
    sal_rango_norm = salario_rango.strip().lower() if salario_rango and salario_rango.strip() else ""
    cat_norm = categoria.strip().lower() if categoria and categoria.strip() else ""
    fecha_norm = fecha.strip().lower() if fecha and fecha.strip() else ""

    bracket_bounds = {
        "menos_2m": (0, 2_000_000),
        "2m_4m": (2_000_000, 4_000_000),
        "4m_7m": (4_000_000, 7_000_000),
        "mas_7m": (7_000_000, 10**9),
    }

    resultado = []
    for v in vacantes_db:
        emp = v.empresa
        empresa_nombre = (emp.nombre_comercial or emp.nombre) if emp else "Empresa Destacada"
        sector = (emp.sector if emp else None) or v.categoria_area or "Empresarial"
        categoria_area = v.categoria_area or sector
        modalidad_label = v.modalidad.capitalize() if v.modalidad else "Remoto"
        departamento_val = v.departamento or ""
        ciudad_val = v.ciudad or ("Remoto (Colombia)" if (v.modalidad or "").lower() == "remoto" else "Colombia")
        salario_visible = True if v.salario_visible is None else bool(v.salario_visible)
        min_cop = int(v.salario_min_cop) if v.salario_min_cop is not None else None
        max_cop = int(v.salario_max_cop) if v.salario_max_cop is not None else None
        salario_val = build_salary_display(
            esquema_salarial=v.esquema_salarial,
            salario_min_cop=min_cop,
            salario_max_cop=max_cop,
            salario_visible=salario_visible,
            fallback_text=v.salario,
            for_public=True,
        )
        experiencia_val = v.experiencia or "Sin experiencia / Primer empleo"
        contrato_val = v.tipo_contrato or "Término Indefinido"
        jornada_val = v.jornada or "Tiempo Completo"
        habilidades = parse_json_list_str(v.habilidades_clave)
        idiomas = parse_json_idiomas(v.idiomas)

        if q_norm:
            haystack = " ".join([
                v.titulo or "",
                categoria_area or "",
                v.descripcion or "",
                v.funciones or "",
                v.requisitos or "",
                " ".join(habilidades),
                empresa_nombre,
                sector or "",
            ]).lower()
            if q_norm not in haystack:
                continue

        if ciudad_norm and ciudad_norm not in ("todas", "todos"):
            loc_str = f"{ciudad_val} {departamento_val} {modalidad_label}".lower()
            if ciudad_norm not in loc_str:
                continue

        if cat_norm and cat_norm not in ("todas", "todos"):
            if cat_norm not in categoria_area.lower() and cat_norm not in (sector or "").lower():
                continue

        if exp_norm and exp_norm not in ("todas", "todos"):
            if exp_norm not in experiencia_val.lower():
                continue

        if contrato_norm and contrato_norm not in ("todas", "todos"):
            if contrato_norm not in contrato_val.lower():
                continue

        if sal_rango_norm and sal_rango_norm not in ("todos", "todas"):
            if sal_rango_norm == "a_convenir":
                if (v.esquema_salarial or "a_convenir") != "a_convenir" and min_cop is not None:
                    continue
            elif sal_rango_norm in bracket_bounds:
                b_min, b_max = bracket_bounds[sal_rango_norm]
                if not salario_visible or min_cop is None:
                    continue
                v_high = max_cop if max_cop is not None else min_cop
                if v_high < b_min or min_cop > b_max:
                    continue

        if salario_min is not None or salario_max is not None:
            if not salario_visible or min_cop is None:
                continue
            v_high = max_cop if max_cop is not None else min_cop
            if salario_min is not None and v_high < salario_min:
                continue
            if salario_max is not None and min_cop > salario_max:
                continue

        if fecha_norm and v.created_at:
            delta = now - v.created_at
            if fecha_norm == "hoy" and delta > timedelta(days=1):
                continue
            if fecha_norm == "3dias" and delta > timedelta(days=3):
                continue
            if fecha_norm == "semana" and delta > timedelta(days=7):
                continue
            if fecha_norm == "mes" and delta > timedelta(days=30):
                continue

        reqs_list = [
            line.strip().lstrip("•-*").strip()
            for line in (v.requisitos or "").splitlines()
            if line.strip() and len(line.strip().lstrip("•-*").strip()) > 3
        ]
        resultado.append({
            "id": v.id,
            "titulo": v.titulo,
            "empresa": empresa_nombre,
            "empresa_logo_url": (
                f"/api/v1/empresa/perfil/logo/{emp.id}" if (emp and emp.logo_path and Path(emp.logo_path).is_file()) else None
            ),
            "sector": sector,
            "categoria_area": categoria_area,
            "cantidad_vacantes": int(v.cantidad_vacantes or 1),
            "modalidad": modalidad_label,
            "departamento": departamento_val,
            "ciudad": ciudad_val,
            "esquema_salarial": v.esquema_salarial or "a_convenir",
            "salario": salario_val,
            "salario_min_cop": min_cop if salario_visible else None,
            "salario_max_cop": max_cop if salario_visible else None,
            "salario_visible": salario_visible,
            "beneficios": v.beneficios or "",
            "experiencia": experiencia_val,
            "nivel_educativo": v.nivel_educativo or "No requerido",
            "tipo_contrato": contrato_val,
            "jornada": jornada_val,
            "descripcion": v.descripcion,
            "funciones": v.funciones or "",
            "requisitos": reqs_list,
            "requisitos_raw": v.requisitos,
            "requisitos_indispensables": v.requisitos_indispensables or "",
            "requisitos_deseables": v.requisitos_deseables or "",
            "habilidades_clave": habilidades,
            "idiomas": idiomas,
            "preguntas_filtro": parse_json_preguntas(v.preguntas_filtro),
            "puntaje_minimo": float(v.puntaje_minimo or 70.0),
            "peso_cv": float(v.peso_cv or 30.0),
            "peso_prueba": float(v.peso_prueba or 70.0),
            "duracion_prueba_minutos": v.duracion_prueba_minutos,
            "perfil_nombre": v.perfil.nombre if v.perfil else None,
            "total_postulados": postulados_map.get(v.id, 0),
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "estado": v.estado,
        })

    if orden == "puntaje_asc":
        resultado.sort(key=lambda item: item["puntaje_minimo"])
    elif orden == "puntaje_desc":
        resultado.sort(key=lambda item: item["puntaje_minimo"], reverse=True)
    elif orden == "salario_desc":
        resultado.sort(key=lambda item: item.get("salario_min_cop") or 0, reverse=True)

    return resultado


@router.post("/vacantes/evaluar")
def evaluate_candidate_for_vacancy(
    data: EvaluarVacanteRequest,
    db: Session = Depends(get_db)
):
    """Compara la Hoja de Vida real del candidato con los requerimientos específicos del empleador para esa vacante."""
    vacante = db.query(Vacante).filter(Vacante.id == data.vacante_id).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="Vacante no encontrada en la base de datos.")

    usuario = None
    if data.email_usuario:
        usuario = db.query(Usuario).filter(Usuario.email == data.email_usuario.strip().lower()).first()
    if not usuario:
        usuario = db.query(Usuario).filter(Usuario.rol == "usuario").first()

    cv_text = data.texto_cv or ""
    cv_nombre = "Texto Ingresado"

    if not cv_text and usuario:
        hoja_vida = db.query(HojaDeVida).filter(HojaDeVida.usuario_id == usuario.id).order_by(HojaDeVida.created_at.desc()).first()
        if hoja_vida:
            cv_text = hoja_vida.texto_extraido or ""
            cv_nombre = hoja_vida.nombre_archivo

    reqs_list = [
        line.strip().lstrip("•-*").strip()
        for line in (vacante.requisitos or "").splitlines()
        if line.strip() and len(line.strip().lstrip("•-*").strip()) > 3
    ]

    if not cv_text or len(cv_text.strip()) < 15:
        return {
            "tiene_cv": False,
            "vacante_id": vacante.id,
            "vacante_titulo": vacante.titulo,
            "empresa": vacante.empresa.nombre if vacante.empresa else "Empresa",
            "requerimientos_empleador": reqs_list,
            "mensaje": "Debes subir tu Hoja de Vida para que la IA verifique cuáles requerimientos cumples y cuáles te hacen falta para esta vacante."
        }

    empresa_nombre = vacante.empresa.nombre if vacante.empresa else "Empresa"
    diagnostico = cv_service.evaluate_cv_for_vacancy(
        cv_text=cv_text,
        vacancy_title=vacante.titulo,
        vacancy_requirements_raw=vacante.requisitos or "",
        company_name=empresa_nombre
    )
    diagnostico["tiene_cv"] = True
    diagnostico["vacante_id"] = vacante.id
    diagnostico["cv_nombre"] = cv_nombre
    diagnostico["requerimientos_empleador"] = reqs_list
    return diagnostico


@router.post("/vacantes/postular")
def apply_to_vacancy(
    data: PostularVacanteRequest,
    db: Session = Depends(get_db)
):
    """Registra la postulación real del candidato en PostgreSQL si tiene CV."""
    vacante = db.query(Vacante).filter(Vacante.id == data.vacante_id).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="Vacante no encontrada.")
    if vacante.estado != "abierta":
        raise HTTPException(status_code=400, detail="Esta vacante aún no ha sido aprobada por un administrador o ya fue cerrada.")

    usuario = None
    if data.email_usuario:
        usuario = db.query(Usuario).filter(Usuario.email == data.email_usuario.strip().lower()).first()
    if not usuario:
        usuario = db.query(Usuario).filter(Usuario.rol == "usuario").first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    hoja_vida = db.query(HojaDeVida).filter(HojaDeVida.usuario_id == usuario.id).order_by(HojaDeVida.created_at.desc()).first()
    if not hoja_vida:
        raise HTTPException(status_code=400, detail="No puedes postularte sin haber subido tu Hoja de Vida.")

    # Verificar si ya se postuló
    postulacion_existente = db.query(Postulacion).filter(
        Postulacion.vacante_id == vacante.id,
        Postulacion.usuario_id == usuario.id
    ).first()

    if postulacion_existente:
        return {
            "status": "ya_postulado",
            "mensaje": "Ya te habías postulado a esta vacante.",
            "postulacion_id": postulacion_existente.id,
            "estado": postulacion_existente.estado
        }

    preguntas_vac = parse_json_preguntas(vacante.preguntas_filtro)
    respuestas_in = data.respuestas_filtro or []
    respuestas_map = {r.pregunta.strip().lower(): r.respuesta.strip() for r in respuestas_in if r.pregunta.strip()}
    for q_item in preguntas_vac:
        if q_item.get("obligatoria") and not respuestas_map.get(q_item["pregunta"].strip().lower()):
            raise HTTPException(
                status_code=400,
                detail=f"Debes responder la pregunta filtro obligatoria: {q_item['pregunta']}",
            )

    respuestas_json = (
        json.dumps(
            [{"pregunta": r.pregunta.strip(), "respuesta": r.respuesta.strip()} for r in respuestas_in if r.pregunta.strip()],
            ensure_ascii=False,
        )
        if respuestas_in
        else None
    )

    nueva_postulacion = Postulacion(
        vacante_id=vacante.id,
        usuario_id=usuario.id,
        hoja_vida_id=hoja_vida.id,
        estado="postulado",
        respuestas_filtro=respuestas_json,
    )
    db.add(nueva_postulacion)
    db.commit()
    db.refresh(nueva_postulacion)

    analisis_res = cv_ai_analyzer.analizar_postulacion_con_ia(db, nueva_postulacion.id)

    return {
        "status": "exito",
        "mensaje": f"¡Postulación registrada y analizada exitosamente para {vacante.titulo}!",
        "postulacion_id": nueva_postulacion.id,
        "estado_postulacion": analisis_res["estado_postulacion"],
        "proveedor_usado": analisis_res["proveedor_usado"],
        "match_score": analisis_res["puntaje_afinidad"],
        "requisitos_cumplidos": analisis_res["habilidades_detectadas"],
        "requisitos_faltantes": analisis_res["habilidades_faltantes"],
        "alertas": analisis_res["alertas"],
    }


@router.post("/postulaciones/{postulacion_id}/analizar")
def analyze_existing_application(
    postulacion_id: int,
    db: Session = Depends(get_db),
):
    """Analiza (o re-analiza) una postulación existente y hace upsert en analisis_cv."""
    try:
        return cv_ai_analyzer.analizar_postulacion_con_ia(db, postulacion_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


class ConsentimientoIARequest(BaseModel):
    email: str
    aceptado: bool


@router.get("/privacidad/consentimiento-ia")
def get_external_ai_consent(
    email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Consulta si el candidato aceptó envío anonimizado a IA externa (tipo='terceros')."""
    if not email or not email.strip():
        return {"aceptado": False, "puede_enviar_externa": False}
    usuario = db.query(Usuario).filter(Usuario.email == email.strip().lower()).first()
    if not usuario:
        return {"aceptado": False, "puede_enviar_externa": False}

    ultimo = (
        db.query(HistorialConsentimiento)
        .filter(
            HistorialConsentimiento.usuario_id == usuario.id,
            HistorialConsentimiento.tipo == "terceros",
        )
        .order_by(HistorialConsentimiento.created_at.desc(), HistorialConsentimiento.id.desc())
        .first()
    )
    return {
        "aceptado": bool(ultimo and ultimo.aceptado),
        "puede_enviar_externa": cv_ai_analyzer.puede_enviar_a_ia_externa(db, usuario.id),
    }


@router.post("/privacidad/consentimiento-ia")
def set_external_ai_consent(
    data: ConsentimientoIARequest,
    db: Session = Depends(get_db),
):
    """Registra una nueva fila append-only en historial_consentimientos (tipo='terceros')."""
    usuario = db.query(Usuario).filter(Usuario.email == data.email.strip().lower()).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    registro = HistorialConsentimiento(
        usuario_id=usuario.id,
        tipo="terceros",
        aceptado=data.aceptado,
    )
    db.add(registro)
    db.commit()
    return {
        "status": "ok",
        "aceptado": data.aceptado,
        "puede_enviar_externa": cv_ai_analyzer.puede_enviar_a_ia_externa(db, usuario.id),
    }


@router.get("/postulaciones")
def get_user_applications(
    email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retorna las postulaciones reales del usuario desde PostgreSQL."""
    usuario = None
    if email:
        usuario = db.query(Usuario).filter(Usuario.email == email.strip().lower()).first()
    if not usuario:
        usuario = db.query(Usuario).filter(Usuario.rol == "usuario").first()

    if not usuario:
        return []

    posts = db.query(Postulacion).filter(Postulacion.usuario_id == usuario.id).order_by(Postulacion.created_at.desc()).all()
    resultado = []
    for p in posts:
        vac = p.vacante
        emp = vac.empresa if vac else None
        etapa = getattr(p, "etapa_seleccion", None) or "postulado"
        status_label = (
            ATS_STAGE_LABELS[etapa]
            if etapa != "postulado" and etapa in ATS_STAGE_LABELS
            else (
                "En revisión"
                if p.estado == "postulado"
                else "CV analizado"
                if p.estado == "cv_analizado"
                else p.estado
            )
        )
        resultado.append({
            "id": p.id,
            "vacante_id": p.vacante_id,
            "position": vac.titulo if vac else "Vacante",
            "company": emp.nombre if emp else "Empresa",
            "status": status_label,
            "etapa_seleccion": etapa,
            "respuestas_filtro": parse_json_respuestas(getattr(p, "respuestas_filtro", None)),
            "date": p.created_at.strftime("%Y-%m-%d") if p.created_at else "Hoy",
            "match": float(p.puntaje_cv or 70.0),
            "statusColor": "bg-blue-500"
        })
    return resultado


@router.delete("/cv/eliminar")
def delete_candidate_cv(
    email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Elimina la Hoja de Vida cargada del candidato para permitirle reiniciar o actualizar."""
    usuario = None
    if email:
        usuario = db.query(Usuario).filter(Usuario.email == email.strip().lower()).first()
    if not usuario:
        usuario = db.query(Usuario).filter(Usuario.rol == "usuario").first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    hojas = db.query(HojaDeVida).filter(HojaDeVida.usuario_id == usuario.id).all()
    for h in hojas:
        if h.url_archivo:
            p = Path(h.url_archivo)
            if p.is_file():
                p.unlink(missing_ok=True)
            cover_p = Path(f"{h.url_archivo}.cover.png")
            if cover_p.is_file():
                cover_p.unlink(missing_ok=True)
    eliminadas = db.query(HojaDeVida).filter(HojaDeVida.usuario_id == usuario.id).delete()
    db.commit()
    return {"status": "ok", "mensaje": "Hoja de Vida eliminada correctamente de PostgreSQL.", "cvs_eliminados": eliminadas}


def _serialize_recurso(r: RecursoPreparacion) -> dict:
    has_file = bool(r.ruta_archivo and Path(r.ruta_archivo).is_file())
    return {
        "id": r.id,
        "titulo": r.titulo,
        "descripcion": r.descripcion or "",
        "categoria": r.categoria,
        "tipo": r.tipo,
        "url_externa": r.url_externa,
        "nombre_archivo": r.nombre_archivo,
        "tiene_archivo": has_file,
        "archivo_url": f"/api/v1/auth/recursos/{r.id}/archivo" if has_file else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/recursos")
def list_preparation_resources(db: Session = Depends(get_db)):
    """Lista únicamente los recursos de preparación reales guardados en PostgreSQL."""
    recursos = (
        db.query(RecursoPreparacion)
        .order_by(RecursoPreparacion.created_at.desc(), RecursoPreparacion.id.desc())
        .all()
    )
    return [_serialize_recurso(r) for r in recursos]


@router.get("/recursos/{recurso_id}/archivo")
def download_preparation_resource(
    recurso_id: int,
    download: bool = False,
    db: Session = Depends(get_db),
):
    recurso = db.query(RecursoPreparacion).filter(RecursoPreparacion.id == recurso_id).first()
    if not recurso or not recurso.ruta_archivo:
        raise HTTPException(status_code=404, detail="Archivo del recurso no encontrado.")
    file_path = Path(recurso.ruta_archivo)
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="El archivo ya no existe en el servidor.")
    return FileResponse(
        path=str(file_path),
        filename=recurso.nombre_archivo or file_path.name,
        content_disposition_type="attachment" if download else "inline",
    )


def _serialize_vacante_resumen(v: Vacante, applied_ids: set[int]) -> dict:
    reqs = [
        line.strip().lstrip("•-*").strip()
        for line in (v.requisitos or "").splitlines()
        if line.strip() and len(line.strip().lstrip("•-*").strip()) > 3
    ]
    return {
        "id": v.id,
        "titulo": v.titulo,
        "descripcion": v.descripcion or "",
        "requisitos": reqs,
        "modalidad": v.modalidad.capitalize() if v.modalidad else "Remoto",
        "ciudad": v.ciudad or ("Remoto (Colombia)" if v.modalidad == "remoto" else "Colombia"),
        "salario": v.salario or "A convenir",
        "experiencia": v.experiencia or "Sin experiencia / Junior",
        "tipo_contrato": v.tipo_contrato or "Término indefinido",
        "jornada": v.jornada or "Tiempo completo",
        "puntaje_minimo": float(v.puntaje_minimo or 60.0),
        "preguntas_filtro": parse_json_preguntas(v.preguntas_filtro),
        "estado": v.estado,
        "ya_postulado": v.id in applied_ids,
    }


@router.get("/notificaciones")
def get_candidate_notifications(
    email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Retorna las notificaciones reales en PostgreSQL para el candidato."""
    if not email or not email.strip():
        return []
    usuario = db.query(Usuario).filter(Usuario.email == email.strip().lower()).first()
    if not usuario:
        return []

    notifs = (
        db.query(Notificacion)
        .options(joinedload(Notificacion.empresa), joinedload(Notificacion.vacante))
        .filter(Notificacion.usuario_id == usuario.id)
        .order_by(Notificacion.created_at.desc(), Notificacion.id.desc())
        .all()
    )

    applied_ids = {
        row[0]
        for row in db.query(Postulacion.vacante_id).filter(Postulacion.usuario_id == usuario.id).all()
    }

    empresa_ids = {n.empresa_id for n in notifs if n.empresa_id and not n.vacante_id}
    open_by_empresa: dict[int, list[Vacante]] = {}
    if empresa_ids:
        open_vacs = (
            db.query(Vacante)
            .filter(Vacante.empresa_id.in_(empresa_ids), Vacante.estado == "abierta")
            .order_by(Vacante.created_at.desc())
            .all()
        )
        for v in open_vacs:
            open_by_empresa.setdefault(v.empresa_id, []).append(v)

    resultado = []
    for n in notifs:
        emp = n.empresa
        vac = n.vacante
        empresa_vacantes = (
            [_serialize_vacante_resumen(v, applied_ids) for v in open_by_empresa.get(n.empresa_id, [])]
            if (n.empresa_id and not vac)
            else []
        )
        resultado.append({
            "id": n.id,
            "tipo": n.tipo,
            "titulo": n.titulo,
            "mensaje": n.mensaje or "",
            "leida": bool(n.leida),
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "empresa": {
                "id": emp.id,
                "nombre": emp.nombre,
                "sector": emp.sector or "Empresarial",
                "sitio_web": emp.sitio_web,
            }
            if emp
            else None,
            "vacante": _serialize_vacante_resumen(vac, applied_ids) if vac else None,
            "empresa_vacantes": empresa_vacantes,
        })
    return resultado


@router.patch("/notificaciones/{notif_id}/leer")
def mark_notification_as_read(
    notif_id: int,
    email: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Marca una notificación real como leída en PostgreSQL."""
    notif = db.query(Notificacion).filter(Notificacion.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada.")
    if email and email.strip():
        usuario = db.query(Usuario).filter(Usuario.email == email.strip().lower()).first()
        if usuario and notif.usuario_id != usuario.id:
            raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta notificación.")
    if not notif.leida:
        notif.leida = True
        db.commit()
    return {"status": "ok", "id": notif.id, "leida": True}
