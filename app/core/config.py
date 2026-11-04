from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Todas las variables sensibles viven en el .env (nunca en el código).
    Ver .env.example para la lista completa que necesita el proyecto.
    """

    # Base de datos
    DATABASE_URL: str

    # Autenticación
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # Ejecución de código (ej. Judge0)
    CODE_EXECUTION_API_URL: str = ""
    CODE_EXECUTION_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
