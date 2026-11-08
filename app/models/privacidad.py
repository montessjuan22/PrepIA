"""Modelos de privacidad, consentimientos y auditoría."""
from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class HistorialConsentimiento(Base):
    """Append-only: nunca se hace UPDATE, cada cambio es una fila nueva."""
    __tablename__ = "historial_consentimientos"
    __table_args__ = (
        CheckConstraint("tipo IN ('marketing','analiticas','terceros')", name="ck_historial_consentimientos_tipo"),
        Index("idx_historial_consentimientos_usuario_tipo", "usuario_id", "tipo"),
    )

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(20), nullable=False)
    aceptado = Column(Boolean, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    usuario = relationship("Usuario")


class SolicitudPrivacidad(Base):
    __tablename__ = "solicitudes_privacidad"
    __table_args__ = (
        CheckConstraint("tipo IN ('descarga_datos','eliminacion_cuenta')", name="ck_solicitudes_privacidad_tipo"),
        CheckConstraint(
            "estado IN ('solicitado','procesado','cancelado')",
            name="ck_solicitudes_privacidad_estado",
        ),
    )

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(20), nullable=False)
    estado = Column(String(20), nullable=False, server_default="solicitado")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    completado_en = Column(DateTime)

    usuario = relationship("Usuario")


class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"
    __table_args__ = (
        Index("idx_logs_auditoria_usuario", "usuario_id"),
    )

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))  # NULL si la acción es del sistema
    accion = Column(String(100), nullable=False)
    entidad = Column(String(60))
    entidad_id = Column(Integer)
    ip = Column(String(45))
    user_agent = Column(String(255))
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    usuario = relationship("Usuario")
