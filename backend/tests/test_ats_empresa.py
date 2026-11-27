"""Pruebas unitarias del módulo ATS de empresas (ranking IA, etapas, notificaciones, pausar/cerrar y preguntas filtro)."""
import json
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.privacidad import HistorialConsentimiento
from app.models.seleccion import AnalisisCV, DecisionPostulacion, Empresa, HojaDeVida, Notificacion, Postulacion, Vacante
from app.models.usuarios import Usuario
from app.core.config import settings
from app.routers import empresa as empresa_router
from app.schemas.empresa import (
    CompararCandidatosRequest,
    EvaluarTalentoMatchRequest,
    PostulacionATSUpdateRequest,
    VacanteEstadoRequest,
)
from app.services import cv_ai_analyzer


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


def _seed_ats_scenario(db):
    emp = Empresa(nombre="Andina Tech S.A.S.", razon_social="Andina Tech S.A.S.", sector="TI")
    db.add(emp)
    db.flush()

    rec = Usuario(nombre="Reclutador", email="rec@andina.co", rol="reclutador", empresa_id=emp.id)
    cand1 = Usuario(nombre="Ana Alta", email="ana@test.co", telefono="3151112233", rol="usuario")
    cand2 = Usuario(nombre="Luis Medio", email="luis@test.co", telefono="3004445566", rol="usuario")
    db.add_all([rec, cand1, cand2])
    db.flush()

    vac = Vacante(
        empresa_id=emp.id,
        reclutador_id=rec.id,
        titulo="Desarrollador Backend Python",
        descripcion="Construcción de APIs REST con FastAPI y PostgreSQL.",
        requisitos="Python\nFastAPI\nPostgreSQL",
        preguntas_filtro=json.dumps([
            {"id": "q1", "pregunta": "¿Cuál es tu aspiración salarial en COP?", "tipo": "numero", "obligatoria": True}
        ]),
        estado="abierta",
    )
    db.add(vac)
    db.flush()

    hv1 = HojaDeVida(usuario_id=cand1.id, nombre_archivo="ana.pdf", url_archivo="/tmp/ana.pdf", texto_extraido="Python FastAPI PostgreSQL 4 años")
    hv2 = HojaDeVida(usuario_id=cand2.id, nombre_archivo="luis.pdf", url_archivo="/tmp/luis.pdf", texto_extraido="Python 1 año")
    db.add_all([hv1, hv2])
    db.flush()

    p_low = Postulacion(
        vacante_id=vac.id,
        usuario_id=cand2.id,
        hoja_vida_id=hv2.id,
        estado="cv_analizado",
        puntaje_cv=58,
    )
    p_high = Postulacion(
        vacante_id=vac.id,
        usuario_id=cand1.id,
        hoja_vida_id=hv1.id,
        estado="cv_analizado",
        puntaje_cv=92,
        respuestas_filtro=json.dumps([{"pregunta": "¿Cuál es tu aspiración salarial en COP?", "respuesta": "4500000"}]),
    )
    db.add_all([p_low, p_high])
    db.flush()

    db.add_all([
        AnalisisCV(
            postulacion_id=p_low.id,
            puntaje_afinidad=58,
            experiencia_anios=1.0,
            habilidades_detectadas=json.dumps(["Python"]),
            habilidades_faltantes=json.dumps(["FastAPI", "PostgreSQL"]),
            resumen="Perfil junior en Python con brechas en FastAPI y PostgreSQL.",
            proveedor_ia="gemini",
        ),
        AnalisisCV(
            postulacion_id=p_high.id,
            puntaje_afinidad=92,
            experiencia_anios=4.0,
            habilidades_detectadas=json.dumps(["Python", "FastAPI", "PostgreSQL"]),
            habilidades_faltantes=json.dumps([]),
            resumen="Excelente ajuste técnico para el cargo.",
            proveedor_ia="gemini",
        ),
    ])
    db.commit()
    return rec, vac, p_high, p_low


