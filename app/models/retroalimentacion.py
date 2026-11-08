"""Modelos de retroalimentación (IA/experto), análisis de comunicación y recomendaciones."""
from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class RetroalimentacionIA(Base):
    __tablename__ = "retroalimentaciones_ia"
    __table_args__ = (
        CheckConstraint("fuente IN ('ia','experto')", name="ck_retroalimentaciones_ia_fuente"),
    )

    id = Column(Integer, primary_key=True)
    respuesta_id = Column(Integer, ForeignKey("respuestas_sesion.id", ondelete="CASCADE"), nullable=False)
    fuente = Column(String(10), nullable=False)
    contenido = Column(Text, nullable=False)
    validada = Column(Boolean, nullable=False, server_default="true")
    motivo_invalidacion = Column(String(255))
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    respuesta = relationship("RespuestaSesion", back_populates="retroalimentaciones")


class GrabacionSesion(Base):
    """v3: referencia al audio/video de una sesión (el archivo vive en almacenamiento externo)."""
    __tablename__ = "grabaciones_sesion"
    __table_args__ = (
        CheckConstraint("tipo IN ('audio','video')", name="ck_grabaciones_sesion_tipo"),
        CheckConstraint(
            "estado IN ('pendiente','procesando','analizada','error')",
            name="ck_grabaciones_sesion_estado",
        ),
        Index("idx_grabaciones_sesion_sesion", "sesion_id"),
    )

    id = Column(Integer, primary_key=True)
    sesion_id = Column(Integer, ForeignKey("sesiones_prueba.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(10), nullable=False)
    url_archivo = Column(String(255), nullable=False)
    duracion_segundos = Column(Integer)
    estado = Column(String(20), nullable=False, server_default="pendiente")
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    sesion = relationship("SesionPrueba", back_populates="grabaciones")
    analisis = relationship("AnalisisComunicacion", back_populates="grabacion", cascade="all, delete-orphan")


class AnalisisComunicacion(Base):
    """v3: métricas de comunicación no verbal calculadas sobre una grabación (RF16)."""
    __tablename__ = "analisis_comunicacion"
    __table_args__ = (
        Index("idx_analisis_comunicacion_grabacion", "grabacion_id"),
    )

    id = Column(Integer, primary_key=True)
    grabacion_id = Column(Integer, ForeignKey("grabaciones_sesion.id", ondelete="CASCADE"), nullable=False)
    contacto_visual_pct = Column(Numeric(5, 2))
    lenguaje_corporal_score = Column(Numeric(5, 2))
    tono_voz_score = Column(Numeric(5, 2))
    ritmo_habla_ppm = Column(Integer)  # palabras por minuto
    palabras_relleno_count = Column(Integer)
    claridad_score = Column(Numeric(5, 2))
    resumen = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    grabacion = relationship("GrabacionSesion", back_populates="analisis")


class Recomendacion(Base):
    __tablename__ = "recomendaciones"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    contenido = Column(Text, nullable=False)
    generada_en = Column(DateTime, nullable=False, server_default=func.now())
    vista = Column(Boolean, nullable=False, server_default="false")

    usuario = relationship("Usuario")
