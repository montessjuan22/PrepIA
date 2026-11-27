"""Utilidades de seguridad: hash de contraseñas y tokens JWT.

- Las contraseñas se guardan con bcrypt (nunca en texto plano).
- Los tokens JWT llevan el id del usuario en "sub" y un "type" para distinguir
  access de refresh (así un refresh token no sirve para llamar a la API).
- El refresh token se guarda en BD solo como hash SHA-256 (tabla sesiones_auth).
"""
import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

ACCESS = "access"
REFRESH = "refresh"


# ---------------------------------------------------------------------------
# Contraseñas
# ---------------------------------------------------------------------------
def _prehash(password: str) -> bytes:
    """bcrypt solo admite 72 bytes. Con SHA-256 + base64 (44 caracteres) el
    límite desaparece sin cortar contraseñas largas ni con acentos/emoji."""
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prehash(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_prehash(password), password_hash.encode("utf-8"))
    except ValueError:
        # hash corrupto o con formato inválido
        return False


# ---------------------------------------------------------------------------
# Tokens JWT
# ---------------------------------------------------------------------------
def _create_token(user_id: int, token_type: str, expires_delta: timedelta) -> tuple[str, datetime]:
    """Devuelve (token, fecha_de_expiracion_utc_naive).

    La fecha se devuelve sin zona horaria porque las columnas TIMESTAMP de la
    BD (sesiones_auth.expira_en) son 'naive' y se comparan en UTC.
    """
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "iat": now,
        "exp": expire,
        "jti": secrets.token_hex(16),  # id único: dos tokens nunca son iguales
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expire.replace(tzinfo=None)


def create_access_token(user_id: int) -> str:
    token, _ = _create_token(user_id, ACCESS, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return token


def create_refresh_token(user_id: int) -> tuple[str, datetime]:
    return _create_token(user_id, REFRESH, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str, expected_type: str) -> int | None:
    """Valida firma, expiración y tipo. Devuelve el id de usuario o None si es inválido."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    try:
        return int(payload["sub"])
    except (KeyError, ValueError):
        return None


def hash_token(token: str) -> str:
    """Hash SHA-256 del token para guardarlo en sesiones_auth.token_hash."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