def test_overview_rankea_postulantes_y_calcula_sin_revisar(db_session):
    rec, _vac, p_high, p_low = _seed_ats_scenario(db_session)

    ov = empresa_router.get_company_overview(usuario=rec, db=db_session)
    assert ov["stats"]["total_applicants"] == 2
    assert ov["stats"]["unreviewed_applicants"] == 2
    assert ov["applicants"][0]["id"] == p_high.id
    assert ov["applicants"][0]["cv_score"] == 92.0
    assert ov["applicants"][0]["requisitos_cumplidos"] == ["Python", "FastAPI", "PostgreSQL"]
    assert ov["applicants"][0]["respuestas_filtro"][0]["respuesta"] == "4500000"
    assert ov["applicants"][1]["id"] == p_low.id
    assert ov["applicants"][1]["requisitos_faltantes"] == ["FastAPI", "PostgreSQL"]


def test_cambio_etapa_ats_guarda_notas_estrellas_y_notifica(db_session):
    rec, _vac, p_high, _p_low = _seed_ats_scenario(db_session)

    res = empresa_router.update_company_applicant_ats(
        postulacion_id=p_high.id,
        data=PostulacionATSUpdateRequest(
            etapa_seleccion="en_entrevista",
            notas_reclutador="Llamar el martes a las 10am por WhatsApp.",
            calificacion_reclutador=5,
            notificar_candidato=True,
        ),
        usuario=rec,
        db=db_session,
    )
    assert res["notificado"] is True
    app_data = res["applicant"]
    assert app_data["etapa_seleccion"] == "en_entrevista"
    assert app_data["etapa_label"] == "En Entrevista"
    assert app_data["calificacion_reclutador"] == 5
    assert app_data["revisado_por_empresa"] is True
    assert "martes" in app_data["notas_reclutador"]

    assert db_session.query(DecisionPostulacion).filter(DecisionPostulacion.postulacion_id == p_high.id).count() == 1
    notif = db_session.query(Notificacion).filter(Notificacion.usuario_id == p_high.usuario_id).first()
    assert notif is not None
    assert notif.tipo == "cambio_etapa"
    assert "Entrevista" in notif.titulo


def test_pausar_reactivar_y_cerrar_vacante_aprobada(db_session):
    rec, vac, _p_high, _p_low = _seed_ats_scenario(db_session)

    r_pause = empresa_router.change_company_vacancy_status(
        vac.id, VacanteEstadoRequest(estado="pausada"), usuario=rec, db=db_session
    )
    assert r_pause["vacancy"]["estado"] == "pausada"

    r_reopen = empresa_router.change_company_vacancy_status(
        vac.id, VacanteEstadoRequest(estado="abierta"), usuario=rec, db=db_session
    )
    assert r_reopen["vacancy"]["estado"] == "abierta"

    # Vacante pendiente no se puede activar sin aprobación de admin
    vac.estado = "pendiente_aprobacion"
    db_session.commit()
    with pytest.raises(HTTPException) as exc:
        empresa_router.change_company_vacancy_status(
            vac.id, VacanteEstadoRequest(estado="abierta"), usuario=rec, db=db_session
        )
    assert exc.value.status_code == 400


