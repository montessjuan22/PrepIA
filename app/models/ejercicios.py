"""Modelos del banco de ejercicios y catálogos (niveles, temas, lenguajes)."""
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Table, Text, func,
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


class Ejercicio(Base):
    __tablename__ = "ejercicios"

    id = Column(Integer, primary_key=True)
    enunciado = Column(Text, nullable=False)
    nivel_id = Column(Integer, ForeignKey("niveles_dificultad.id"), nullable=False)
    respuesta_esperada = Column(Text)  # solución óptima de referencia (RF09)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    nivel = relationship("NivelDificultad", back_populates="ejercicios")
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
