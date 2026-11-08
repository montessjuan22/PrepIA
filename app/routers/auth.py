from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.usuarios import Usuario
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
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
