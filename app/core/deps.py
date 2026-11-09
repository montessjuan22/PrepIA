"""Dependencias reutilizables de FastAPI (usuario autenticado y control de roles)."""
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


def require_roles(*roles: str):
    """Fábrica de dependencias: exige que el usuario tenga uno de los roles dados.

    Uso:  Depends(require_roles("admin"))
    El rol se lee de la BD en cada request (no va dentro del token), así que un
    cambio de rol aplica de inmediato sin tener que volver a iniciar sesión.
    """
    def verificar(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para esta acción")
        return usuario

    return verificar
