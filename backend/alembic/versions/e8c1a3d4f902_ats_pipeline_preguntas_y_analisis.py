"""ATS de postulantes (etapas, notas, calificación, preguntas filtro y estado pausada en vacantes).

Revision ID: e8c1a3d4f902
Revises: d7b4f1a2e801
Create Date: 2026-11-26 03:07:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8c1a3d4f902"
down_revision: Union[str, Sequence[str], None] = "d7b4f1a2e801"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega campos ATS en vacantes, postulaciones, analisis_cv y decisiones_postulacion."""
    # --- vacantes ---
    op.add_column("vacantes", sa.Column("preguntas_filtro", sa.Text(), nullable=True))
    op.execute("ALTER TABLE vacantes DROP CONSTRAINT IF EXISTS ck_vacantes_estado")
    op.create_check_constraint(
        "ck_vacantes_estado",
        "vacantes",
        "estado IN ('borrador','pendiente_aprobacion','abierta','pausada','rechazada','cerrada')",
    )

    # --- postulaciones ---
    op.add_column(
        "postulaciones",
        sa.Column("etapa_seleccion", sa.String(length=30), server_default="postulado", nullable=False),
    )
    op.add_column("postulaciones", sa.Column("notas_reclutador", sa.Text(), nullable=True))
    op.add_column("postulaciones", sa.Column("calificacion_reclutador", sa.Integer(), nullable=True))
    op.add_column(
        "postulaciones",
        sa.Column("revisado_por_empresa", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column("postulaciones", sa.Column("respuestas_filtro", sa.Text(), nullable=True))

    op.create_check_constraint(
        "ck_postulaciones_etapa_seleccion",
        "postulaciones",
        "etapa_seleccion IN ('postulado','preseleccionado','en_entrevista','prueba_tecnica','finalista','contratado','descartado')",
    )
    op.create_check_constraint(
        "ck_postulaciones_calificacion_reclutador",
        "postulaciones",
        "calificacion_reclutador IS NULL OR (calificacion_reclutador BETWEEN 1 AND 5)",
    )

    # Sincronizar etapa_seleccion para filas históricas ya aprobadas/rechazadas si existen
    op.execute("UPDATE postulaciones SET etapa_seleccion = 'contratado', revisado_por_empresa = true WHERE estado = 'aprobado'")
    op.execute("UPDATE postulaciones SET etapa_seleccion = 'descartado', revisado_por_empresa = true WHERE estado = 'rechazado'")

    # --- analisis_cv ---
    op.add_column("analisis_cv", sa.Column("habilidades_faltantes", sa.Text(), nullable=True))
    op.add_column("analisis_cv", sa.Column("alertas", sa.Text(), nullable=True))
    op.add_column("analisis_cv", sa.Column("proveedor_ia", sa.String(length=30), nullable=True))

    # --- decisiones_postulacion ---
    op.alter_column("decisiones_postulacion", "resultado", type_=sa.String(length=30), existing_type=sa.String(length=15))
    op.execute("ALTER TABLE decisiones_postulacion DROP CONSTRAINT IF EXISTS ck_decisiones_postulacion_resultado")
    op.create_check_constraint(
        "ck_decisiones_postulacion_resultado",
        "decisiones_postulacion",
        "resultado IN ('aprobado','rechazado','en_revision','postulado','preseleccionado','en_entrevista','prueba_tecnica','finalista','contratado','descartado')",
    )


def downgrade() -> None:
    """Revierte campos ATS."""
    op.execute("ALTER TABLE decisiones_postulacion DROP CONSTRAINT IF EXISTS ck_decisiones_postulacion_resultado")
    op.create_check_constraint(
        "ck_decisiones_postulacion_resultado",
        "decisiones_postulacion",
        "resultado IN ('aprobado','rechazado','en_revision')",
    )
    op.alter_column("decisiones_postulacion", "resultado", type_=sa.String(length=15), existing_type=sa.String(length=30))

    for col in ("proveedor_ia", "alertas", "habilidades_faltantes"):
        op.drop_column("analisis_cv", col)

    op.execute("ALTER TABLE postulaciones DROP CONSTRAINT IF EXISTS ck_postulaciones_calificacion_reclutador")
    op.execute("ALTER TABLE postulaciones DROP CONSTRAINT IF EXISTS ck_postulaciones_etapa_seleccion")
    for col in ("respuestas_filtro", "revisado_por_empresa", "calificacion_reclutador", "notas_reclutador", "etapa_seleccion"):
        op.drop_column("postulaciones", col)

    op.execute("ALTER TABLE vacantes DROP CONSTRAINT IF EXISTS ck_vacantes_estado")
    op.create_check_constraint(
        "ck_vacantes_estado",
        "vacantes",
        "estado IN ('borrador','pendiente_aprobacion','abierta','rechazada','cerrada')",
    )
    op.drop_column("vacantes", "preguntas_filtro")
