from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter()


@router.get("/ping")
def ping(db: Session = Depends(get_db)):
    """
    Ruta de prueba para confirmar que la app arranca y la conexión a BD funciona.
    Aquí es donde en el paso 4 (módulo de autenticación) irán /register, /login,
    /refresh, /oauth/google, /oauth/github, etc. — ver app/models y app/schemas
    para empezar a definir esos contratos.
    """
    return {"message": "pong"}
