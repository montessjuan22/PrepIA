"""Modelos del módulo de autenticación y usuarios."""
from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer,
    String, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint("rol IN ('usuario','agente_soporte','admin')", name="ck_usuarios_rol"),
    )

    id = Column(Integer, primary_key=True)
    nombre = Column(String(120))
    email = Column(String(150), nullable=False, unique=True)
    password_hash = Column(String(255))  # NULL si el usuario solo entra por OAuth
    telefono = Column(String(20))
    rol = Column(String(20), nullable=False, server_default="usuario")
    email_verificado = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)  # soft delete

    identidades_oauth = relationship("IdentidadOAuth", back_populates="usuario", cascade="all, delete-orphan")
    tokens_verificacion = relationship("TokenVerificacionEmail", back_populates="usuario", cascade="all, delete-orphan")
    tokens_recuperacion = relationship("TokenRecuperacion", back_populates="usuario", cascade="all, delete-orphan")
    sesiones_auth = relationship("SesionAuth", back_populates="usuario", cascade="all, delete-orphan")


class IdentidadOAuth(Base):
    __tablename__ = "identidades_oauth"
    __table_args__ = (
        CheckConstraint("proveedor IN ('google','github')", name="ck_identidades_oauth_proveedor"),
        UniqueConstraint("proveedor", "proveedor_id", name="uq_identidades_oauth_proveedor"),
        Index("idx_identidades_oauth_usuario", "usuario_id"),
    )

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    proveedor = Column(String(10), nullable=False)
    proveedor_id = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    usuario = relationship("Usuario", back_populates="identidades_oauth")


class TokenVerificacionEmail(Base):
    __tablename__ = "tokens_verificacion_email"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    codigo_hash = Column(String(255), nullable=False)
    expira_en = Column(DateTime, nullable=False)
    usado = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    usuario = relationship("Usuario", back_populates="tokens_verificacion")


class TokenRecuperacion(Base):
    __tablename__ = "tokens_recuperacion"
    __table_args__ = (
        CheckConstraint("tipo IN ('enlace_correo','otp_sms')", name="ck_tokens_recuperacion_tipo"),
        Index("idx_tokens_recuperacion_usuario", "usuario_id"),
    )

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(20), nullable=False)
    codigo_hash = Column(String(255), nullable=False)
    expira_en = Column(DateTime, nullable=False)
    usado = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    usuario = relationship("Usuario", back_populates="tokens_recuperacion")


class SesionAuth(Base):
    """Refresh tokens / sesiones de login (se guarda solo el hash del token)."""
    __tablename__ = "sesiones_auth"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    ip = Column(String(45))
    user_agent = Column(String(255))
    creado_en = Column(DateTime, nullable=False, server_default=func.now())
    expira_en = Column(DateTime, nullable=False)
    revocado = Column(Boolean, nullable=False, server_default="false")

    usuario = relationship("Usuario", back_populates="sesiones_auth")
