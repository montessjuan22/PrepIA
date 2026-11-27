"""Pruebas de permisos totales del Superadmin: publicar vacantes, chatbot con controles admin y análisis de CVs."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.deps import get_current_user
from app.main import app
from app.models.seleccion import Empresa, HojaDeVida, Vacante
from app.models.usuarios import Usuario


@pytest.fixture()
def superadmin_env():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE usuarios ADD COLUMN especialidad VARCHAR(120)"))
        conn.execute(text("ALTER TABLE usuarios ADD COLUMN ciudad VARCHAR(100)"))
        conn.commit()

    Session = sessionmaker(bind=engine)
    db = Session()

    emp = Empresa(nombre="GammaRay Tech", razon_social="GammaRay Tech S.A.S.", sector="TI", activa=True)
    db.add(emp)
    db.flush()

    superadmin = Usuario(nombre="Juan Super", email="super@prepia.co", rol="admin", es_admin_principal=True)
    reclutador = Usuario(nombre="Rec", email="rec@gammaray.co", rol="reclutador", empresa_id=emp.id)
    cand = Usuario(nombre="Ana Dev", email="ana@dev.co", rol="usuario")
    db.add_all([superadmin, reclutador, cand])
    db.flush()

    hv = HojaDeVida(
        usuario_id=cand.id,
        nombre_archivo="ana_cv.pdf",
        url_archivo="/tmp/ana_cv.pdf",
        texto_extraido="Desarrolladora Python FastAPI PostgreSQL React Docker con 4 años de experiencia.",
    )
    db.add(hv)
    db.commit()
    for obj in (emp, superadmin, reclutador, cand):
        db.refresh(obj)

    state = {"current": superadmin}
    app.dependency_overrides[get_db] = lambda: (yield db)
    app.dependency_overrides[get_current_user] = lambda: db.get(Usuario, state["current"].id)

    client = TestClient(app)
    try:
        yield client, db, state, {"emp": emp, "superadmin": superadmin, "reclutador": reclutador, "cand": cand}
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_superadmin_publica_vacante_directamente_abierta(superadmin_env):
    client, db, state, ctx = superadmin_env

    # 1. Superadmin crea vacante y queda publicada directamente ('abierta')
    state["current"] = ctx["superadmin"]
    res_super = client.post(
        "/api/v1/empresa/vacantes",
        json={
            "titulo": "Arquitecto Cloud Senior",
            "categoria_area": "Tecnología y Sistemas",
            "cantidad_vacantes": 1,
            "descripcion": "Liderar arquitectura de microservicios en FastAPI y PostgreSQL.",
            "modalidad": "remoto",
            "tipo_contrato": "Término Indefinido",
            "jornada": "Tiempo Completo",
            "esquema_salarial": "rango_salarial",
            "salario_min_cop": 8000000,
            "salario_max_cop": 12000000,
            "salario_visible": True,
            "experiencia": "3 a 5 años",
            "nivel_educativo": "Profesional",
            "requisitos_indispensables": "Python\nFastAPI\nPostgreSQL",
            "habilidades_clave": ["Python", "FastAPI", "PostgreSQL"],
            "idiomas": [],
            "preguntas_filtro": [],
            "puntaje_minimo": 65,
            "empresa_id": ctx["emp"].id,
        },
    )
    assert res_super.status_code == 201
    assert res_super.json()["vacancy"]["estado"] == "abierta"

    # 2. Reclutador normal sigue creando en 'pendiente_aprobacion'
    state["current"] = ctx["reclutador"]
    res_rec = client.post(
        "/api/v1/empresa/vacantes",
        json={
            "titulo": "Analista QA Junior",
            "categoria_area": "Tecnología y Sistemas",
            "cantidad_vacantes": 1,
            "descripcion": "Pruebas automatizadas con pytest y Playwright.",
            "modalidad": "remoto",
            "tipo_contrato": "Término Indefinido",
            "jornada": "Tiempo Completo",
            "esquema_salarial": "a_convenir",
            "salario_visible": False,
            "experiencia": "Sin experiencia / Primer empleo",
            "nivel_educativo": "Tecnólogo",
            "requisitos_indispensables": "pytest\nSQL",
            "habilidades_clave": ["pytest"],
            "idiomas": [],
            "preguntas_filtro": [],
            "puntaje_minimo": 60,
        },
    )
    assert res_rec.status_code == 201
    assert res_rec.json()["vacancy"]["estado"] == "pendiente_aprobacion"


def test_admin_chatbot_abierto_ejecuta_controles_y_audita_cv(superadmin_env):
    client, db, state, ctx = superadmin_env
    state["current"] = ctx["superadmin"]

    # Crear vacante pendiente para probar aprobación desde el chat
    vac = Vacante(
        empresa_id=ctx["emp"].id,
        reclutador_id=ctx["reclutador"].id,
        titulo="Desarrollador Backend FastAPI",
        descripcion="Desarrollo de APIs en Python y PostgreSQL.",
        requisitos="Python\nFastAPI\nPostgreSQL",
        estado="pendiente_aprobacion",
        puntaje_minimo=60,
    )
    db.add(vac)
    db.commit()
    db.refresh(vac)

    # 1. Consultar estado global abierto
    r1 = client.post("/api/v1/admin/chat", json={"mensaje": "Dame un resumen del sistema"})
    assert r1.status_code == 200
    assert "Superadmin" in r1.json()["respuesta"]

    # 2. Aprobar vacante directamente desde el chat
    r2 = client.post("/api/v1/admin/chat", json={"mensaje": f"aprobar vacante {vac.id}"})
    assert r2.status_code == 200
    assert r2.json()["accion_ejecutada"] == "aprobar_vacante"
    db.refresh(vac)
    assert vac.estado == "abierta"

    # 3. Asignar rol de soporte desde el chat
    r3 = client.post("/api/v1/admin/chat", json={"mensaje": f"dar soporte a {ctx['cand'].email}"})
    assert r3.status_code == 200
    assert r3.json()["accion_ejecutada"] == "cambio_rol"
    db.refresh(ctx["cand"])
    assert ctx["cand"].rol == "agente_soporte"

    # 4. Auditar CV de un usuario registrado + analizar texto libre desde Admin
    r4 = client.get(f"/api/v1/admin/candidatos/{ctx['cand'].id}/cv-analisis")
    assert r4.status_code == 200
    assert r4.json()["analisis"]["score"] > 0
    assert len(r4.json()["vacantes_match"]) == 1

    r5 = client.post(
        "/api/v1/admin/cv/analizar-texto",
        json={
            "texto_cv": "Ingeniero Python con 5 años en FastAPI, PostgreSQL, Docker y React.",
            "vacante_id": vac.id,
        },
    )
    assert r5.status_code == 200
    assert r5.json()["vacantes_match"][0]["match"] >= 60
