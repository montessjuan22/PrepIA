"""Pruebas unitarias e integrales del motor de análisis de CV con IA (sin llamadas HTTP reales)."""
import json
from unittest.mock import MagicMock

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base
from app.models.privacidad import HistorialConsentimiento
from app.models.seleccion import AnalisisCV, Empresa, HojaDeVida, Postulacion, Vacante
from app.models.usuarios import Usuario
from app.services import cv_ai_analyzer, llm_provider


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


def test_anonimizar_texto_elimina_pii_y_atributos_protegidos():
    raw = (
        "Juan Sebastián Montes\n"
        "Edad: 27 años\n"
        "Estado civil: Soltero\n"
        "Nacionalidad: Colombiana\n"
        "Género: Masculino\n"
        "Foto adjunta\n"
        "Correo: juan.montes@correo.com\n"
        "Tel: +57 315 782 8483\n"
        "C.C. 1.140.889.101\n"
        "GitHub: https://github.com/montessjuan22 @juanmontes\n"
        "Dirección: Calle 45 # 12-30\n"
        "Fecha de nacimiento: 15/03/1999\n"
        "Experiencia: 3 años desarrollando APIs en Python, FastAPI y PostgreSQL."
    )
    anon, truncado = cv_ai_analyzer.anonimizar_texto(raw, nombre_candidato="Juan Sebastián Montes")

    assert truncado is False
    assert "juan.montes@correo.com" not in anon
    assert "315 782 8483" not in anon
    assert "1.140.889.101" not in anon
    assert "github.com/montessjuan22" not in anon
    assert "@juanmontes" not in anon
    assert "Calle 45" not in anon
    assert "15/03/1999" not in anon
    assert "Juan" not in anon and "Montes" not in anon
    assert "Edad:" not in anon
    assert "Estado civil" not in anon
    assert "Nacionalidad" not in anon
    assert "Género" not in anon
    assert "[CANDIDATO]" in anon
    assert "Python, FastAPI y PostgreSQL" in anon


def test_anonimizar_texto_trunca_a_12000_caracteres():
    largo = "Python FastAPI SQL " * 1000
    anon, truncado = cv_ai_analyzer.anonimizar_texto(largo)
    assert truncado is True
    assert len(anon) <= cv_ai_analyzer.MAX_CV_CHARS


def test_system_and_user_prompts_incluyen_reglas_y_delimitadores():
    sys_p = cv_ai_analyzer.build_system_prompt()
    usr_p = cv_ai_analyzer.build_user_prompt("Backend Python", "Python\nFastAPI", "Experiencia en Python", False)

    assert "DATO NO CONFIABLE" in sys_p
    assert "alertas" in sys_p
    assert "<vacante>" in usr_p and "</vacante>" in usr_p
    assert "<hoja_de_vida>" in usr_p and "</hoja_de_vida>" in usr_p


def test_validacion_rechaza_puntajes_fuera_de_rango_y_json_malo(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "ollama")
    calls = {"count": 0}

    def fake_completar(system: str, user: str) -> str:
        calls["count"] += 1
        if calls["count"] == 1:
            return "{json roto"
        # Segundo intento: puntaje fuera de 0-100
        return json.dumps({
            "puntaje_afinidad": 150,
            "experiencia_anios": 2,
            "habilidades_detectadas": ["Python"],
            "habilidades_faltantes": [],
            "resumen": "Texto",
            "alertas": [],
        })

    monkeypatch.setattr(cv_ai_analyzer, "completar", fake_completar)

    output, provider = cv_ai_analyzer.evaluate_cv_with_ai_or_fallback(
        db=None,
        usuario_id=None,
        cv_text="Experiencia en Python y SQL",
        nombre_candidato="Ana",
        titulo_vacante="Backend",
        requisitos_vacante="Python\nDocker",
    )

    assert calls["count"] == 2
    assert provider == "local"
    assert 0 <= output.puntaje_afinidad <= 100


