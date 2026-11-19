"""esquema v4: plataforma de seleccion de candidatos

Revision ID: a4c91e7b2f10
Revises: 3d615b93b82d
Create Date: 2026-11-17 20:30:00.000000

Convierte PrepIA en una plataforma de seleccion de candidatos:
- tablas nuevas: empresas, perfiles_profesionales, opciones_pregunta, hojas_de_vida,
  vacantes, vacante_ejercicios, postulaciones, analisis_cv, decisiones_postulacion
- cambios: usuarios (rol reclutador + empresa_id), ejercicios (tipo + perfil_id),
  sesiones_prueba (modo + postulacion_id, nivel_id opcional), respuestas_sesion
  (respuesta_texto, opcion_id, puntaje) e historial_consentimientos (2 tipos nuevos)
- datos base: 5 perfiles profesionales de ejemplo
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4c91e7b2f10'
down_revision: Union[str, None] = '3d615b93b82d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ tablas base
    op.create_table(
        'empresas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('nit', sa.String(length=20), nullable=True),
        sa.Column('sector', sa.String(length=100), nullable=True),
        sa.Column('sitio_web', sa.String(length=255), nullable=True),
        sa.Column('activa', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nit'),
    )
    op.create_table(
        'perfiles_profesionales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=80), nullable=False),
        sa.Column('descripcion', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre'),
    )

    # ------------------------------------------------------------------ usuarios
    op.add_column('usuarios', sa.Column('empresa_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_usuarios_empresa_id_empresas', 'usuarios', 'empresas', ['empresa_id'], ['id'])
    op.create_index('idx_usuarios_empresa', 'usuarios', ['empresa_id'])
    op.execute("ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS ck_usuarios_rol")
    op.create_check_constraint(
        'ck_usuarios_rol', 'usuarios',
        "rol IN ('usuario','reclutador','agente_soporte','admin')")
    op.create_check_constraint(
        'ck_usuarios_reclutador_empresa', 'usuarios',
        "rol <> 'reclutador' OR empresa_id IS NOT NULL")

    # ------------------------------------------------------------------ ejercicios
    op.add_column('ejercicios', sa.Column('tipo', sa.String(length=20), server_default='codigo', nullable=False))
    op.add_column('ejercicios', sa.Column('perfil_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_ejercicios_perfil_id_perfiles', 'ejercicios', 'perfiles_profesionales', ['perfil_id'], ['id'])
    op.create_index('idx_ejercicios_perfil', 'ejercicios', ['perfil_id'])
    op.create_check_constraint('ck_ejercicios_tipo', 'ejercicios', "tipo IN ('codigo','opcion_multiple','abierta')")

    op.create_table(
        'opciones_pregunta',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ejercicio_id', sa.Integer(), nullable=False),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('es_correcta', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('orden', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['ejercicio_id'], ['ejercicios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_opciones_pregunta_ejercicio', 'opciones_pregunta', ['ejercicio_id'])

    # ------------------------------------------------------------------ modulo de seleccion
    op.create_table(
        'hojas_de_vida',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('nombre_archivo', sa.String(length=255), nullable=False),
        sa.Column('url_archivo', sa.String(length=255), nullable=False),
        sa.Column('texto_extraido', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_hojas_de_vida_usuario', 'hojas_de_vida', ['usuario_id'])

    op.create_table(
        'vacantes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('empresa_id', sa.Integer(), nullable=False),
        sa.Column('reclutador_id', sa.Integer(), nullable=False),
        sa.Column('perfil_id', sa.Integer(), nullable=True),
        sa.Column('titulo', sa.String(length=150), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('requisitos', sa.Text(), nullable=True),
        sa.Column('modalidad', sa.String(length=15), nullable=True),
        sa.Column('estado', sa.String(length=15), server_default='borrador', nullable=False),
        sa.Column('duracion_prueba_minutos', sa.Integer(), nullable=True),
        sa.Column('puntaje_minimo', sa.Numeric(precision=5, scale=2), server_default='60', nullable=False),
        sa.Column('peso_cv', sa.Numeric(precision=5, scale=2), server_default='30', nullable=False),
        sa.Column('peso_prueba', sa.Numeric(precision=5, scale=2), server_default='70', nullable=False),
        sa.Column('fecha_cierre', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("modalidad IN ('presencial','remoto','hibrido')", name='ck_vacantes_modalidad'),
        sa.CheckConstraint("estado IN ('borrador','abierta','cerrada')", name='ck_vacantes_estado'),
        sa.CheckConstraint("puntaje_minimo BETWEEN 0 AND 100", name='ck_vacantes_puntaje_minimo'),
        sa.CheckConstraint("peso_cv >= 0 AND peso_prueba >= 0 AND peso_cv + peso_prueba = 100", name='ck_vacantes_pesos'),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.ForeignKeyConstraint(['reclutador_id'], ['usuarios.id']),
        sa.ForeignKeyConstraint(['perfil_id'], ['perfiles_profesionales.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_vacantes_empresa', 'vacantes', ['empresa_id'])
    op.create_index('idx_vacantes_estado', 'vacantes', ['estado'])

    op.create_table(
        'vacante_ejercicios',
        sa.Column('vacante_id', sa.Integer(), nullable=False),
        sa.Column('ejercicio_id', sa.Integer(), nullable=False),
        sa.Column('orden', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['vacante_id'], ['vacantes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ejercicio_id'], ['ejercicios.id']),
        sa.PrimaryKeyConstraint('vacante_id', 'ejercicio_id'),
    )

    op.create_table(
        'postulaciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vacante_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('hoja_vida_id', sa.Integer(), nullable=True),
        sa.Column('estado', sa.String(length=20), server_default='postulado', nullable=False),
        sa.Column('puntaje_cv', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('puntaje_prueba', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('puntaje_final', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            "estado IN ('postulado','cv_analizado','prueba_pendiente','prueba_completada',"
            "'en_revision','aprobado','rechazado','retirado')",
            name='ck_postulaciones_estado'),
        sa.CheckConstraint("puntaje_cv BETWEEN 0 AND 100", name='ck_postulaciones_puntaje_cv'),
        sa.CheckConstraint("puntaje_prueba BETWEEN 0 AND 100", name='ck_postulaciones_puntaje_prueba'),
        sa.CheckConstraint("puntaje_final BETWEEN 0 AND 100", name='ck_postulaciones_puntaje_final'),
        sa.ForeignKeyConstraint(['vacante_id'], ['vacantes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['hoja_vida_id'], ['hojas_de_vida.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('vacante_id', 'usuario_id', name='uq_postulaciones_vacante_usuario'),
    )
    op.create_index('idx_postulaciones_vacante', 'postulaciones', ['vacante_id'])
    op.create_index('idx_postulaciones_usuario', 'postulaciones', ['usuario_id'])

    op.create_table(
        'analisis_cv',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('postulacion_id', sa.Integer(), nullable=False),
        sa.Column('puntaje_afinidad', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('experiencia_anios', sa.Numeric(precision=4, scale=1), nullable=True),
        sa.Column('habilidades_detectadas', sa.Text(), nullable=True),
        sa.Column('resumen', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("puntaje_afinidad BETWEEN 0 AND 100", name='ck_analisis_cv_puntaje_afinidad'),
        sa.ForeignKeyConstraint(['postulacion_id'], ['postulaciones.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('postulacion_id'),
    )

    op.create_table(
        'decisiones_postulacion',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('postulacion_id', sa.Integer(), nullable=False),
        sa.Column('reclutador_id', sa.Integer(), nullable=False),
        sa.Column('resultado', sa.String(length=15), nullable=False),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("resultado IN ('aprobado','rechazado','en_revision')", name='ck_decisiones_postulacion_resultado'),
        sa.ForeignKeyConstraint(['postulacion_id'], ['postulaciones.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reclutador_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_decisiones_postulacion', 'decisiones_postulacion', ['postulacion_id'])

    # ------------------------------------------------------------------ sesiones_prueba
    op.alter_column('sesiones_prueba', 'nivel_id', existing_type=sa.Integer(), nullable=True)
    op.add_column('sesiones_prueba', sa.Column('modo', sa.String(length=15), server_default='practica', nullable=False))
    op.add_column('sesiones_prueba', sa.Column('postulacion_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_sesiones_prueba_postulacion_id_postulaciones', 'sesiones_prueba', 'postulaciones', ['postulacion_id'], ['id'])
    op.create_index('idx_sesiones_prueba_postulacion', 'sesiones_prueba', ['postulacion_id'])
    op.create_check_constraint('ck_sesiones_prueba_modo', 'sesiones_prueba', "modo IN ('practica','evaluacion')")
    op.create_check_constraint(
        'ck_sesiones_modo_postulacion', 'sesiones_prueba',
        "(modo = 'practica' AND postulacion_id IS NULL) OR (modo = 'evaluacion' AND postulacion_id IS NOT NULL)")
    op.create_check_constraint('ck_sesiones_practica_nivel', 'sesiones_prueba', "modo = 'evaluacion' OR nivel_id IS NOT NULL")

    # ------------------------------------------------------------------ respuestas_sesion
    op.add_column('respuestas_sesion', sa.Column('respuesta_texto', sa.Text(), nullable=True))
    op.add_column('respuestas_sesion', sa.Column('opcion_id', sa.Integer(), nullable=True))
    op.add_column('respuestas_sesion', sa.Column('puntaje', sa.Numeric(precision=5, scale=2), nullable=True))
    op.create_foreign_key('fk_respuestas_sesion_opcion_id_opciones', 'respuestas_sesion', 'opciones_pregunta', ['opcion_id'], ['id'])
    op.create_check_constraint('ck_respuestas_sesion_puntaje', 'respuestas_sesion', "puntaje BETWEEN 0 AND 100")

    # ------------------------------------------------------------------ historial_consentimientos
    op.execute("ALTER TABLE historial_consentimientos DROP CONSTRAINT IF EXISTS ck_historial_consentimientos_tipo")
    op.create_check_constraint(
        'ck_historial_consentimientos_tipo', 'historial_consentimientos',
        "tipo IN ('marketing','analiticas','terceros','grabacion','compartir_empresa')")

    # ------------------------------------------------------------------ datos base
    op.execute("""
        INSERT INTO perfiles_profesionales (nombre, descripcion) VALUES
            ('Desarrollo de software', 'Programadores y roles afines'),
            ('Datos y analítica', 'Análisis de datos, BI y ciencia de datos'),
            ('Diseño UX/UI', 'Diseño de producto e interfaces'),
            ('Soporte técnico TI', 'Mesa de ayuda e infraestructura'),
            ('Administrativo y contable', 'Gestión administrativa, contable y financiera')
        ON CONFLICT (nombre) DO NOTHING
    """)


def downgrade() -> None:
    # ATENCION: volver a v3 elimina los datos propios de v4 (empresas, vacantes,
    # postulaciones, sesiones en modo evaluacion, etc.).

    # historial_consentimientos
    op.execute("DELETE FROM historial_consentimientos WHERE tipo IN ('grabacion','compartir_empresa')")
    op.execute("ALTER TABLE historial_consentimientos DROP CONSTRAINT IF EXISTS ck_historial_consentimientos_tipo")
    op.create_check_constraint(
        'ck_historial_consentimientos_tipo', 'historial_consentimientos',
        "tipo IN ('marketing','analiticas','terceros')")

    # respuestas_sesion (las respuestas de sesiones de evaluacion se borran en cascada mas abajo)
    op.drop_constraint('ck_respuestas_sesion_puntaje', 'respuestas_sesion', type_='check')
    op.drop_constraint('fk_respuestas_sesion_opcion_id_opciones', 'respuestas_sesion', type_='foreignkey')
    op.drop_column('respuestas_sesion', 'puntaje')
    op.drop_column('respuestas_sesion', 'opcion_id')
    op.drop_column('respuestas_sesion', 'respuesta_texto')

    # sesiones_prueba
    op.execute("DELETE FROM sesiones_prueba WHERE modo = 'evaluacion'")
    op.drop_constraint('ck_sesiones_practica_nivel', 'sesiones_prueba', type_='check')
    op.drop_constraint('ck_sesiones_modo_postulacion', 'sesiones_prueba', type_='check')
    op.drop_constraint('ck_sesiones_prueba_modo', 'sesiones_prueba', type_='check')
    op.drop_index('idx_sesiones_prueba_postulacion', table_name='sesiones_prueba')
    op.drop_constraint('fk_sesiones_prueba_postulacion_id_postulaciones', 'sesiones_prueba', type_='foreignkey')
    op.drop_column('sesiones_prueba', 'postulacion_id')
    op.drop_column('sesiones_prueba', 'modo')
    op.alter_column('sesiones_prueba', 'nivel_id', existing_type=sa.Integer(), nullable=False)

    # modulo de seleccion
    op.drop_index('idx_decisiones_postulacion', table_name='decisiones_postulacion')
    op.drop_table('decisiones_postulacion')
    op.drop_table('analisis_cv')
    op.drop_index('idx_postulaciones_usuario', table_name='postulaciones')
    op.drop_index('idx_postulaciones_vacante', table_name='postulaciones')
    op.drop_table('postulaciones')
    op.drop_table('vacante_ejercicios')
    op.drop_index('idx_vacantes_estado', table_name='vacantes')
    op.drop_index('idx_vacantes_empresa', table_name='vacantes')
    op.drop_table('vacantes')
    op.drop_index('idx_hojas_de_vida_usuario', table_name='hojas_de_vida')
    op.drop_table('hojas_de_vida')

    # ejercicios (las preguntas que no son de codigo no existian en v3)
    op.drop_index('idx_opciones_pregunta_ejercicio', table_name='opciones_pregunta')
    op.drop_table('opciones_pregunta')
    op.execute("DELETE FROM respuestas_sesion WHERE ejercicio_id IN (SELECT id FROM ejercicios WHERE tipo <> 'codigo')")
    op.execute("DELETE FROM ejercicios WHERE tipo <> 'codigo'")
    op.drop_constraint('ck_ejercicios_tipo', 'ejercicios', type_='check')
    op.drop_index('idx_ejercicios_perfil', table_name='ejercicios')
    op.drop_constraint('fk_ejercicios_perfil_id_perfiles', 'ejercicios', type_='foreignkey')
    op.drop_column('ejercicios', 'perfil_id')
    op.drop_column('ejercicios', 'tipo')

    # usuarios (los reclutadores vuelven a ser usuarios normales)
    op.execute("UPDATE usuarios SET rol = 'usuario', empresa_id = NULL WHERE rol = 'reclutador'")
    op.drop_constraint('ck_usuarios_reclutador_empresa', 'usuarios', type_='check')
    op.drop_constraint('ck_usuarios_rol', 'usuarios', type_='check')
    op.create_check_constraint('ck_usuarios_rol', 'usuarios', "rol IN ('usuario','agente_soporte','admin')")
    op.drop_index('idx_usuarios_empresa', table_name='usuarios')
    op.drop_constraint('fk_usuarios_empresa_id_empresas', 'usuarios', type_='foreignkey')
    op.drop_column('usuarios', 'empresa_id')

    op.drop_table('perfiles_profesionales')
    op.drop_table('empresas')
