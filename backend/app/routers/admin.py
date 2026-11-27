"""Router de administración conectado a PostgreSQL: usuarios reales, métricas y gestión de roles."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.ejercicios import Ejercicio, PerfilProfesional, RecursoPreparacion
from app.models.seleccion import DecisionPostulacion, Empresa, HojaDeVida, Postulacion, Vacante
from app.models.sesiones import SesionPrueba
from app.models.usuarios import SesionAuth, Usuario
from app.services import cv_service

router = APIRouter()

VALID_ROLES = ("usuario", "reclutador", "admin", "agente_soporte")


def _utcnow() -> datetime:
    """UTC naive para compatibilidad con columnas TIMESTAMP sin zona horaria."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _ensure_primary_admin(db: Session) -> None:
    """Garantiza que exista exactamente un administrador principal marcado si hay admins activos."""
    has_primary = (
        db.query(Usuario.id)
        .filter(Usuario.rol == "admin", Usuario.es_admin_principal.is_(True), Usuario.deleted_at.is_(None))
        .first()
    )
    if has_primary:
        return

    first_admin = (
        db.query(Usuario)
        .filter(Usuario.rol == "admin", Usuario.deleted_at.is_(None))
        .order_by(Usuario.created_at.asc(), Usuario.id.asc())
        .first()
    )
    if first_admin:
        first_admin.es_admin_principal = True
        db.commit()


def _serialize_user(
    u: Usuario,
    extra_cols: dict[int, tuple[Optional[str], Optional[str]]],
    latest_cv_map: dict[int, HojaDeVida],
    cv_counts: dict[int, int],
    postulacion_counts: dict[int, int],
    vacante_counts: dict[int, int],
) -> dict:
    extra = extra_cols.get(u.id, (None, None))
    latest_cv = latest_cv_map.get(u.id)
    cv_score = None
    if latest_cv and latest_cv.texto_extraido:
        cv_score = cv_service.analyze_cv_content(
            latest_cv.texto_extraido,
            latest_cv.nombre_archivo,
        )["score"]

    especialidad = extra[0]
    if not especialidad and u.empresa:
        especialidad = u.empresa.sector or u.empresa.nombre

    return {
        "id": u.id,
        "nombre": u.nombre or u.email.split("@")[0],
        "email": u.email,
        "telefono": u.telefono,
        "rol": u.rol,
        "es_admin_principal": bool(u.es_admin_principal),
        "empresa_id": u.empresa_id,
        "empresa_nombre": u.empresa.nombre if u.empresa else None,
        "especialidad": especialidad or "Sin especificar",
        "ciudad": extra[1] or "",
        "email_verificado": bool(u.email_verificado),
        "activo": u.deleted_at is None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "cv_count": cv_counts.get(u.id, 0),
        "cv_nombre": latest_cv.nombre_archivo if latest_cv else None,
        "cv_score": cv_score,
        "postulaciones_count": postulacion_counts.get(u.id, 0),
        "vacantes_count": vacante_counts.get(u.id, 0),
    }


def _load_user_context(db: Session, users: list[Usuario]) -> tuple[dict, dict, dict, dict, dict]:
    extra_rows = db.execute(text("SELECT id, especialidad, ciudad FROM usuarios")).fetchall()
    extra_cols = {row[0]: (row[1], row[2]) for row in extra_rows}

    cv_rows = (
        db.query(HojaDeVida)
        .order_by(HojaDeVida.usuario_id.asc(), HojaDeVida.created_at.desc(), HojaDeVida.id.desc())
        .all()
    )
    latest_cv_map: dict[int, HojaDeVida] = {}
    cv_counts: dict[int, int] = {}
    for cv in cv_rows:
        cv_counts[cv.usuario_id] = cv_counts.get(cv.usuario_id, 0) + 1
        if cv.usuario_id not in latest_cv_map:
            latest_cv_map[cv.usuario_id] = cv

    postulacion_counts = dict(
        db.query(Postulacion.usuario_id, func.count(Postulacion.id))
        .group_by(Postulacion.usuario_id)
        .all()
    )
    vacante_counts = dict(
        db.query(Vacante.reclutador_id, func.count(Vacante.id))
        .group_by(Vacante.reclutador_id)
        .all()
    )
    return extra_cols, latest_cv_map, cv_counts, postulacion_counts, vacante_counts


