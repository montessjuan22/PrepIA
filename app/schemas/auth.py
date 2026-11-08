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
        # Evita duplicados tipo Ana@x.com / ana@x.com
        return v.lower()

    @field_validator("password")
    @classmethod
    def _fortaleza(cls, v: str) -> str:
        return _validar_fortaleza(v)


class LoginRequest(BaseModel):
    email: EmailStr
    # En login no se valida fortaleza: solo se compara con el hash guardado.
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


class UsuarioResponse(BaseModel):
    """Datos públicos del usuario. Nunca incluye password_hash."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str | None
    email: EmailStr
    telefono: str | None
    rol: str
    email_verificado: bool
    created_at: datetime
