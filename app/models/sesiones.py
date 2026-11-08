"""Modelos de las sesiones de prueba, respuestas y resultados de ejecución."""
from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class SesionPrueba(Base):
    __tablename__ = "sesiones_prueba"
    __table_args__ = (
        CheckConstraint("estado IN ('en_progreso','completada')", name="ck_sesiones_prueba_estado"),
        Index("idx_sesiones_prueba_usuario", "usuario_id"),
    )

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    nivel_id = Column(Integer, ForeignKey("niveles_dificultad.id"), nullable=False)
    puntaje = Column(Numeric(5, 2))
    duracion_segundos = Column(Integer)
    estado = Column(String(20), nullable=False, server_default="en_progreso")
    fecha_inicio = Column(DateTime, nullable=False, server_default=func.now())
    fecha_fin = Column(DateTime)

    usuario = relationship("Usuario")
    nivel = relationship("NivelDificultad")
    respuestas = relationship("RespuestaSesion", back_populates="sesion", cascade="all, delete-orphan")
    grabaciones = relationship("GrabacionSesion", back_populates="sesion", cascade="all, delete-orphan")


class RespuestaSesion(Base):
    __tablename__ = "respuestas_sesion"
    __table_args__ = (
        Index("idx_respuestas_sesion_sesion", "sesion_id"),
        Index("idx_respuestas_sesion_lenguaje", "lenguaje_id"),
    )

    id = Column(Integer, primary_key=True)
    sesion_id = Column(Integer, ForeignKey("sesiones_prueba.id", ondelete="CASCADE"), nullable=False)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios.id"), nullable=False)
    lenguaje_id = Column(Integer, ForeignKey("lenguajes_programacion.id"))  # v3: antes VARCHAR+CHECK
    codigo_usuario = Column(Text)
    es_correcta = Column(Boolean)
    pistas_usadas = Column(Integer, nullable=False, server_default="0")
    intentos = Column(Integer, nullable=False, server_default="1")
    tiempo_respuesta_segundos = Column(Integer)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    sesion = relationship("SesionPrueba", back_populates="respuestas")
    ejercicio = relationship("Ejercicio")
    lenguaje = relationship("LenguajeProgramacion")
    resultados = relationship("ResultadoEjecucion", back_populates="respuesta", cascade="all, delete-orphan")
    retroalimentaciones = relationship("RetroalimentacionIA", back_populates="respuesta", cascade="all, delete-orphan")


class ResultadoEjecucion(Base):
    __tablename__ = "resultados_ejecucion"
    __table_args__ = (
        Index("idx_resultados_ejecucion_respuesta", "respuesta_id"),
    )

    id = Column(Integer, primary_key=True)
    respuesta_id = Column(Integer, ForeignKey("respuestas_sesion.id", ondelete="CASCADE"), nullable=False)
    caso_prueba_id = Column(Integer, ForeignKey("casos_prueba.id"), nullable=False)
    paso = Column(Boolean, nullable=False)
    tiempo_ejecucion_ms = Column(Integer)
    memoria_kb = Column(Integer)
    salida_obtenida = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    respuesta = relationship("RespuestaSesion", back_populates="resultados")
    caso_prueba = relationship("CasoPrueba")
