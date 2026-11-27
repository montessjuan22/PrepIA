"""Perfil de empresa Colombia (NIT/RUT/Ley 1581) y vacantes flexibles multi-industria.

Revision ID: d7b4f1a2e801
Revises: c0e5eab960b8
Create Date: 2026-11-26 02:47:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d7b4f1a2e801"
down_revision: Union[str, Sequence[str], None] = "c0e5eab960b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Amplía tablas empresas, vacantes y historial_consentimientos para contexto Colombia."""
    # --- empresas ---
    op.add_column("empresas", sa.Column("tipo_persona", sa.String(length=20), server_default="juridica", nullable=False))
    op.add_column("empresas", sa.Column("razon_social", sa.String(length=180), nullable=True))
    op.add_column("empresas", sa.Column("nombre_comercial", sa.String(length=150), nullable=True))
    op.add_column("empresas", sa.Column("digito_verificacion", sa.String(length=1), nullable=True))
    op.add_column("empresas", sa.Column("rut_numero", sa.String(length=30), nullable=True))
    op.add_column("empresas", sa.Column("codigo_ciiu", sa.String(length=10), nullable=True))
    op.add_column("empresas", sa.Column("tamano_empresa", sa.String(length=20), nullable=True))
    op.add_column("empresas", sa.Column("departamento", sa.String(length=80), nullable=True))
    op.add_column("empresas", sa.Column("ciudad", sa.String(length=100), nullable=True))
    op.add_column("empresas", sa.Column("direccion", sa.String(length=200), nullable=True))
    op.add_column("empresas", sa.Column("linkedin_url", sa.String(length=255), nullable=True))
    op.add_column("empresas", sa.Column("logo_path", sa.String(length=255), nullable=True))
    op.add_column("empresas", sa.Column("descripcion", sa.Text(), nullable=True))
    op.add_column("empresas", sa.Column("contacto_nombre", sa.String(length=120), nullable=True))
    op.add_column("empresas", sa.Column("contacto_cargo", sa.String(length=100), nullable=True))
    op.add_column("empresas", sa.Column("contacto_telefono", sa.String(length=30), nullable=True))
    op.add_column("empresas", sa.Column("contacto_email", sa.String(length=150), nullable=True))
    op.add_column("empresas", sa.Column("acepta_ley_1581", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("empresas", sa.Column("fecha_ley_1581", sa.DateTime(), nullable=True))

    # --- vacantes ---
    op.add_column("vacantes", sa.Column("categoria_area", sa.String(length=100), nullable=True))
    op.add_column("vacantes", sa.Column("cantidad_vacantes", sa.Integer(), server_default="1", nullable=False))
    op.add_column("vacantes", sa.Column("funciones", sa.Text(), nullable=True))
    op.add_column("vacantes", sa.Column("requisitos_indispensables", sa.Text(), nullable=True))
    op.add_column("vacantes", sa.Column("requisitos_deseables", sa.Text(), nullable=True))
    op.add_column("vacantes", sa.Column("habilidades_clave", sa.Text(), nullable=True))
    op.add_column("vacantes", sa.Column("idiomas", sa.Text(), nullable=True))
    op.add_column("vacantes", sa.Column("departamento", sa.String(length=80), nullable=True))
    op.add_column("vacantes", sa.Column("esquema_salarial", sa.String(length=30), nullable=True))
    op.add_column("vacantes", sa.Column("salario_min_cop", sa.Numeric(precision=14, scale=0), nullable=True))
    op.add_column("vacantes", sa.Column("salario_max_cop", sa.Numeric(precision=14, scale=0), nullable=True))
    op.add_column("vacantes", sa.Column("salario_visible", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("vacantes", sa.Column("beneficios", sa.Text(), nullable=True))
    op.add_column("vacantes", sa.Column("nivel_educativo", sa.String(length=40), nullable=True))
    op.alter_column("vacantes", "salario", type_=sa.String(length=120), existing_type=sa.String(length=80))

    # --- historial_consentimientos: permitir tipo 'ley_1581_empresa' ---
    op.execute("ALTER TABLE historial_consentimientos DROP CONSTRAINT IF EXISTS ck_historial_consentimientos_tipo")
    op.create_check_constraint(
        "ck_historial_consentimientos_tipo",
        "historial_consentimientos",
        "tipo IN ('marketing','analiticas','terceros','grabacion','compartir_empresa','ley_1581_empresa')",
    )


def downgrade() -> None:
    """Revierte ampliaciones de empresas, vacantes y historial_consentimientos."""
    op.execute("ALTER TABLE historial_consentimientos DROP CONSTRAINT IF EXISTS ck_historial_consentimientos_tipo")
    op.create_check_constraint(
        "ck_historial_consentimientos_tipo",
        "historial_consentimientos",
        "tipo IN ('marketing','analiticas','terceros','grabacion','compartir_empresa')",
    )

    op.alter_column("vacantes", "salario", type_=sa.String(length=80), existing_type=sa.String(length=120))
    for col in (
        "nivel_educativo", "beneficios", "salario_visible", "salario_max_cop",
        "salario_min_cop", "esquema_salarial", "departamento", "idiomas",
        "habilidades_clave", "requisitos_deseables", "requisitos_indispensables",
        "funciones", "cantidad_vacantes", "categoria_area",
    ):
        op.drop_column("vacantes", col)

    for col in (
        "fecha_ley_1581", "acepta_ley_1581", "contacto_email", "contacto_telefono",
        "contacto_cargo", "contacto_nombre", "descripcion", "logo_path", "linkedin_url",
        "direccion", "ciudad", "departamento", "tamano_empresa", "codigo_ciiu",
        "rut_numero", "digito_verificacion", "nombre_comercial", "razon_social", "tipo_persona",
    ):
        op.drop_column("empresas", col)