def test_respaldo_ante_error_http_de_proveedor(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "groq")
    monkeypatch.setattr(settings, "AI_ALLOW_EXTERNAL", True)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "fake-key")
    monkeypatch.setattr(cv_ai_analyzer, "puede_enviar_a_ia_externa", lambda db, uid: True)
    monkeypatch.setattr(llm_provider.time, "sleep", lambda _s: None)

    mock_resp = MagicMock()
    mock_resp.status_code = 503
    monkeypatch.setattr(httpx, "post", lambda *args, **kwargs: mock_resp)

    output, provider = cv_ai_analyzer.evaluate_cv_with_ai_or_fallback(
        db=MagicMock(),
        usuario_id=1,
        cv_text="Desarrollador Python y FastAPI",
        nombre_candidato="Luis",
        titulo_vacante="Backend Python",
        requisitos_vacante="Python\nFastAPI",
    )

    assert provider == "local"
    assert 0 <= output.puntaje_afinidad <= 100


def test_puede_enviar_a_ia_externa_respeta_ambas_condiciones(db_session, monkeypatch):
    u = Usuario(nombre="Candidato", email="cand@test.com", rol="usuario")
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)

    # Caso 1: AI_ALLOW_EXTERNAL = False y sin consentimiento
    monkeypatch.setattr(settings, "AI_ALLOW_EXTERNAL", False)
    assert cv_ai_analyzer.puede_enviar_a_ia_externa(db_session, u.id) is False

    # Caso 2: AI_ALLOW_EXTERNAL = True pero sin consentimiento 'terceros'
    monkeypatch.setattr(settings, "AI_ALLOW_EXTERNAL", True)
    assert cv_ai_analyzer.puede_enviar_a_ia_externa(db_session, u.id) is False

    # Caso 3: Consentimiento aceptado=True
    db_session.add(HistorialConsentimiento(usuario_id=u.id, tipo="terceros", aceptado=True))
    db_session.commit()
    assert cv_ai_analyzer.puede_enviar_a_ia_externa(db_session, u.id) is True

    # Caso 4: Nuevo registro revoca consentimiento (append-only)
    db_session.add(HistorialConsentimiento(usuario_id=u.id, tipo="terceros", aceptado=False))
    db_session.commit()
    assert cv_ai_analyzer.puede_enviar_a_ia_externa(db_session, u.id) is False


def test_analizar_postulacion_upsert_y_transicion_segura(db_session, monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "local")

    emp = Empresa(nombre="Acme", sector="Tech")
    rec = Usuario(nombre="Rec", email="rec@acme.com", rol="reclutador", empresa=emp)
    cand = Usuario(nombre="Cand", email="cand2@test.com", rol="usuario")
    db_session.add_all([emp, rec, cand])
    db_session.flush()

    vac = Vacante(
        empresa_id=emp.id,
        reclutador_id=rec.id,
        titulo="Desarrollador Python",
        requisitos="Python\nPostgreSQL\nDocker",
        estado="abierta",
    )
    hoja = HojaDeVida(
        usuario_id=cand.id,
        nombre_archivo="cv.pdf",
        url_archivo="/uploads/cv/cv.pdf",
        texto_extraido="3 años de experiencia en Python y PostgreSQL.",
    )
    db_session.add_all([vac, hoja])
    db_session.flush()

    post = Postulacion(
        vacante_id=vac.id,
        usuario_id=cand.id,
        hoja_vida_id=hoja.id,
        estado="postulado",
    )
    db_session.add(post)
    db_session.commit()

    res1 = cv_ai_analyzer.analizar_postulacion_con_ia(db_session, post.id)
    assert res1["estado_postulacion"] == "cv_analizado"
    assert res1["estado_postulacion"] not in ("aprobado", "rechazado")
    assert db_session.query(AnalisisCV).filter(AnalisisCV.postulacion_id == post.id).count() == 1

    # Segundo análisis hace upsert sin duplicar y sin cambiar estado si ya no está en 'postulado'
    post.estado = "en_revision"
    db_session.commit()
    res2 = cv_ai_analyzer.analizar_postulacion_con_ia(db_session, post.id)
    assert res2["estado_postulacion"] == "en_revision"
    assert db_session.query(AnalisisCV).filter(AnalisisCV.postulacion_id == post.id).count() == 1
