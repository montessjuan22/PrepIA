"""Importa todos los modelos para que queden registrados en Base.metadata.

Alembic (autogenerate) y create_all() solo ven las tablas de los modelos que se
hayan importado, así que cualquier modelo nuevo debe agregarse aquí.
"""
from app.models.usuarios import (  # noqa: F401
    IdentidadOAuth, SesionAuth, TokenRecuperacion, TokenVerificacionEmail, Usuario,
)
from app.models.ejercicios import (  # noqa: F401
    CasoPrueba, Ejercicio, LenguajeProgramacion, NivelDificultad, Pista, Tema,
    ejercicio_lenguajes, ejercicio_temas,
)
from app.models.sesiones import RespuestaSesion, ResultadoEjecucion, SesionPrueba  # noqa: F401
from app.models.retroalimentacion import (  # noqa: F401
    AnalisisComunicacion, GrabacionSesion, Recomendacion, RetroalimentacionIA,
)
from app.models.soporte import MensajeTicket, TicketSoporte  # noqa: F401
from app.models.privacidad import HistorialConsentimiento, LogAuditoria, SolicitudPrivacidad  # noqa: F401
