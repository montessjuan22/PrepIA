from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.usuarios import Usuario
from app.schemas.auth import (
    ForgotPasswordRequest,
    GoogleConfigResponse,
    GoogleLoginRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TokenResponse,
    UsuarioResponse,
)
from app.services import auth_service

router = APIRouter()


@router.get("/ping")
def ping(db: Session = Depends(get_db)):
    """Ruta de prueba: confirma que la app arranca y que la conexión a BD funciona."""
    return {"message": "pong"}


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_user(db, data)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    return auth_service.login_user(db, data, request)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    return auth_service.refresh_session(db, data.refresh_token, request)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: RefreshRequest, db: Session = Depends(get_db)):
    auth_service.logout_user(db, data.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UsuarioResponse)
def me(usuario: Usuario = Depends(get_current_user)):
    return usuario


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return auth_service.forgot_password(db, data)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    return auth_service.reset_password(db, data)


@router.get("/google/config", response_model=GoogleConfigResponse)
def google_config():
    """Devuelve el Client ID público de Google OAuth configurado en el backend."""
    client_id = settings.GOOGLE_CLIENT_ID.strip()
    return GoogleConfigResponse(configured=bool(client_id), client_id=client_id or None)


@router.post("/google", response_model=TokenResponse)
def google_auth(data: GoogleLoginRequest, request: Request, db: Session = Depends(get_db)):
    return auth_service.google_auth_user(db, data, request)


# Endpoints del Candidato y Diagnóstico de Hoja de Vida (CV) con IA
from app.routers import candidato
router.include_router(candidato.router, prefix="/candidato", tags=["candidato"])
router.include_router(candidato.router, prefix="", tags=["candidato"])

