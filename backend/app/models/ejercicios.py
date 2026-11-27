"""Modelos del banco de ejercicios y catálogos (niveles, temas, lenguajes)."""
from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, Table, Text, func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base

# Tablas puente N—M
ejercicio_temas = Table(
    "ejercicio_temas",
    Base.metadata,
    Column("ejercicio_id", Integer, ForeignKey("ejercicios.id", ondelete="CASCADE"), primary_key=True),
    Column("tema_id", Integer, ForeignKey("temas.id", ondelete="CASCADE"), primary_key=True),
)

# v3: un ejercicio puede resolverse en varios lenguajes
ejercicio_lenguajes = Table(
    "ejercicio_lenguajes",
    Base.metadata,
    Column("ejercicio_id", Integer, ForeignKey("ejercicios.id", ondelete="CASCADE"), primary_key=True),
    Column("lenguaje_id", Integer, ForeignKey("lenguajes_programacion.id", ondelete="CASCADE"), primary_key=True),
)


class NivelDificultad(Base):
    __tablename__ = "niveles_dificultad"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(30), nullable=False, unique=True)
    descripcion = Column(String(255))
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    ejercicios = relationship("Ejercicio", back_populates="nivel")


class Tema(Base):
    __tablename__ = "temas"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(60), nullable=False, unique=True)

    ejercicios = relationship("Ejercicio", secondary=ejercicio_temas, back_populates="temas")


class LenguajeProgramacion(Base):
    """v3: catálogo abierto de lenguajes (reemplaza el CHECK fijo javascript/python)."""
    __tablename__ = "lenguajes_programacion"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(30), nullable=False, unique=True)
    activo = Column(Boolean, nullable=False, server_default="true")

    ejercicios = relationship("Ejercicio", secondary=ejercicio_lenguajes, back_populates="lenguajes")


class PerfilProfesional(Base):
    """v4: perfiles o áreas profesionales (la plataforma ya no es solo para programadores)."""
    __tablename__ = "perfiles_profesionales"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(80), nullable=False, unique=True)
    descripcion = Column(String(255))

    ejercicios = relationship("Ejercicio", back_populates="perfil")
    vacantes = relationship("Vacante", back_populates="perfil")


class Ejercicio(Base):
    __tablename__ = "ejercicios"
    __table_args__ = (
        CheckConstraint("tipo IN ('codigo','opcion_multiple','abierta')", name="ck_ejercicios_tipo"),
        Index("idx_ejercicios_perfil", "perfil_id"),
    )

    id = Column(Integer, primary_key=True)
    enunciado = Column(Text, nullable=False)
    nivel_id = Column(Integer, ForeignKey("niveles_dificultad.id"), nullable=False)
    tipo = Column(String(20), nullable=False, server_default="codigo")  # v4
    perfil_id = Column(Integer, ForeignKey("perfiles_profesionales.id"))  # v4
    respuesta_esperada = Column(Text)  # solución óptima de referencia (RF09)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    nivel = relationship("NivelDificultad", back_populates="ejercicios")
    perfil = relationship("PerfilProfesional", back_populates="ejercicios")
    opciones = relationship("OpcionPregunta", back_populates="ejercicio", cascade="all, delete-orphan", order_by="OpcionPregunta.orden")
    temas = relationship("Tema", secondary=ejercicio_temas, back_populates="ejercicios")
    lenguajes = relationship("LenguajeProgramacion", secondary=ejercicio_lenguajes, back_populates="ejercicios")
    pistas = relationship("Pista", back_populates="ejercicio", cascade="all, delete-orphan", order_by="Pista.orden")
    casos_prueba = relationship("CasoPrueba", back_populates="ejercicio", cascade="all, delete-orphan")


class Pista(Base):
    __tablename__ = "pistas"

    id = Column(Integer, primary_key=True)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios.id", ondelete="CASCADE"), nullable=False)
    orden = Column(Integer, nullable=False)
    contenido = Column(Text, nullable=False)

    ejercicio = relationship("Ejercicio", back_populates="pistas")


class CasoPrueba(Base):
    __tablename__ = "casos_prueba"

    id = Column(Integer, primary_key=True)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios.id", ondelete="CASCADE"), nullable=False)
    entrada = Column(Text)
    salida_esperada = Column(Text, nullable=False)
    es_publico = Column(Boolean, nullable=False, server_default="false")

    ejercicio = relationship("Ejercicio", back_populates="casos_prueba")


class OpcionPregunta(Base):
    """v4: opciones de las preguntas de tipo 'opcion_multiple'."""
    __tablename__ = "opciones_pregunta"
    __table_args__ = (
        Index("idx_opciones_pregunta_ejercicio", "ejercicio_id"),
    )

    id = Column(Integer, primary_key=True)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios.id", ondelete="CASCADE"), nullable=False)
    texto = Column(Text, nullable=False)
    es_correcta = Column(Boolean, nullable=False, server_default="false")
    orden = Column(Integer)

    ejercicio = relationship("Ejercicio", back_populates="opciones")


class RecursoPreparacion(Base):
    """Materiales reales de estudio, videos y plantillas publicados por administradores."""
    __tablename__ = "recursos_preparacion"

    id = Column(Integer, primary_key=True)
    titulo = Column(String(180), nullable=False)
    descripcion = Column(Text)
    categoria = Column(String(60), nullable=False)
    tipo = Column(String(20), nullable=False)
    url_externa = Column(Text)
    nombre_archivo = Column(String(255))
    ruta_archivo = Column(Text)
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"))
    created_at = Column(DateTime, nullable=False, server_default=func.now())