def test_reanalisis_individual_y_lote_pendientes_con_gemini_simulado(db_session, monkeypatch):
    rec, vac, p_high, p_low = _seed_ats_scenario(db_session)
    # Simular que p_low tenía análisis local y p_high ya tenía gemini
    p_low.analisis.proveedor_ia = "local"
    p_high.analisis.proveedor_ia = "gemini"
    db_session.commit()

    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "AI_ALLOW_EXTERNAL", True)

    calls = {"count": 0}

    def fake_completar(system: str, user: str) -> str:
        calls["count"] += 1
        return json.dumps({
            "puntaje_afinidad": 84,
            "experiencia_anios": 2,
            "habilidades_detectadas": ["Python", "FastAPI"],
            "habilidades_faltantes": ["PostgreSQL"],
            "resumen": "Buen potencial con FastAPI; reforzar PostgreSQL.",
            "alertas": [],
            "preguntas_entrevista": ["¿Cómo optimizas consultas lentas en PostgreSQL?"],
        })

    monkeypatch.setattr(cv_ai_analyzer, "completar", fake_completar)

    # Lote pendientes solo debe procesar p_low (omitir p_high que ya tiene gemini)
    batch_res = empresa_router.analyze_pending_applicants_with_ai(
        vacante_id=vac.id, usuario=rec, db=db_session
    )
    assert batch_res["procesados"] == 1
    assert batch_res["con_gemini"] == 1
    assert batch_res["omitidos_ya_analizados"] == 1
    assert calls["count"] == 1

    # Re-análisis individual actualiza preguntas_entrevista en PostgreSQL
    single_res = empresa_router.analyze_company_applicant_with_ai(
        postulacion_id=p_high.id, usuario=rec, db=db_session
    )
    assert single_res["proveedor_usado"] == "gemini"
    assert len(single_res["applicant"]["preguntas_entrevista"]) >= 1
    assert calls["count"] == 2


def test_talento_match_y_comparar_candidatos_ia(db_session, monkeypatch):
    rec, vac, p_high, p_low = _seed_ats_scenario(db_session)
    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "AI_ALLOW_EXTERNAL", True)

    # Candidato con consentimiento compartir_empresa
    cand = db_session.query(Usuario).filter(Usuario.id == p_high.usuario_id).first()
    db_session.add(HistorialConsentimiento(usuario_id=cand.id, tipo="compartir_empresa", aceptado=True))
    db_session.commit()

    def fake_completar(system: str, user: str) -> str:
        if "<candidatos>" in user:
            return json.dumps({
                "resumen_comparativo": "Candidato 1 supera ampliamente en experiencia backend.",
                "recomendacion_contratacion": "Priorizar entrevista técnica con Candidato 1.",
                "ranking": [
                    {
                        "etiqueta": "Candidato 1",
                        "fortalezas": ["FastAPI", "PostgreSQL"],
                        "riesgos_brechas": ["Ninguna crítica"],
                        "preguntas_entrevista": ["Describe un diseño escalable en FastAPI."],
                    },
                    {
                        "etiqueta": "Candidato 2",
                        "fortalezas": ["Python"],
                        "riesgos_brechas": ["Falta PostgreSQL"],
                        "preguntas_entrevista": ["¿Qué ORM has utilizado con Python?"],
                    },
                ],
            })
        return json.dumps({
            "puntaje_afinidad": 91,
            "experiencia_anios": 4,
            "habilidades_detectadas": ["Python", "FastAPI", "PostgreSQL"],
            "habilidades_faltantes": [],
            "resumen": "Talento altamente compatible con la vacante.",
            "alertas": [],
            "preguntas_entrevista": ["¿Cómo manejas migraciones sin downtime?"],
        })

    monkeypatch.setattr(cv_ai_analyzer, "completar", fake_completar)

    match_res = empresa_router.evaluate_talent_match_with_ai(
        data=EvaluarTalentoMatchRequest(usuario_id=cand.id, vacante_id=vac.id),
        usuario=rec,
        db=db_session,
    )
    assert match_res["match"]["proveedor_usado"] == "gemini"
    assert match_res["match"]["puntaje_afinidad"] == 91.0

    comp_res = empresa_router.compare_applicants_with_ai(
        vacante_id=vac.id,
        data=CompararCandidatosRequest(postulacion_ids=[p_high.id, p_low.id]),
        usuario=rec,
        db=db_session,
    )
    assert comp_res["comparison"]["proveedor_usado"] == "gemini"
    assert len(comp_res["comparison"]["ranking"]) == 2
    assert "Priorizar entrevista" in comp_res["comparison"]["recomendacion_contratacion"]

