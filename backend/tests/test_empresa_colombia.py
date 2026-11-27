"""Pruebas unitarias para perfil de empresa colombiano (NIT/DV/RUT/Ley 1581) y vacantes flexibles."""
import pytest
from pydantic import ValidationError

from app.models.seleccion import Empresa
from app.schemas.empresa import (
    EmpresaProfileUpdateRequest,
    VacanteUpsertRequest,
    build_salary_display,
    calcular_dv_nit,
    compute_company_completeness,
)
from app.services import cv_ai_analyzer


def test_calcular_dv_nit_oficial_dian():
    assert calcular_dv_nit("899999068") == "1"
    assert calcular_dv_nit("890.903.938") == "8"
    assert calcular_dv_nit("800197268") == "4"


def test_empresa_profile_valida_dv_y_ley_1581():
    # Rechaza si no acepta Ley 1581
    with pytest.raises(ValidationError):
        EmpresaProfileUpdateRequest(
            tipo_persona="juridica",
            razon_social="Tech Caribe S.A.S.",
            nit="890903938",
            digito_verificacion="8",
            sector="Tecnología de la Información",
            tamano_empresa="Pequeña",
            departamento="Atlántico",
            ciudad="Barranquilla",
            contacto_nombre="Ana Gómez",
            contacto_telefono="3150001122",
            contacto_email="talento@techcaribe.co",
            acepta_ley_1581=False,
        )

    # Rechaza DV incorrecto
    with pytest.raises(ValidationError):
        EmpresaProfileUpdateRequest(
            tipo_persona="juridica",
            razon_social="Tech Caribe S.A.S.",
            nit="890903938",
            digito_verificacion="3",
            sector="Tecnología de la Información",
            tamano_empresa="Pequeña",
            departamento="Atlántico",
            ciudad="Barranquilla",
            contacto_nombre="Ana Gómez",
            contacto_telefono="3150001122",
            contacto_email="talento@techcaribe.co",
            acepta_ley_1581=True,
        )

    # Autocalcula DV si no se envía y permite Persona Natural con RUT
    juridica = EmpresaProfileUpdateRequest(
        tipo_persona="juridica",
        razon_social="Tech Caribe S.A.S.",
        nit="890.903.938",
        sector="Tecnología de la Información",
        tamano_empresa="Pequeña",
        departamento="Atlántico",
        ciudad="Barranquilla",
        contacto_nombre="Ana Gómez",
        contacto_telefono="3150001122",
        contacto_email="talento@techcaribe.co",
        acepta_ley_1581=True,
    )
    assert juridica.nit == "890903938"
    assert juridica.digito_verificacion == "8"

    natural = EmpresaProfileUpdateRequest(
        tipo_persona="natural_rut",
        razon_social="Juan Pérez Consultorías",
        rut_numero="1140889101-2",
        sector="Consultoría Empresarial",
        tamano_empresa="Micro",
        departamento="Antioquia",
        ciudad="Medellín",
        contacto_nombre="Juan Pérez",
        contacto_telefono="3001112233",
        contacto_email="juan@consultorias.co",
        acepta_ley_1581=True,
    )
    assert natural.rut_numero == "1140889101-2"


def test_completitud_empresa():
    emp = Empresa(nombre="Vacía SAS")
    pct_inicial, _, faltantes_inicial = compute_company_completeness(emp)
    assert pct_inicial == 0
    assert len(faltantes_inicial) == 6

    emp_full = Empresa(
        nombre="Comercializadora Andina",
        tipo_persona="juridica",
        razon_social="Comercializadora Andina S.A.S.",
        nit="899999068",
        digito_verificacion="1",
        sector="Comercio al por mayor",
        tamano_empresa="Mediana",
        departamento="Cundinamarca / Bogotá D.C.",
        ciudad="Bogotá",
        descripcion="Empresa líder en distribución nacional.",
        contacto_nombre="Laura Ruiz",
        contacto_telefono="3105556677",
        contacto_email="rrhh@andina.co",
        acepta_ley_1581=True,
    )
    pct_full, _, faltantes_full = compute_company_completeness(emp_full)
    assert pct_full == 100
    assert faltantes_full == []


def test_vacante_flexible_multi_industria_y_salario_cop():
    vac = VacanteUpsertRequest(
        titulo="Auxiliar Contable y Nómina",
        categoria_area="Administración, Contabilidad y Finanzas",
        cantidad_vacantes=2,
        descripcion="Apoyo en causación contable, conciliaciones bancarias y liquidación de nómina en Colombia.",
        funciones="Causación de facturas electrónicas\nLiquidación de seguridad social PILA",
        modalidad="presencial",
        departamento="Antioquia",
        ciudad="Medellín",
        tipo_contrato="Término Indefinido",
        jornada="Tiempo Completo",
        esquema_salarial="rango_salarial",
        salario_min_cop=2200000,
        salario_max_cop=2800000,
        salario_visible=True,
        beneficios="Auxilio de transporte legal y prima extralegal",
        experiencia="1 - 3 años",
        nivel_educativo="Tecnólogo",
        requisitos_indispensables="Manejo de Siigo o Helisa\nConocimiento en retención en la fuente y PILA",
        requisitos_deseables="Excel avanzado",
        habilidades_clave=["Siigo", "Nómina", "Excel", "PILA"],
        idiomas=[{"idioma": "Español", "nivel": "Nativo"}],
    )
    assert vac.cantidad_vacantes == 2
    assert build_salary_display("rango_salarial", 2200000, 2800000, True) == "$2.200.000 - $2.800.000 COP"
    assert build_salary_display("rango_salarial", 2200000, 2800000, False, for_public=True).startswith(
        "Salario confidencial"
    )

    # Rango invertido falla
    with pytest.raises(ValidationError):
        VacanteUpsertRequest(
            titulo="Conductor C2",
            categoria_area="Logística, Bodega y Transporte",
            descripcion="Transporte de mercancía urbana con licencia C2 vigente.",
            modalidad="presencial",
            ciudad="Cali",
            esquema_salarial="rango_salarial",
            salario_min_cop=3000000,
            salario_max_cop=1800000,
            requisitos_indispensables="Licencia C2 vigente sin comparendos",
        )


def test_prompt_ia_incluye_contexto_multi_industria():
    prompt = cv_ai_analyzer.build_user_prompt(
        titulo_vacante="Enfermera Jefe UCI",
        requisitos_vacante="Tarjeta profesional vigente",
        cv_anonimizado="Enfermera con 4 años en UCI adultos",
        truncado=False,
        vacante_detalle={
            "categoria_area": "Salud y Medicina",
            "nivel_educativo": "Profesional",
            "experiencia": "3 - 5 años",
            "habilidades_clave": ["UCI", "ACLS", "Rethus"],
            "idiomas": [{"idioma": "Inglés", "nivel": "B1"}],
        },
    )
    assert "Salud y Medicina" in prompt
    assert "Educación mínima: Profesional" in prompt
    assert "ACLS" in prompt
    assert "Inglés (B1)" in prompt
