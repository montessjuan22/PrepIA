"""Dependencias reutilizables de FastAPI (usuario autenticado)."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ACCESS, decode_token
from app.models.usuarios import Usuario

# auto_error=False: así devolvemos 401 (y no 403) cuando falta el header
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    no_autenticado = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise no_autenticado

    user_id = decode_token(credentials.credentials, ACCESS)
    if user_id is None:
        raise no_autenticado

    usuario = db.get(Usuario, user_id)
    if usuario is None or usuario.deleted_at is not None:
        raise no_autenticado
    return usuario
