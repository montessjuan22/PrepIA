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

    # Proveedores IA (por defecto 'local' = $0 real, sin API keys ni cobros)
    AI_PROVIDER: str = "local"  # local | ollama | groq | gemini | openai | anthropic
    AI_ALLOW_EXTERNAL: bool = False
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3-flash-preview"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-haiku-4-5-20251001"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
