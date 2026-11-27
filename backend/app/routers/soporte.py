"""Router de mesa de ayuda y tickets de soporte técnico (Agente de Soporte y Superadmin)."""
from datetime import datetime, timezone
from typing import Literal, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user, is_support_authorized, require_support_agent
from app.models.soporte import MensajeTicket, TicketSoporte
from app.models.usuarios import Usuario

router = APIRouter()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class TicketCreateRequest(BaseModel):
    tipo_solicitud: Literal["duda", "problema_tecnico", "solicitud_funcion", "error"] = "duda"
    asunto: str = Field(min_length=4, max_length=150)
    descripcion: str = Field(min_length=8, max_length=4000)
    prioridad: Literal["baja", "media", "alta"] = "media"


class TicketUpdateRequest(BaseModel):
    estado: Optional[Literal["pendiente", "en_proceso", "resuelto", "cerrado"]] = None
    prioridad: Optional[Literal["baja", "media", "alta"]] = None
    agente_id: Optional[int] = None
    desasignar_agente: bool = False


class TicketReplyRequest(BaseModel):
    mensaje: str = Field(min_length=1, max_length=3000)


def _serialize_message(m: MensajeTicket) -> dict:
    autor = m.autor
    return {
        "id": m.id,
        "ticket_id": m.ticket_id,
        "autor_id": m.autor_id,
        "autor_nombre": (autor.nombre or autor.email.split("@")[0]) if autor else "Usuario",
        "autor_rol": autor.rol if autor else "usuario",
        "autor_es_superadmin": bool(autor.es_admin_principal) if autor else False,
        "mensaje": m.mensaje,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _serialize_ticket(t: TicketSoporte, include_messages: bool = False) -> dict:
    mensajes_ordenados = sorted(t.mensajes or [], key=lambda m: (m.created_at or _utcnow(), m.id))
    data = {
        "id": t.id,
        "codigo": t.codigo,
        "usuario_id": t.usuario_id,
        "usuario_nombre": (t.usuario.nombre or t.usuario.email.split("@")[0]) if t.usuario else "Usuario",
        "usuario_email": t.usuario.email if t.usuario else "",
        "usuario_rol": t.usuario.rol if t.usuario else "usuario",
        "agente_id": t.agente_id,
        "agente_nombre": (t.agente.nombre or t.agente.email.split("@")[0]) if t.agente else None,
        "agente_email": t.agente.email if t.agente else None,
        "tipo_solicitud": t.tipo_solicitud,
        "asunto": t.asunto,
        "descripcion": t.descripcion,
        "prioridad": t.prioridad or "media",
        "estado": t.estado,
        "mensajes_count": len(mensajes_ordenados),
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }
    if include_messages:
        data["mensajes"] = [_serialize_message(m) for m in mensajes_ordenados]
    return data


@router.get("/mis-tickets")
def list_my_tickets(
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista los tickets creados por el usuario autenticado."""
    tickets = (
        db.query(TicketSoporte)
        .options(
            joinedload(TicketSoporte.usuario),
            joinedload(TicketSoporte.agente),
            joinedload(TicketSoporte.mensajes).joinedload(MensajeTicket.autor),
        )
        .filter(TicketSoporte.usuario_id == usuario.id)
        .order_by(TicketSoporte.updated_at.desc(), TicketSoporte.id.desc())
        .all()
    )
    return {"tickets": [_serialize_ticket(t, include_messages=True) for t in tickets]}


@router.post("/tickets", status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    data: TicketCreateRequest,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permite a cualquier usuario autenticado crear un ticket de soporte."""
    year = _utcnow().year
    codigo = f"SUP-{year}-{uuid.uuid4().hex[:6].upper()}"
    ticket = TicketSoporte(
        codigo=codigo,
        usuario_id=usuario.id,
        tipo_solicitud=data.tipo_solicitud,
        asunto=data.asunto.strip(),
        descripcion=data.descripcion.strip(),
        prioridad=data.prioridad,
        estado="pendiente",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    ticket = (
        db.query(TicketSoporte)
        .options(
            joinedload(TicketSoporte.usuario),
            joinedload(TicketSoporte.agente),
            joinedload(TicketSoporte.mensajes).joinedload(MensajeTicket.autor),
        )
        .filter(TicketSoporte.id == ticket.id)
        .first()
    )
    return {"ticket": _serialize_ticket(ticket, include_messages=True)}


@router.get("/tickets")
def list_all_tickets_for_support(
    estado: Optional[str] = None,
    soporte_user: Usuario = Depends(require_support_agent),
    db: Session = Depends(get_db),
):
    """Lista todos los tickets de soporte y agentes disponibles (Agente de Soporte o Superadmin)."""
    query = (
        db.query(TicketSoporte)
        .options(
            joinedload(TicketSoporte.usuario),
            joinedload(TicketSoporte.agente),
            joinedload(TicketSoporte.mensajes).joinedload(MensajeTicket.autor),
        )
    )
    if estado and estado != "todos":
        query = query.filter(TicketSoporte.estado == estado)

    tickets = query.order_by(TicketSoporte.updated_at.desc(), TicketSoporte.id.desc()).all()

    all_tickets = db.query(TicketSoporte.estado).all()
    stats = {
        "total": len(all_tickets),
        "pendiente": sum(1 for (e,) in all_tickets if e == "pendiente"),
        "en_proceso": sum(1 for (e,) in all_tickets if e == "en_proceso"),
        "resuelto": sum(1 for (e,) in all_tickets if e == "resuelto"),
        "cerrado": sum(1 for (e,) in all_tickets if e == "cerrado"),
    }

    agentes_db = (
        db.query(Usuario)
        .filter(
            Usuario.deleted_at.is_(None),
            or_(
                Usuario.rol == "agente_soporte",
                (Usuario.rol == "admin") & (Usuario.es_admin_principal.is_(True)),
            ),
        )
        .order_by(Usuario.es_admin_principal.desc(), Usuario.nombre.asc())
        .all()
    )

    return {
        "viewer": {
            "id": soporte_user.id,
            "nombre": soporte_user.nombre or soporte_user.email.split("@")[0],
            "rol": soporte_user.rol,
            "es_admin_principal": bool(soporte_user.es_admin_principal),
        },
        "stats": stats,
        "agents": [
            {
                "id": a.id,
                "nombre": a.nombre or a.email.split("@")[0],
                "email": a.email,
                "rol": a.rol,
                "es_admin_principal": bool(a.es_admin_principal),
            }
            for a in agentes_db
        ],
        "tickets": [_serialize_ticket(t, include_messages=True) for t in tickets],
    }


@router.get("/tickets/{ticket_id}")
def get_ticket_detail(
    ticket_id: int,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtiene el detalle de un ticket (solo su creador, un agente de soporte o el Superadmin)."""
    ticket = (
        db.query(TicketSoporte)
        .options(
            joinedload(TicketSoporte.usuario),
            joinedload(TicketSoporte.agente),
            joinedload(TicketSoporte.mensajes).joinedload(MensajeTicket.autor),
        )
        .filter(TicketSoporte.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket no encontrado")

    if ticket.usuario_id != usuario.id and not is_support_authorized(usuario):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para ver este ticket")

    return {"ticket": _serialize_ticket(ticket, include_messages=True)}


@router.patch("/tickets/{ticket_id}")
def update_support_ticket(
    ticket_id: int,
    data: TicketUpdateRequest,
    soporte_user: Usuario = Depends(require_support_agent),
    db: Session = Depends(get_db),
):
    """Actualiza estado, prioridad o agente asignado (solo Agente de Soporte o Superadmin)."""
    ticket = db.query(TicketSoporte).filter(TicketSoporte.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket no encontrado")

    if data.estado is not None:
        ticket.estado = data.estado
    if data.prioridad is not None:
        ticket.prioridad = data.prioridad

    if data.desasignar_agente:
        ticket.agente_id = None
    elif data.agente_id is not None:
        agente = (
            db.query(Usuario)
            .filter(Usuario.id == data.agente_id, Usuario.deleted_at.is_(None))
            .first()
        )
        if not agente or not is_support_authorized(agente):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "El usuario asignado debe tener rol de Agente de Soporte o Administrador Principal.",
            )
        ticket.agente_id = agente.id
        if ticket.estado == "pendiente" and data.estado is None:
            ticket.estado = "en_proceso"

    ticket.updated_at = _utcnow()
    db.commit()

    ticket = (
        db.query(TicketSoporte)
        .options(
            joinedload(TicketSoporte.usuario),
            joinedload(TicketSoporte.agente),
            joinedload(TicketSoporte.mensajes).joinedload(MensajeTicket.autor),
        )
        .filter(TicketSoporte.id == ticket_id)
        .first()
    )
    return {"ticket": _serialize_ticket(ticket, include_messages=True)}


@router.post("/tickets/{ticket_id}/mensajes", status_code=status.HTTP_201_CREATED)
def reply_support_ticket(
    ticket_id: int,
    data: TicketReplyRequest,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Agrega un mensaje al hilo del ticket (creador, agente de soporte o Superadmin)."""
    ticket = db.query(TicketSoporte).filter(TicketSoporte.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket no encontrado")

    is_agent = is_support_authorized(usuario)
    if ticket.usuario_id != usuario.id and not is_agent:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para responder este ticket")

    msg = MensajeTicket(
        ticket_id=ticket.id,
        autor_id=usuario.id,
        mensaje=data.mensaje.strip(),
    )
    db.add(msg)

    if is_agent:
        if ticket.agente_id is None:
            ticket.agente_id = usuario.id
        if ticket.estado == "pendiente":
            ticket.estado = "en_proceso"
    ticket.updated_at = _utcnow()

    db.commit()

    ticket = (
        db.query(TicketSoporte)
        .options(
            joinedload(TicketSoporte.usuario),
            joinedload(TicketSoporte.agente),
            joinedload(TicketSoporte.mensajes).joinedload(MensajeTicket.autor),
        )
        .filter(TicketSoporte.id == ticket_id)
        .first()
    )
    return {"ticket": _serialize_ticket(ticket, include_messages=True)}
