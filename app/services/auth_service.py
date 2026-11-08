"""Lógica de negocio de autenticación: registro, login, refresh y logout.

Los errores se lanzan como HTTPException para que los routers queden delgados.
"""
from datetime import datetime, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.usuarios import SesionAuth, Usuario
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


def _utcnow() -> datetime:
    """UTC sin zona horaria: las columnas TIMESTAMP de la BD son 'naive'."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _credenciales_invalidas() -> HTTPException:
    # Mensaje genérico: no revela si el email existe o si la contraseña falló.
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciales inválidas")


def _emitir_tokens(db: Session, usuario: Usuario, request: Request) -> TokenResponse:
    """Crea access + refresh token y guarda la sesión (solo el hash del refresh)."""
    access = create_access_token(usuario.id)
    refresh, expira_en = create_refresh_token(usuario.id)

    sesion = SesionAuth(
        usuario_id=usuario.id,
        token_hash=hash_token(refresh),
        ip=(request.client.host if request.client else None),
        user_agent=(request.headers.get("user-agent") or "")[:255] or None,
        expira_en=expira_en,
    )
    db.add(sesion)
    db.commit()
    return TokenResponse(access_token=access, refresh_token=refresh)


def register_user(db: Session, data: RegisterRequest) -> Usuario:
    existente = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existente:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese email")

    usuario = Usuario(
        nombre=data.nombre,
        email=data.email,
        password_hash=hash_password(data.password),
        telefono=data.telefono,
    )
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        # Dos registros simultáneos con el mismo email: gana el primero
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese email")
    db.refresh(usuario)
    return usuario


def login_user(db: Session, data: LoginRequest, request: Request) -> TokenResponse:
    usuario = (
        db.query(Usuario)
        .filter(Usuario.email == data.email, Usuario.deleted_at.is_(None))
        .first()
    )
    # password_hash es NULL en cuentas creadas solo con OAuth: no pueden entrar por aquí
    if not usuario or not usuario.password_hash:
        raise _credenciales_invalidas()
    if not verify_password(data.password, usuario.password_hash):
        raise _credenciales_invalidas()
    return _emitir_tokens(db, usuario, request)


def _buscar_sesion_valida(db: Session, refresh_token: str) -> SesionAuth:
    """Valida firma/tipo del JWT y que la sesión exista, no esté revocada ni vencida."""
    user_id = decode_token(refresh_token, REFRESH)
    if user_id is None:
        raise _credenciales_invalidas()

    sesion = (
        db.query(SesionAuth)
        .filter(
            SesionAuth.token_hash == hash_token(refresh_token),
            SesionAuth.usuario_id == user_id,
            SesionAuth.revocado.is_(False),
            SesionAuth.expira_en > _utcnow(),
        )
        .first()
    )
    if not sesion:
        raise _credenciales_invalidas()
    return sesion


def refresh_session(db: Session, refresh_token: str, request: Request) -> TokenResponse:
    sesion = _buscar_sesion_valida(db, refresh_token)

    usuario = db.get(Usuario, sesion.usuario_id)
    if not usuario or usuario.deleted_at is not None:
        raise _credenciales_invalidas()

    # Rotación: el refresh token usado se invalida y se entrega uno nuevo
    sesion.revocado = True
    db.flush()
    return _emitir_tokens(db, usuario, request)


def logout_user(db: Session, refresh_token: str) -> None:
    sesion = _buscar_sesion_valida(db, refresh_token)
    sesion.revocado = True
    db.commit()
