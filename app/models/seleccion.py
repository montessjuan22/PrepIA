"""v4: módulo de selección de candidatos (empresas, vacantes, postulaciones, decisiones)."""
from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Empresa(Base):
    """Organización que publica vacantes. Solo un administrador la crea."""
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(150), nullable=False)
    nit = Column(String(20), unique=True)
    sector = Column(String(100))
    sitio_web = Column(String(255))
    activa = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    reclutadores = relationship("Usuario", back_populates="empresa")
    vacantes = relationship("Vacante", back_populates="empresa")


class HojaDeVida(Base):
    """Hoja de vida cargada por un candidato (el archivo vive en almacenamiento externo)."""
    __tablename__ = "hojas_de_vida"
    __table_args__ = (
        Index("idx_hojas_de_vida_usuario", "usuario_id"),
    )

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    nombre_archivo = Column(String(255), nullable=False)
    url_archivo = Column(String(255), nullable=False)
    texto_extraido = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    usuario = relationship("Usuario")


class Vacante(Base):
    """Cargo ofrecido por una empresa, con la configuración de su prueba de selección."""
    __tablename__ = "vacantes"
    __table_args__ = (
        CheckConstraint("modalidad IN ('presencial','remoto','hibrido')", name="ck_vacantes_modalidad"),
        CheckConstraint("estado IN ('borrador','abierta','cerrada')", name="ck_vacantes_estado"),
        CheckConstraint("puntaje_minimo BETWEEN 0 AND 100", name="ck_vacantes_puntaje_minimo"),
        CheckConstraint("peso_cv >= 0 AND peso_prueba >= 0 AND peso_cv + peso_prueba = 100", name="ck_vacantes_pesos"),
        Index("idx_vacantes_empresa", "empresa_id"),
        Index("idx_vacantes_estado", "estado"),
    )

    id = Column(Integer, primary_key=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    reclutador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    perfil_id = Column(Integer, ForeignKey("perfiles_profesionales.id"))
    titulo = Column(String(150), nullable=False)
    descripcion = Column(Text)
    requisitos = Column(Text)
    modalidad = Column(String(15))
    estado = Column(String(15), nullable=False, server_default="borrador")
    duracion_prueba_minutos = Column(Integer)
    puntaje_minimo = Column(Numeric(5, 2), nullable=False, server_default="60")
    peso_cv = Column(Numeric(5, 2), nullable=False, server_default="30")
    peso_prueba = Column(Numeric(5, 2), nullable=False, server_default="70")
    fecha_cierre = Column(DateTime)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    empresa = relationship("Empresa", back_populates="vacantes")
    reclutador = relationship("Usuario")
    perfil = relationship("PerfilProfesional", back_populates="vacantes")
    items = relationship("VacanteEjercicio", back_populates="vacante", cascade="all, delete-orphan", order_by="VacanteEjercicio.orden")
    postulaciones = relationship("Postulacion", back_populates="vacante", cascade="all, delete-orphan")


class VacanteEjercicio(Base):
    """Preguntas que forman la prueba de una vacante y su orden (objeto de asociación)."""
    __tablename__ = "vacante_ejercicios"

    vacante_id = Column(Integer, ForeignKey("vacantes.id", ondelete="CASCADE"), primary_key=True)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios.id"), primary_key=True)
    orden = Column(Integer, nullable=False)

    vacante = relationship("Vacante", back_populates="items")
    ejercicio = relationship("Ejercicio")


class Postulacion(Base):
    """Postulación de un candidato a una vacante; concentra puntajes y estado del proceso."""
    __tablename__ = "postulaciones"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('postulado','cv_analizado','prueba_pendiente','prueba_completada',"
            "'en_revision','aprobado','rechazado','retirado')",
            name="ck_postulaciones_estado",
        ),
        CheckConstraint("puntaje_cv BETWEEN 0 AND 100", name="ck_postulaciones_puntaje_cv"),
        CheckConstraint("puntaje_prueba BETWEEN 0 AND 100", name="ck_postulaciones_puntaje_prueba"),
        CheckConstraint("puntaje_final BETWEEN 0 AND 100", name="ck_postulaciones_puntaje_final"),
        UniqueConstraint("vacante_id", "usuario_id", name="uq_postulaciones_vacante_usuario"),
        Index("idx_postulaciones_vacante", "vacante_id"),
        Index("idx_postulaciones_usuario", "usuario_id"),
    )

    id = Column(Integer, primary_key=True)
    vacante_id = Column(Integer, ForeignKey("vacantes.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    hoja_vida_id = Column(Integer, ForeignKey("hojas_de_vida.id"))  # obligatoria si la vacante tiene peso_cv > 0
    estado = Column(String(20), nullable=False, server_default="postulado")
    puntaje_cv = Column(Numeric(5, 2))
    puntaje_prueba = Column(Numeric(5, 2))
    puntaje_final = Column(Numeric(5, 2))
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    vacante = relationship("Vacante", back_populates="postulaciones")
    usuario = relationship("Usuario")
    hoja_vida = relationship("HojaDeVida")
    analisis = relationship("AnalisisCV", back_populates="postulacion", uselist=False, cascade="all, delete-orphan")
    decisiones = relationship("DecisionPostulacion", back_populates="postulacion", cascade="all, delete-orphan", order_by="DecisionPostulacion.created_at")
    sesiones = relationship("SesionPrueba", back_populates="postulacion")


class AnalisisCV(Base):
    """Resultado del análisis de la hoja de vida frente a la vacante (servicio de IA)."""
    __tablename__ = "analisis_cv"
    __table_args__ = (
        CheckConstraint("puntaje_afinidad BETWEEN 0 AND 100", name="ck_analisis_cv_puntaje_afinidad"),
    )

    id = Column(Integer, primary_key=True)
    postulacion_id = Column(Integer, ForeignKey("postulaciones.id", ondelete="CASCADE"), nullable=False, unique=True)
    puntaje_afinidad = Column(Numeric(5, 2))
    experiencia_anios = Column(Numeric(4, 1))
    habilidades_detectadas = Column(Text)
    resumen = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    postulacion = relationship("Postulacion", back_populates="analisis")


class DecisionPostulacion(Base):
    """Historial de decisiones del reclutador. Append-only: nunca se hace UPDATE."""
    __tablename__ = "decisiones_postulacion"
    __table_args__ = (
        CheckConstraint("resultado IN ('aprobado','rechazado','en_revision')", name="ck_decisiones_postulacion_resultado"),
        Index("idx_decisiones_postulacion", "postulacion_id"),
    )

    id = Column(Integer, primary_key=True)
    postulacion_id = Column(Integer, ForeignKey("postulaciones.id", ondelete="CASCADE"), nullable=False)
    reclutador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    resultado = Column(String(15), nullable=False)
    notas = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    postulacion = relationship("Postulacion", back_populates="decisiones")
    reclutador = relationship("Usuario")
