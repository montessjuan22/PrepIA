from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth

app = FastAPI(
    title="PrepIA API",
    description="Backend del simulador de entrevistas técnicas para desarrolladores de software.",
    version="0.1.0",
)

# CORS: ajustar origins en producción, nunca dejar "*" con credenciales activas
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])


@app.get("/health")
def health_check():
    """Endpoint simple para verificar que el servicio está arriba (útil para el hosting)."""
    return {"status": "ok"}