class RoleUpdateRequest(BaseModel):
    rol: Literal["usuario", "reclutador", "admin", "agente_soporte"]
    empresa_id: Optional[int] = None
    empresa_nombre: Optional[str] = Field(default=None, max_length=150)


class StatusUpdateRequest(BaseModel):
    activo: bool


class CategoryCreateRequest(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    descripcion: Optional[str] = Field(default=None, max_length=255)


@router.get("/overview")
def get_admin_overview(
    admin_actual: Usuario = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Retorna estadísticas reales, usuarios inscritos, empresas, categorías y analíticas desde PostgreSQL."""
    _ensure_primary_admin(db)
    db.refresh(admin_actual)

    users = (
        db.query(Usuario)
        .options(joinedload(Usuario.empresa))
        .order_by(Usuario.id.asc())
        .all()
    )
    extra_cols, latest_cv_map, cv_counts, postulacion_counts, vacante_counts = _load_user_context(db, users)

    serialized_users = [
        _serialize_user(u, extra_cols, latest_cv_map, cv_counts, postulacion_counts, vacante_counts)
        for u in users
    ]

    active_users = [u for u in users if u.deleted_at is None]
    candidates_count = sum(1 for u in active_users if u.rol == "usuario")
    companies_count = sum(1 for u in active_users if u.rol == "reclutador")
    admins_count = sum(1 for u in active_users if u.rol == "admin")
    support_count = sum(1 for u in active_users if u.rol == "agente_soporte")
    suspended_count = sum(1 for u in users if u.deleted_at is not None)

    total_vacantes = db.query(Vacante).count()
    active_vacantes = db.query(Vacante).filter(Vacante.estado == "abierta").count()
    pending_vacantes = db.query(Vacante).filter(Vacante.estado == "pendiente_aprobacion").count()
    total_postulaciones = db.query(Postulacion).count()
    approved_postulaciones = db.query(Postulacion).filter(Postulacion.estado == "aprobado").count()
    total_cvs = db.query(HojaDeVida).count()
    total_sesiones = db.query(SesionPrueba).count()

    since_30d = _utcnow() - timedelta(days=30)
    recent_users_30d = sum(1 for u in users if u.created_at and u.created_at >= since_30d)

    active_total = len(active_users)
    candidate_ids_with_cv = {
        u.id for u in active_users if u.rol == "usuario" and cv_counts.get(u.id, 0) > 0
    }
    cv_completion_rate = round((len(candidate_ids_with_cv) / candidates_count) * 100, 1) if candidates_count else 0.0
    avg_apps_per_vacancy = round(total_postulaciones / total_vacantes, 1) if total_vacantes else 0.0

    def _pct(count: int) -> float:
        return round((count / active_total) * 100, 1) if active_total else 0.0

    empresas = db.query(Empresa).order_by(Empresa.id.asc()).all()
    empresa_vac_counts = dict(
        db.query(Vacante.empresa_id, func.count(Vacante.id)).group_by(Vacante.empresa_id).all()
    )
    empresa_rec_counts = dict(
        db.query(Usuario.empresa_id, func.count(Usuario.id))
        .filter(Usuario.empresa_id.is_not(None), Usuario.deleted_at.is_(None))
        .group_by(Usuario.empresa_id)
        .all()
    )
    serialized_empresas = [
        {
            "id": e.id,
            "nombre": e.nombre,
            "razon_social": e.razon_social,
            "nombre_comercial": e.nombre_comercial,
            "tipo_persona": e.tipo_persona or "juridica",
            "nit": e.nit,
            "digito_verificacion": e.digito_verificacion,
            "rut_numero": e.rut_numero,
            "codigo_ciiu": e.codigo_ciiu,
            "sector": e.sector,
            "tamano_empresa": e.tamano_empresa,
            "departamento": e.departamento,
            "ciudad": e.ciudad,
            "acepta_ley_1581": bool(e.acepta_ley_1581),
            "activa": bool(e.activa),
            "reclutadores_count": empresa_rec_counts.get(e.id, 0),
            "vacantes_count": empresa_vac_counts.get(e.id, 0),
        }
        for e in empresas
    ]

    perfiles = db.query(PerfilProfesional).order_by(PerfilProfesional.id.asc()).all()
    perfil_vac_counts = dict(
        db.query(Vacante.perfil_id, func.count(Vacante.id))
        .filter(Vacante.perfil_id.is_not(None))
        .group_by(Vacante.perfil_id)
        .all()
    )
    perfil_ej_counts = dict(
        db.query(Ejercicio.perfil_id, func.count(Ejercicio.id))
        .filter(Ejercicio.perfil_id.is_not(None))
        .group_by(Ejercicio.perfil_id)
        .all()
    )
    serialized_categories = [
        {
            "id": p.id,
            "nombre": p.nombre,
            "descripcion": p.descripcion or "",
            "vacantes_count": perfil_vac_counts.get(p.id, 0),
            "ejercicios_count": perfil_ej_counts.get(p.id, 0),
        }
        for p in perfiles
    ]

    vacantes_db = (
        db.query(Vacante)
        .options(joinedload(Vacante.empresa), joinedload(Vacante.reclutador))
        .order_by(Vacante.created_at.desc(), Vacante.id.desc())
        .all()
    )
    vac_post_counts = dict(
        db.query(Postulacion.vacante_id, func.count(Postulacion.id))
        .group_by(Postulacion.vacante_id)
        .all()
    )
    estado_orden = {
        "pendiente_aprobacion": 0,
        "abierta": 1,
        "rechazada": 2,
        "borrador": 3,
        "cerrada": 4,
    }
    vacantes_db.sort(key=lambda v: (estado_orden.get(v.estado, 9), -(v.id or 0)))

    serialized_vacancies = [
        {
            "id": v.id,
            "titulo": v.titulo,
            "empresa_id": v.empresa_id,
            "empresa_nombre": v.empresa.nombre if v.empresa else "Empresa",
            "reclutador_id": v.reclutador_id,
            "reclutador_nombre": (v.reclutador.nombre or v.reclutador.email.split("@")[0]) if v.reclutador else "Reclutador",
            "reclutador_email": v.reclutador.email if v.reclutador else "",
            "modalidad": v.modalidad or "remoto",
            "categoria_area": v.categoria_area or "Empresarial",
            "cantidad_vacantes": int(v.cantidad_vacantes or 1),
            "departamento": v.departamento or "",
            "ciudad": v.ciudad or ("Remoto (Colombia)" if v.modalidad == "remoto" else "Colombia"),
            "salario": v.salario or "A convenir",
            "experiencia": v.experiencia or "Sin experiencia / Primer empleo",
            "nivel_educativo": v.nivel_educativo or "No requerido",
            "tipo_contrato": v.tipo_contrato or "Término Indefinido",
            "jornada": v.jornada or "Tiempo Completo",
            "descripcion": v.descripcion or "",
            "requisitos": [
                line.strip().lstrip("•-*").strip()
                for line in (v.requisitos or "").splitlines()
                if line.strip() and len(line.strip().lstrip("•-*").strip()) > 3
            ],
            "puntaje_minimo": float(v.puntaje_minimo or 60.0),
            "estado": v.estado,
            "motivo_rechazo": v.motivo_rechazo,
            "total_postulados": vac_post_counts.get(v.id, 0),
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "fecha_aprobacion": v.fecha_aprobacion.isoformat() if v.fecha_aprobacion else None,
        }
        for v in vacantes_db
    ]

    return {
        "current_admin": {
            "id": admin_actual.id,
            "nombre": admin_actual.nombre or admin_actual.email.split("@")[0],
            "email": admin_actual.email,
            "rol": admin_actual.rol,
            "es_admin_principal": bool(admin_actual.es_admin_principal),
        },
        "stats": {
            "total_users": len(users),
            "active_users": active_total,
            "suspended_users": suspended_count,
            "candidates": candidates_count,
            "companies": companies_count,
            "admins": admins_count,
            "support_agents": support_count,
            "active_jobs": active_vacantes,
            "pending_jobs": pending_vacantes,
            "total_jobs": total_vacantes,
            "total_applications": total_postulaciones,
            "total_cvs": total_cvs,
            "total_interviews": total_sesiones,
        },
        "users": serialized_users,
        "empresas": serialized_empresas,
        "categories": serialized_categories,
        "vacancies": serialized_vacancies,
        "resources": [
            {
                "id": r.id,
                "titulo": r.titulo,
                "descripcion": r.descripcion or "",
                "categoria": r.categoria,
                "tipo": r.tipo,
                "url_externa": r.url_externa,
                "nombre_archivo": r.nombre_archivo,
                "tiene_archivo": bool(r.ruta_archivo and Path(r.ruta_archivo).is_file()),
                "archivo_url": f"/api/v1/auth/recursos/{r.id}/archivo"
                if (r.ruta_archivo and Path(r.ruta_archivo).is_file())
                else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in db.query(RecursoPreparacion)
            .order_by(RecursoPreparacion.created_at.desc(), RecursoPreparacion.id.desc())
            .all()
        ],
        "analytics": {
            "role_distribution": {
                "usuario": {"count": candidates_count, "percent": _pct(candidates_count)},
                "reclutador": {"count": companies_count, "percent": _pct(companies_count)},
                "admin": {"count": admins_count, "percent": _pct(admins_count)},
                "agente_soporte": {"count": support_count, "percent": _pct(support_count)},
            },
            "cv_completion_rate": cv_completion_rate,
            "avg_applications_per_vacancy": avg_apps_per_vacancy,
            "approved_applications": approved_postulaciones,
            "recent_users_30d": recent_users_30d,
        },
    }


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    data: RoleUpdateRequest,
    admin_actual: Usuario = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Asigna o revoca roles (Candidato, Empresa, Administrador) respetando la jerarquía del Administrador Principal."""
    _ensure_primary_admin(db)
    db.refresh(admin_actual)

    target = db.query(Usuario).options(joinedload(Usuario.empresa)).filter(Usuario.id == user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")

    if target.id == admin_actual.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes modificar ni quitar tu propio rol desde aquí.")

    if target.es_admin_principal:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "El Administrador Principal está protegido y su rol no puede ser modificado ni removido.",
        )

    involves_admin_role = data.rol == "admin" or target.rol == "admin"
    if involves_admin_role and not admin_actual.es_admin_principal:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo el Administrador Principal puede asignar o quitar el rol de Administrador.",
        )

    if data.rol == "reclutador":
        empresa = None
        if data.empresa_id is not None:
            empresa = db.query(Empresa).filter(Empresa.id == data.empresa_id).first()
            if not empresa:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "La empresa seleccionada no existe.")
        elif data.empresa_nombre and data.empresa_nombre.strip():
            nombre_limpio = data.empresa_nombre.strip()
            empresa = (
                db.query(Empresa)
                .filter(func.lower(Empresa.nombre) == nombre_limpio.lower())
                .first()
            )
            if not empresa:
                empresa = Empresa(nombre=nombre_limpio, sector="Tecnología y Software", activa=True)
                db.add(empresa)
                db.flush()
        elif target.empresa_id:
            empresa = db.query(Empresa).filter(Empresa.id == target.empresa_id).first()

        if not empresa:
            base_name = target.nombre or target.email.split("@")[0]
            nombre_auto = f"Empresa de {base_name}"[:150]
            empresa = (
                db.query(Empresa)
                .filter(func.lower(Empresa.nombre) == nombre_auto.lower())
                .first()
            )
            if not empresa:
                empresa = Empresa(nombre=nombre_auto, sector="Empresarial", activa=True)
                db.add(empresa)
                db.flush()

        target.empresa_id = empresa.id
    else:
        target.empresa_id = None

    target.rol = data.rol
    if data.rol != "admin":
        target.es_admin_principal = False

    db.commit()
    db.refresh(target)

    extra_cols, latest_cv_map, cv_counts, postulacion_counts, vacante_counts = _load_user_context(db, [target])
    return {
        "status": "ok",
        "user": _serialize_user(target, extra_cols, latest_cv_map, cv_counts, postulacion_counts, vacante_counts),
    }


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    data: StatusUpdateRequest,
    admin_actual: Usuario = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Suspende o reactiva un usuario real en PostgreSQL."""
    _ensure_primary_admin(db)
    db.refresh(admin_actual)

    target = db.query(Usuario).options(joinedload(Usuario.empresa)).filter(Usuario.id == user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    if target.id == admin_actual.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes suspender tu propia cuenta.")
    if target.es_admin_principal:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No se puede suspender al Administrador Principal.")
    if target.rol == "admin" and not admin_actual.es_admin_principal:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el Administrador Principal puede suspender administradores.")

    if data.activo:
        target.deleted_at = None
    else:
        target.deleted_at = _utcnow()
        db.query(SesionAuth).filter(SesionAuth.usuario_id == target.id, SesionAuth.revocado.is_(False)).update(
            {"revocado": True}
        )

    db.commit()
    db.refresh(target)
    extra_cols, latest_cv_map, cv_counts, postulacion_counts, vacante_counts = _load_user_context(db, [target])
    return {
        "status": "ok",
        "user": _serialize_user(target, extra_cols, latest_cv_map, cv_counts, postulacion_counts, vacante_counts),
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    admin_actual: Usuario = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Elimina un usuario de PostgreSQL si no tiene registros históricos bloqueantes."""
    _ensure_primary_admin(db)
    db.refresh(admin_actual)

    target = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    if target.id == admin_actual.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes eliminar tu propia cuenta.")
    if target.es_admin_principal:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No se puede eliminar al Administrador Principal.")
    if target.rol == "admin" and not admin_actual.es_admin_principal:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el Administrador Principal puede eliminar administradores.")

    tiene_vacantes = db.query(Vacante.id).filter(Vacante.reclutador_id == target.id).first()
    tiene_decisiones = db.query(DecisionPostulacion.id).filter(DecisionPostulacion.reclutador_id == target.id).first()
    if tiene_vacantes or tiene_decisiones:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "No se puede eliminar este usuario porque tiene vacantes o decisiones asociadas. Puedes suspenderlo en su lugar.",
        )

    try:
        db.delete(target)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "No se puede eliminar el usuario porque tiene registros relacionados. Puedes suspenderlo en su lugar.",
        )

    return {"status": "ok", "deleted_user_id": user_id}


