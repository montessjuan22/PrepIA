"""Agrega preguntas_entrevista y updated_at en analisis_cv para persistencia IA en Empresas.

Revision ID: f9d2b4e6a103
Revises: e8c1a3d4f902
Create Date: 2026-11-26 03:25:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f9d2b4e6a103"
down_revision: Union[str, Sequence[str], None] = "e8c1a3d4f902"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega preguntas_entrevista y updated_at a la tabla analisis_cv."""
    op.add_column("analisis_cv", sa.Column("preguntas_entrevista", sa.Text(), nullable=True))
    op.add_column(
        "analisis_cv",
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    """Revierte columnas agregadas en analisis_cv."""
    op.drop_column("analisis_cv", "updated_at")
    op.drop_column("analisis_cv", "preguntas_entrevista")
