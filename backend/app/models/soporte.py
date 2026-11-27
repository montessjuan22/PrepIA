"""Modelos del módulo de soporte técnico (tickets y mensajes)."""
from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class TicketSoporte(Base):
    __tablename__ = "tickets_soporte"
    __table_args__ = (
        CheckConstraint(
            "tipo_solicitud IN ('duda','problema_tecnico','solicitud_funcion','error')",
            name="ck_tickets_soporte_tipo_solicitud",
        ),
        CheckConstraint("prioridad IN ('baja','media','alta')", name="ck_tickets_soporte_prioridad"),
        CheckConstraint(
            "estado IN ('pendiente','en_proceso','resuelto','cerrado')",
            name="ck_tickets_soporte_estado",
        ),
        Index("idx_tickets_usuario", "usuario_id"),
        Index("idx_tickets_agente", "agente_id"),
    )

    id = Column(Integer, primary_key=True)
    codigo = Column(String(20), nullable=False, unique=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    agente_id = Column(Integer, ForeignKey("usuarios.id"))
    tipo_solicitud = Column(String(30), nullable=False)
    asunto = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=False)
    captura_url = Column(String(255))
    prioridad = Column(String(10))
    estado = Column(String(20), nullable=False, server_default="pendiente")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Dos FK hacia usuarios: hay que indicar cuál usa cada relación
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    agente = relationship("Usuario", foreign_keys=[agente_id])
    mensajes = relationship("MensajeTicket", back_populates="ticket", cascade="all, delete-orphan")


class MensajeTicket(Base):
    __tablename__ = "mensajes_ticket"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("tickets_soporte.id", ondelete="CASCADE"), nullable=False)
    autor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    mensaje = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    ticket = relationship("TicketSoporte", back_populates="mensajes")
    autor = relationship("Usuario")