@router.post("/categories", status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreateRequest,
    _admin: Usuario = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    nombre = data.nombre.strip()
    existente = db.query(PerfilProfesional).filter(func.lower(PerfilProfesional.nombre) == nombre.lower()).first()
    if existente:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una categoría profesional con ese nombre.")

    categoria = PerfilProfesional(
        nombre=nombre,
        descripcion=(data.descripcion or "").strip() or None,
    )
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return {
        "id": categoria.id,
        "nombre": categoria.nombre,
        "descripcion": categoria.descripcion or "",
        "vacantes_count": 0,
        "ejercicios_count": 0,
    }


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    _admin: Usuario = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    categoria = db.query(PerfilProfesional).filter(PerfilProfesional.id == category_id).first()
    if not categoria:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoría no encontrada.")

    usado_vacantes = db.query(Vacante.id).filter(Vacante.perfil_id == category_id).first()
    usado_ejercicios = db.query(Ejercicio.id).filter(Ejercicio.perfil_id == category_id).first()
    if usado_vacantes or usado_ejercicios:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "No se puede eliminar esta categoría porque está asociada a vacantes o ejercicios.",
        )

    db.delete(categoria)
    db.commit()
    return {"status": "ok", "deleted_category_id": category_id}


class VacanteApprovalRequest(BaseModel):
    accion: Literal["aprobar", "rechazar", "cerrar", "pendiente"]
    motivo_rechazo: Optional[str] = Field(default=None, max_length=500)


