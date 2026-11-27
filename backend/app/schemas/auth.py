"""Esquemas Pydantic del módulo de autenticación (contratos de entrada y salida de la API)."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _validar_fortaleza(password: str) -> str:
    """Regla mínima de fortaleza: al menos una letra y un número."""
    if not any(c.isalpha() for c in password):
        raise ValueError("La contraseña debe incluir al menos una letra")
    if not any(c.isdigit() for c in password):
        raise ValueError("La contraseña debe incluir al menos un número")
    return password


class RegisterRequest(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    telefono: str | None = Field(default=None, max_length=20)
    rol: str = Field(default="usuario", max_length=20)

    @field_validator("nombre")
    @classmethod
    def _limpiar_nombre(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        return v

    @field_validator("email")
    @classmethod
    def _email_minusculas(cls, v: str) -> str:
        return v.lower()

    @field_validator("password")
    @classmethod
    def _fortaleza(cls, v: str) -> str:
        return _validar_fortaleza(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def _email_minusculas(cls, v: str) -> str:
        return v.lower()


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    rol: str | None = None


class UsuarioResponse(BaseModel):
    """Datos públicos del usuario. Nunca incluye password_hash."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str | None
    email: EmailStr
    telefono: str | None
    rol: str
    es_admin_principal: bool = False
    email_verificado: bool
    created_at: datetime


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def _email_minusculas(cls, v: str) -> str:
        return v.lower()


class ForgotPasswordResponse(BaseModel):
    message: str
    codigo_dev: str | None = None


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    codigo: str = Field(min_length=4, max_length=10)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def _email_minusculas(cls, v: str) -> str:
        return v.lower()

    @field_validator("new_password")
    @classmethod
    def _fortaleza(cls, v: str) -> str:
        return _validar_fortaleza(v)


class ResetPasswordResponse(BaseModel):
    message: str


class GoogleConfigResponse(BaseModel):
    configured: bool
    client_id: str | None = None


class GoogleLoginRequest(BaseModel):
    credential: str | None = None
    access_token: str | None = None
