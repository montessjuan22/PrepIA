# PrepIA — Backend

Simulador de entrevistas técnicas para aspirantes a desarrolladores de software.

## Stack
- FastAPI + SQLAlchemy + PostgreSQL
- Autenticación: JWT (access + refresh) + OAuth (Google/GitHub)
- Ejecución de código: servicio externo (Judge0) vía `CODE_EXECUTION_API_URL`

## Cómo levantar el proyecto en local

```bash
# 1. Crear entorno virtual
python -m venv venv
source venv/bin/activate      # en Windows: venv\Scripts\activate

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Levantar la base de datos con Docker
docker compose up -d

# 4. Configurar variables de entorno
cp .env.example .env
# editar .env con tus valores locales

# 5. Correr el servidor
uvicorn app.main:app --reload
```

La API queda disponible en `http://localhost:8000`, con documentación
automática en `http://localhost:8000/docs`.

## Estructura de carpetas

```
app/
  core/        # configuración, conexión a BD, seguridad (JWT, hashing)
  models/      # modelos SQLAlchemy (uno por tabla del esquema relacional)
  schemas/     # esquemas Pydantic (request/response de cada endpoint)
  routers/     # rutas de la API, agrupadas por módulo (auth, ejercicios, etc.)
  services/    # lógica de negocio que no debe vivir en los routers
```

## Flujo de ramas

- `main`: siempre desplegable, solo se mergea desde `develop` vía PR revisado.
- `develop`: rama de integración del equipo.
- `feature/<modulo>`: una rama por persona/módulo (ej. `feature/auth`,
  `feature/ejercicios`, `feature/soporte`). Se mergea a `develop` vía PR.

## Módulos y responsables

| Módulo | Cubre | Estado |
|---|---|---|
| auth | Registro, login, OAuth, recuperación de contraseña | 🔲 pendiente |
| ejercicios | Ejercicios, temas, pistas, casos de prueba | 🔲 pendiente |
| sesiones | Sesiones de prueba, respuestas, ejecución de código | 🔲 pendiente |
| retroalimentacion | Retroalimentación IA + fallback experto | 🔲 pendiente |
| soporte | Tickets y mensajes | 🔲 pendiente |
| privacidad | Consentimientos, exportar/eliminar datos | 🔲 pendiente |