@router.patch("/vacantes/{vacante_id}/approval")
def review_vacancy_approval(
    vacante_id: int,
    data: VacanteApprovalRequest,
    admin_actual: Usuario = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Permite al administrador aprobar, rechazar, cerrar o devolver a pendiente un empleo subido por una empresa."""
    vacante = db.query(Vacante).filter(Vacante.id == vacante_id).first()
    if not vacante:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vacante no encontrada.")

    if data.accion == "aprobar":
        vacante.estado = "abierta"
        vacante.motivo_rechazo = None
        vacante.aprobado_por_id = admin_actual.id
        vacante.fecha_aprobacion = _utcnow()
    elif data.accion == "rechazar":
        motivo = (data.motivo_rechazo or "").strip() or "Rechazada por el administrador."
        vacante.estado = "rechazada"
        vacante.motivo_rechazo = motivo
        vacante.aprobado_por_id = admin_actual.id
        vacante.fecha_aprobacion = _utcnow()
    elif data.accion == "cerrar":
        vacante.estado = "cerrada"
    elif data.accion == "pendiente":
        vacante.estado = "pendiente_aprobacion"
        vacante.motivo_rechazo = None
        vacante.aprobado_por_id = None
        vacante.fecha_aprobacion = None

    db.commit()
    db.refresh(vacante)
    return {
        "status": "ok",
        "vacante_id": vacante.id,
        "estado": vacante.estado,
        "motivo_rechazo": vacante.motivo_rechazo,
    }


RECURSOS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "recursos"
VALID_RECURSO_CATEGORIAS = ("Guías de Estudio", "Videos Tutoriales", "Plantillas Profesionales")


@router.post("/recursos", status_code=status.HTTP_201_CREATED)
async def create_preparation_resource(
    titulo: str = Form(...),
    categoria: str = Form(...),
    tipo: str = Form(...),
    descripcion: str = Form(""),
    url_externa: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    admin_actual: Usuario = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Publica un recurso real (archivo o enlace) en PostgreSQL para los candidatos."""
    titulo_limpio = titulo.strip()
    if len(titulo_limpio) < 3:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El título debe tener al menos 3 caracteres.")
    if categoria not in VALID_RECURSO_CATEGORIAS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Categoría de recurso inválida.")

    url_limpia = url_externa.strip() if url_externa and url_externa.strip() else None
    has_upload = bool(file and file.filename)
    if not has_upload and not url_limpia:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Debes adjuntar un archivo real o proporcionar una URL válida.",
        )

    nombre_archivo = None
    ruta_archivo = None
    if has_upload and file is not None:
        contents = await file.read()
        if not contents:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "El archivo subido está vacío.")
        RECURSOS_DIR.mkdir(parents=True, exist_ok=True)
        safe_name = Path(file.filename or "recurso").name.replace("\x00", "")[:180]
        dest_path = RECURSOS_DIR / f"{uuid.uuid4().hex[:12]}_{safe_name}"
        dest_path.write_bytes(contents)
        nombre_archivo = safe_name
        ruta_archivo = str(dest_path)

    recurso = RecursoPreparacion(
        titulo=titulo_limpio,
        descripcion=descripcion.strip() or None,
        categoria=categoria,
        tipo=tipo.strip()[:20] or "PDF",
        url_externa=url_limpia,
        nombre_archivo=nombre_archivo,
        ruta_archivo=ruta_archivo,
        creado_por_id=admin_actual.id,
    )
    db.add(recurso)
    db.commit()
    db.refresh(recurso)

    return {
        "id": recurso.id,
        "titulo": recurso.titulo,
        "descripcion": recurso.descripcion or "",
        "categoria": recurso.categoria,
        "tipo": recurso.tipo,
        "url_externa": recurso.url_externa,
        "nombre_archivo": recurso.nombre_archivo,
        "tiene_archivo": bool(recurso.ruta_archivo),
        "archivo_url": f"/api/v1/auth/recursos/{recurso.id}/archivo" if recurso.ruta_archivo else None,
        "created_at": recurso.created_at.isoformat() if recurso.created_at else None,
    }


@router.delete("/recursos/{recurso_id}")
def delete_preparation_resource(
    recurso_id: int,
    _admin: Usuario = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    recurso = db.query(RecursoPreparacion).filter(RecursoPreparacion.id == recurso_id).first()
    if not recurso:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recurso no encontrado.")

    if recurso.ruta_archivo:
        file_path = Path(recurso.ruta_archivo)
        if file_path.is_file():
            file_path.unlink(missing_ok=True)

    db.delete(recurso)
    db.commit()
    return {"status": "ok", "deleted_recurso_id": recurso_id}
