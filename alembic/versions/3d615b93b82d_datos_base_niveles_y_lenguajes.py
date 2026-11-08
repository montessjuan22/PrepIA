"""datos base niveles y lenguajes

Revision ID: 3d615b93b82d
Revises: 33e43b79d2aa
Create Date: 2026-11-08 17:25:44.263884

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3d615b93b82d'
down_revision: Union[str, Sequence[str], None] = '33e43b79d2aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO niveles_dificultad (nombre, descripcion) VALUES
            ('Fácil', 'Ejercicios introductorios'),
            ('Medio', 'Ejercicios de dificultad intermedia'),
            ('Difícil', 'Ejercicios avanzados')
        ON CONFLICT (nombre) DO NOTHING
    """)
    op.execute("""
        INSERT INTO lenguajes_programacion (nombre) VALUES
            ('javascript'), ('python'), ('java'), ('c++'), ('typescript')
        ON CONFLICT (nombre) DO NOTHING
    """)


def downgrade() -> None:
    op.execute("DELETE FROM lenguajes_programacion WHERE nombre IN ('javascript','python','java','c++','typescript')")
    op.execute("DELETE FROM niveles_dificultad WHERE nombre IN ('Fácil','Medio','Difícil')")
