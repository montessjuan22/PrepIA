"""Lógica de negocio de autenticación: registro, login, refresh, logout y recuperación de contraseña."""
from datetime import datetime, timedelta, timezone
import secrets

from fastapi import HTTPException, Request, status
import httpx
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings

from app.core.security import (
    REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.usuarios import IdentidadOAuth, SesionAuth, TokenRecuperacion, Usuario
from app.schemas.auth import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TokenResponse,
)


def _utcnow() -> datetime:
    """UTC sin zona horaria: las columnas TIMESTAMP de la BD son 'naive'."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _credenciales_invalidas() -> HTTPException:
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
    return TokenResponse(access_token=access, refresh_token=refresh, rol=usuario.rol)


def register_user(db: Session, data: RegisterRequest) -> Usuario:
    existente = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existente:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese email")

    # Seguridad: todo registro público entra como 'usuario'; solo el Administrador Principal asigna roles.
    usuario = Usuario(
        nombre=data.nombre,
        email=data.email,
        password_hash=hash_password(data.password),
        telefono=data.telefono,
        rol="usuario",
    )
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
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
    if not usuario or not usuario.password_hash:
        raise _credenciales_invalidas()
    if not verify_password(data.password, usuario.password_hash):
        raise _credenciales_invalidas()
    return _emitir_tokens(db, usuario, request)


def _buscar_sesion_valida(db: Session, refresh_token: str) -> SesionAuth:
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

    sesion.revocado = True
    db.flush()
    return _emitir_tokens(db, usuario, request)


def logout_user(db: Session, refresh_token: str) -> None:
    sesion = _buscar_sesion_valida(db, refresh_token)
    sesion.revocado = True
    db.commit()


def forgot_password(db: Session, data: ForgotPasswordRequest) -> ForgotPasswordResponse:
    """Solicita código de recuperación de contraseña (RF02)."""
    usuario = db.query(Usuario).filter(Usuario.email == data.email, Usuario.deleted_at.is_(None)).first()
    if not usuario:
        # Por seguridad no revelamos si existe el email
        return ForgotPasswordResponse(
            message="Si el correo se encuentra registrado, recibirás un código de recuperación."
        )

    # Generar código de 6 dígitos
    codigo = f"{secrets.randbelow(900000) + 100000}"
    expira_en = _utcnow() + timedelta(minutes=15)

    token = TokenRecuperacion(
        usuario_id=usuario.id,
        tipo="enlace_correo",
        codigo_hash=hash_token(codigo),
        expira_en=expira_en,
        usado=False,
    )
    db.add(token)
    db.commit()

    return ForgotPasswordResponse(
        message="Código de recuperación generado exitosamente.",
        codigo_dev=codigo,  # Dev helper para pruebas instantáneas
    )


def reset_password(db: Session, data: ResetPasswordRequest) -> ResetPasswordResponse:
    """Valida el código de 6 dígitos y actualiza la contraseña (RF02)."""
    usuario = db.query(Usuario).filter(Usuario.email == data.email, Usuario.deleted_at.is_(None)).first()
    if not usuario:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Código inválido o expirado")

    ahora = _utcnow()
    token = (
        db.query(TokenRecuperacion)
        .filter(
            TokenRecuperacion.usuario_id == usuario.id,
            TokenRecuperacion.codigo_hash == hash_token(data.codigo),
            TokenRecuperacion.usado.is_(False),
            TokenRecuperacion.expira_en > ahora,
        )
        .order_by(TokenRecuperacion.id.desc())
        .first()
    )

    if not token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Código inválido o expirado")

    # Actualizar contraseña y quemar token
    usuario.password_hash = hash_password(data.new_password)
    token.usado = True
    db.commit()

    return ResetPasswordResponse(message="Contraseña restablecida exitosamente")


def _verify_google_identity(data: GoogleLoginRequest) -> tuple[str, str, str]:
    """Verifica el token real emitido por Google y retorna (email, sub, nombre)."""
    client_id = settings.GOOGLE_CLIENT_ID.strip()
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth no está configurado en el servidor (falta GOOGLE_CLIENT_ID en backend/.env).",
        )

    if data.credential:
        try:
            resp = httpx.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": data.credential},
                timeout=10.0,
            )
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo verificar el token con los servidores de Google.",
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de Google inválido o expirado.")

        info = resp.json()
        if info.get("aud") != client_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="El token de Google no corresponde a esta aplicación.")
        if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Emisor de token Google inválido.")
        if str(info.get("email_verified", "")).lower() != "true":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="La cuenta de Google no tiene el correo verificado.")

        email = (info.get("email") or "").strip().lower()
        sub = (info.get("sub") or "").strip()
        nombre = (info.get("name") or email.split("@")[0]).strip()
        if not email or not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google no entregó el correo o identificador de cuenta.")
        return email, sub, nombre

    if data.access_token:
        try:
            token_resp = httpx.get(
                "https://www.googleapis.com/oauth2/v3/tokeninfo",
                params={"access_token": data.access_token},
                timeout=10.0,
            )
            if token_resp.status_code != 200:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Access token de Google inválido.")
            token_info = token_resp.json()
            if token_info.get("aud") != client_id and token_info.get("azp") != client_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="El access token de Google no corresponde a esta aplicación.")

            user_resp = httpx.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {data.access_token}"},
                timeout=10.0,
            )
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo consultar el perfil con Google.",
            )

        if user_resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No se pudo obtener el usuario de Google.")
        info = user_resp.json()
        if not info.get("email_verified"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="La cuenta de Google no tiene el correo verificado.")

        email = (info.get("email") or "").strip().lower()
        sub = (info.get("sub") or "").strip()
        nombre = (info.get("name") or email.split("@")[0]).strip()
        if not email or not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google no entregó el correo o identificador de cuenta.")
        return email, sub, nombre

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Debes enviar la credencial oficial de Google para iniciar sesión.",
    )


def google_auth_user(db: Session, data: GoogleLoginRequest, request: Request) -> TokenResponse:
    """Inicia sesión o registra usuario verificando el token real de Google OAuth."""
    email_clean, google_sub, nombre = _verify_google_identity(data)

    identidad = (
        db.query(IdentidadOAuth)
        .filter(IdentidadOAuth.proveedor == "google", IdentidadOAuth.proveedor_id == google_sub)
        .first()
    )
    usuario = None
    if identidad:
        usuario = db.query(Usuario).filter(Usuario.id == identidad.usuario_id, Usuario.deleted_at.is_(None)).first()
        if not usuario:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cuenta de usuario deshabilitada.")
    else:
        usuario = db.query(Usuario).filter(Usuario.email == email_clean, Usuario.deleted_at.is_(None)).first()
        if not usuario:
            usuario = Usuario(
                nombre=nombre,
                email=email_clean,
                email_verificado=True,
                rol="usuario",
            )
            db.add(usuario)
            db.commit()
            db.refresh(usuario)
        elif not usuario.email_verificado:
            usuario.email_verificado = True

        identidad = IdentidadOAuth(
            usuario_id=usuario.id,
            proveedor="google",
            proveedor_id=google_sub,
        )
        db.add(identidad)
        db.commit()

    return _emitir_tokens(db, usuario, request)
