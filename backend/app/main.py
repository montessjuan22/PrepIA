from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import admin, auth, catalogos, empresa, soporte

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
app.include_router(catalogos.router, prefix="/api/v1/catalogos", tags=["catalogos"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(empresa.router, prefix="/api/v1/empresa", tags=["empresa"])
app.include_router(soporte.router, prefix="/api/v1/soporte", tags=["soporte"])


@app.get("/health")
def health_check():
    """Endpoint simple para verificar que el servicio está arriba (útil para el hosting)."""
    return {"status": "ok"}
