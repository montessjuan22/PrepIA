"""Pruebas unitarias e integrales del módulo de Soporte Técnico y permisos de Superadmin."""
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.deps import get_current_user, is_support_authorized, require_support_agent
from app.main import app
from app.models.usuarios import Usuario
from app.routers import admin as admin_router


@pytest.fixture()
def test_env():
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

    superadmin = Usuario(nombre="Super Admin", email="super@prepia.co", rol="admin", es_admin_principal=True)
    sec_admin = Usuario(nombre="Admin Sec", email="sec@prepia.co", rol="admin", es_admin_principal=False)
    candidato1 = Usuario(nombre="Ana Candidata", email="ana@prepia.co", rol="usuario")
    candidato2 = Usuario(nombre="Luis Otro", email="luis@prepia.co", rol="usuario")
    soporte_user = Usuario(nombre="Sofia Soporte", email="sofia@prepia.co", rol="usuario")
    db.add_all([superadmin, sec_admin, candidato1, candidato2, soporte_user])
    db.commit()
    for u in (superadmin, sec_admin, candidato1, candidato2, soporte_user):
        db.refresh(u)

    state = {"current": superadmin}

    def override_get_db():
        yield db

    def override_get_current_user():
        return db.get(Usuario, state["current"].id)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    client = TestClient(app)
    try:
        yield client, db, state, {
            "superadmin": superadmin,
            "sec_admin": sec_admin,
            "candidato1": candidato1,
            "candidato2": candidato2,
            "soporte_user": soporte_user,
        }
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_superadmin_tiene_permisos_de_soporte_y_admin_secundario_no(test_env):
    client, db, state, users = test_env

    assert is_support_authorized(users["superadmin"]) is True
    assert is_support_authorized(users["sec_admin"]) is False
    assert is_support_authorized(users["candidato1"]) is False

    # Superadmin accede sin restricciones a la mesa de soporte
    state["current"] = users["superadmin"]
    res_super = client.get("/api/v1/soporte/tickets")
    assert res_super.status_code == 200
    assert res_super.json()["viewer"]["es_admin_principal"] is True

    # Admin secundario sin rol agente_soporte recibe 403 en mesa de soporte
    state["current"] = users["sec_admin"]
    res_sec = client.get("/api/v1/soporte/tickets")
    assert res_sec.status_code == 403

    # Dependencia directa lanza 403 para candidato
    with pytest.raises(HTTPException) as exc:
        require_support_agent(users["candidato1"])
    assert exc.value.status_code == 403


def test_superadmin_puede_asignar_agente_soporte_a_cualquier_usuario(test_env):
    client, db, state, users = test_env
    state["current"] = users["superadmin"]

    target = users["soporte_user"]
    res = client.patch(
        f"/api/v1/admin/users/{target.id}/role",
        json={"rol": "agente_soporte"},
    )
    assert res.status_code == 200
    assert res.json()["user"]["rol"] == "agente_soporte"

    db.refresh(target)
    assert is_support_authorized(target) is True

    # El nuevo agente de soporte ya puede acceder a la cola completa de tickets
    state["current"] = target
    res_tickets = client.get("/api/v1/soporte/tickets")
    assert res_tickets.status_code == 200
    agent_ids = {a["id"] for a in res_tickets.json()["agents"]}
    assert users["superadmin"].id in agent_ids
    assert target.id in agent_ids


def test_flujo_completo_tickets_creacion_asignacion_respuesta_y_cierre(test_env):
    client, db, state, users = test_env

    # 1. Superadmin promueve a Sofia como agente_soporte
    state["current"] = users["superadmin"]
    assert client.patch(
        f"/api/v1/admin/users/{users['soporte_user'].id}/role",
        json={"rol": "agente_soporte"},
    ).status_code == 200

    # 2. Candidato 1 crea un ticket
    state["current"] = users["candidato1"]
    res_create = client.post(
        "/api/v1/soporte/tickets",
        json={
            "tipo_solicitud": "problema_tecnico",
            "asunto": "No carga portada de CV",
            "descripcion": "Subí mi archivo PDF pero no aparece la vista previa.",
            "prioridad": "alta",
        },
    )
    assert res_create.status_code == 201
    ticket = res_create.json()["ticket"]
    ticket_id = ticket["id"]
    assert ticket["estado"] == "pendiente"

    # 3. Candidato 2 no puede ver ni responder el ticket de Candidato 1
    state["current"] = users["candidato2"]
    assert client.get(f"/api/v1/soporte/tickets/{ticket_id}").status_code == 403
    assert client.post(
        f"/api/v1/soporte/tickets/{ticket_id}/mensajes",
        json={"mensaje": "Intento intruso"},
    ).status_code == 403

    # 4. Superadmin asigna el ticket a Sofia (agente_soporte) y cambia a en_proceso
    state["current"] = users["superadmin"]
    res_assign = client.patch(
        f"/api/v1/soporte/tickets/{ticket_id}",
        json={"agente_id": users["soporte_user"].id},
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["ticket"]["agente_id"] == users["soporte_user"].id
    assert res_assign.json()["ticket"]["estado"] == "en_proceso"

    # 5. Superadmin también puede responder directamente como soporte
    res_super_reply = client.post(
        f"/api/v1/soporte/tickets/{ticket_id}/mensajes",
        json={"mensaje": "Revisamos tu archivo desde Superadmin/Soporte."},
    )
    assert res_super_reply.status_code == 201
    assert res_super_reply.json()["ticket"]["mensajes"][0]["autor_es_superadmin"] is True

    # 6. Agente de soporte responde y resuelve el ticket
    state["current"] = users["soporte_user"]
    res_agent_reply = client.post(
        f"/api/v1/soporte/tickets/{ticket_id}/mensajes",
        json={"mensaje": "Portada regenerada correctamente."},
    )
    assert res_agent_reply.status_code == 201
    assert len(res_agent_reply.json()["ticket"]["mensajes"]) == 2

    res_resolve = client.patch(
        f"/api/v1/soporte/tickets/{ticket_id}",
        json={"estado": "resuelto"},
    )
    assert res_resolve.status_code == 200
    assert res_resolve.json()["ticket"]["estado"] == "resuelto"

    # 7. Candidato 1 consulta su ticket y ve las dos respuestas
    state["current"] = users["candidato1"]
    res_mine = client.get("/api/v1/soporte/mis-tickets")
    assert res_mine.status_code == 200
    assert len(res_mine.json()["tickets"]) == 1
    assert len(res_mine.json()["tickets"][0]["mensajes"]) == 2
