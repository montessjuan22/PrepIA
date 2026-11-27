"""Schemas Pydantic y utilidades legales/tributarias de Colombia para Empresas y Vacantes."""
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel, Field, field_validator, model_validator

# Pesos oficiales DIAN para cálculo del Dígito de Verificación (DV) del NIT en Colombia
DIAN_NIT_WEIGHTS = (3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71)

VALID_TAMANOS_EMPRESA = ("Micro", "Pequeña", "Mediana", "Grande")
VALID_ESQUEMAS_SALARIALES = (
    "salario_fijo",
    "rango_salarial",
    "salario_comisiones",
    "salario_integral",
    "a_convenir",
)
VALID_CONTRATOS_CO = (
    "Término Indefinido",
    "Término Fijo",
    "Obra o Labor",
    "Prestación de Servicios",
    "Contrato de Aprendizaje (SENA)",
    "Pasantía",
)
VALID_JORNADAS_CO = (
    "Tiempo Completo",
    "Medio Tiempo",
    "Por Horas",
    "Turnos Rotativos",
    "Fines de Semana",
)
VALID_EXPERIENCIA_CO = (
    "Sin experiencia / Primer empleo",
    "6 meses - 1 año",
    "1 - 3 años",
    "3 - 5 años",
    "+5 años",
)
VALID_EDUCACION_CO = (
    "No requerido",
    "Bachiller",
    "Técnico",
    "Tecnólogo",
    "Profesional",
    "Posgrado",
)

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def limpiar_digitos(value: Optional[str]) -> str:
    """Extrae únicamente dígitos numéricos de una cadena."""
    return "".join(ch for ch in (value or "") if ch.isdigit())


def calcular_dv_nit(nit_sin_dv: str) -> str:
    """Calcula el Dígito de Verificación (DV) oficial de la DIAN (Colombia) para un NIT numérico."""
    clean = limpiar_digitos(nit_sin_dv)
    if not clean or len(clean) > 15:
        raise ValueError("El NIT debe tener entre 1 y 15 dígitos numéricos.")
    total = sum(int(digit) * weight for digit, weight in zip(reversed(clean), DIAN_NIT_WEIGHTS))
    remainder = total % 11
    return str(remainder if remainder in (0, 1) else 11 - remainder)


def format_cop(amount: Optional[float | int], include_suffix: bool = True) -> str:
    """Formatea un valor entero en pesos colombianos ($2.500.000 COP)."""
    if amount is None:
        return ""
    value = int(round(float(amount)))
    formatted = f"{value:,}".replace(",", ".")
    return f"${formatted} COP" if include_suffix else f"${formatted}"


def build_salary_display(
    esquema_salarial: Optional[str],
    salario_min_cop: Optional[float | int],
    salario_max_cop: Optional[float | int],
    salario_visible: bool,
    fallback_text: Optional[str] = None,
    for_public: bool = False,
) -> str:
    """Construye la etiqueta legible del esquema salarial en COP."""
    if for_public and not salario_visible:
        return "Salario confidencial (a informar en proceso)"

    esquema = (esquema_salarial or "a_convenir").strip().lower()
    if esquema == "a_convenir":
        return "A convenir"
    if esquema == "salario_integral":
        if salario_min_cop:
            return f"Salario Integral ({format_cop(salario_min_cop)})"
        return "Salario Integral"
    if esquema == "salario_fijo":
        if salario_min_cop:
            return format_cop(salario_min_cop)
        return fallback_text or "Salario fijo (por definir)"
    if esquema == "salario_comisiones":
        if salario_min_cop and salario_max_cop and salario_max_cop > salario_min_cop:
            return f"{format_cop(salario_min_cop, include_suffix=False)} - {format_cop(salario_max_cop)} + Comisiones/Bonos"
        if salario_min_cop:
            return f"{format_cop(salario_min_cop)} + Comisiones/Bonos"
        return "Salario + Comisiones / Bonificaciones"
    if esquema == "rango_salarial":
        if salario_min_cop and salario_max_cop:
            return f"{format_cop(salario_min_cop, include_suffix=False)} - {format_cop(salario_max_cop)}"
        if salario_min_cop:
            return f"Desde {format_cop(salario_min_cop)}"
        if salario_max_cop:
            return f"Hasta {format_cop(salario_max_cop)}"
    return fallback_text or "A convenir"


def build_combined_requirements_text(
    indispensables: Optional[str],
    deseables: Optional[str],
    habilidades: List[str],
    idiomas: List[Dict[str, str]],
    nivel_educativo: Optional[str],
    fallback_requisitos: Optional[str] = None,
) -> str:
    """Genera el texto unificado de requisitos para compatibilidad con vistas y evaluación IA."""
    lines: List[str] = []
    if indispensables and indispensables.strip():
        for raw in indispensables.splitlines():
            clean = raw.strip().lstrip("•-*").strip()
            if clean:
                lines.append(clean)
    elif fallback_requisitos and fallback_requisitos.strip():
        for raw in fallback_requisitos.splitlines():
            clean = raw.strip().lstrip("•-*").strip()
            if clean:
                lines.append(clean)

    if nivel_educativo and nivel_educativo.strip() and nivel_educativo.strip().lower() != "no requerido":
        edu_line = f"Nivel educativo mínimo: {nivel_educativo.strip()}"
        if edu_line.lower() not in " ".join(lines).lower():
            lines.append(edu_line)

    if habilidades:
        skills_clean = [s.strip() for s in habilidades if s and s.strip()]
        if skills_clean:
            lines.append("Habilidades clave: " + ", ".join(skills_clean))

    if idiomas:
        langs = [
            f"{item.get('idioma', '').strip()} ({item.get('nivel', '').strip() or 'Requerido'})"
            for item in idiomas
            if item.get("idioma") and item.get("idioma").strip()
        ]
        if langs:
            lines.append("Idiomas: " + ", ".join(langs))

    if deseables and deseables.strip():
        for raw in deseables.splitlines():
            clean = raw.strip().lstrip("•-*").strip()
            if clean:
                lines.append(f"Deseable: {clean}")

    return "\n".join(lines).strip()


def parse_json_list_str(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(x).strip() for x in data if str(x).strip()]
    except Exception:
        pass
    return [line.strip() for line in raw.split(",") if line.strip()]


def parse_json_idiomas(raw: Optional[str]) -> List[Dict[str, str]]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            out: List[Dict[str, str]] = []
            for item in data:
                if isinstance(item, dict) and item.get("idioma"):
                    out.append({
                        "idioma": str(item["idioma"]).strip(),
                        "nivel": str(item.get("nivel") or "Intermedio").strip(),
                    })
                elif isinstance(item, str) and item.strip():
                    out.append({"idioma": item.strip(), "nivel": "Intermedio"})
            return out
    except Exception:
        pass
    return []


def compute_company_completeness(empresa: Any) -> Tuple[int, Dict[str, bool], List[str]]:
    """Calcula el porcentaje de completitud (0-100) y campos faltantes del perfil de empresa."""
    has_razon = bool((getattr(empresa, "razon_social", None) or getattr(empresa, "nombre", None) or "").strip())
    tipo_persona = getattr(empresa, "tipo_persona", "juridica") or "juridica"
    has_nit_or_rut = (
        bool(getattr(empresa, "rut_numero", None) or getattr(empresa, "nit", None))
        if tipo_persona == "natural_rut"
        else bool(getattr(empresa, "nit", None) and getattr(empresa, "digito_verificacion", None) is not None)
    )
    has_sector_ciiu = bool((getattr(empresa, "sector", None) or "").strip() and (getattr(empresa, "tamano_empresa", None) or "").strip())
    has_ubicacion = bool((getattr(empresa, "departamento", None) or "").strip() and (getattr(empresa, "ciudad", None) or "").strip())
    has_identidad_digital = bool((getattr(empresa, "descripcion", None) or "").strip())
    has_contacto = bool(
        (getattr(empresa, "contacto_nombre", None) or "").strip()
        and (getattr(empresa, "contacto_telefono", None) or "").strip()
        and (getattr(empresa, "contacto_email", None) or "").strip()
    )
    has_ley_1581 = bool(getattr(empresa, "acepta_ley_1581", False))

    checks = {
        "identificacion_tributaria": has_razon and has_nit_or_rut,
        "sector_y_tamano": has_sector_ciiu,
        "ubicacion_colombia": has_ubicacion,
        "descripcion_empresa": has_identidad_digital,
        "contacto_reclutador": has_contacto,
        "autorizacion_ley_1581": has_ley_1581,
    }
    weights = {
        "identificacion_tributaria": 25,
        "sector_y_tamano": 15,
        "ubicacion_colombia": 15,
        "descripcion_empresa": 15,
        "contacto_reclutador": 15,
        "autorizacion_ley_1581": 15,
    }
    score = sum(weights[k] for k, ok in checks.items() if ok)

    labels = {
        "identificacion_tributaria": "Razón social y NIT/DV (o RUT)",
        "sector_y_tamano": "Sector / CIIU y tamaño de empresa",
        "ubicacion_colombia": "Departamento y ciudad en Colombia",
        "descripcion_empresa": "Descripción corporativa",
        "contacto_reclutador": "Datos del responsable / WhatsApp / correo corporativo",
        "autorizacion_ley_1581": "Autorización Ley 1581 de 2012",
    }
    missing = [labels[k] for k, ok in checks.items() if not ok]
    return score, checks, missing


def serialize_company_profile(empresa: Any) -> Dict[str, Any]:
    """Serializa el perfil completo de la empresa junto con su indicador de completitud."""
    completitud, checklist, faltantes = compute_company_completeness(empresa)
    has_logo = bool(empresa.logo_path and Path(empresa.logo_path).is_file())
    logo_version = int(empresa.updated_at.timestamp()) if getattr(empresa, "updated_at", None) else 1
    return {
        "id": empresa.id,
        "nombre": empresa.nombre,
        "tipo_persona": empresa.tipo_persona or "juridica",
        "razon_social": empresa.razon_social or empresa.nombre or "",
        "nombre_comercial": empresa.nombre_comercial or empresa.nombre or "",
        "nit": empresa.nit or "",
        "digito_verificacion": empresa.digito_verificacion or "",
        "rut_numero": empresa.rut_numero or "",
        "codigo_ciiu": empresa.codigo_ciiu or "",
        "sector": empresa.sector or "",
        "tamano_empresa": empresa.tamano_empresa or "",
        "departamento": empresa.departamento or "",
        "ciudad": empresa.ciudad or "",
        "direccion": empresa.direccion or "",
        "sitio_web": empresa.sitio_web or "",
        "linkedin_url": empresa.linkedin_url or "",
        "logo_url": f"/api/v1/empresa/perfil/logo/{empresa.id}?v={logo_version}" if has_logo else None,
        "descripcion": empresa.descripcion or "",
        "contacto_nombre": empresa.contacto_nombre or "",
        "contacto_cargo": empresa.contacto_cargo or "",
        "contacto_telefono": empresa.contacto_telefono or "",
        "contacto_email": empresa.contacto_email or "",
        "acepta_ley_1581": bool(empresa.acepta_ley_1581),
        "fecha_ley_1581": empresa.fecha_ley_1581.isoformat() if empresa.fecha_ley_1581 else None,
        "completitud": completitud,
        "checklist": checklist,
        "campos_faltantes": faltantes,
    }


class NitCalcularRequest(BaseModel):
    nit: str = Field(min_length=1, max_length=30)


class EmpresaProfileUpdateRequest(BaseModel):
    tipo_persona: Literal["juridica", "natural_rut"] = "juridica"
    razon_social: str = Field(min_length=2, max_length=180)
    nombre_comercial: Optional[str] = Field(default=None, max_length=150)
    nit: Optional[str] = Field(default=None, max_length=20)
    digito_verificacion: Optional[str] = Field(default=None, max_length=2)
    rut_numero: Optional[str] = Field(default=None, max_length=30)
    codigo_ciiu: Optional[str] = Field(default=None, max_length=10)
    sector: str = Field(min_length=2, max_length=100)
    tamano_empresa: Literal["Micro", "Pequeña", "Mediana", "Grande"] = "Pequeña"
    departamento: str = Field(min_length=2, max_length=80)
    ciudad: str = Field(min_length=2, max_length=100)
    direccion: Optional[str] = Field(default=None, max_length=200)
    sitio_web: Optional[str] = Field(default=None, max_length=255)
    linkedin_url: Optional[str] = Field(default=None, max_length=255)
    descripcion: Optional[str] = Field(default=None, max_length=3000)
    contacto_nombre: str = Field(min_length=2, max_length=120)
    contacto_cargo: Optional[str] = Field(default=None, max_length=100)
    contacto_telefono: str = Field(min_length=7, max_length=30)
    contacto_email: str = Field(min_length=5, max_length=150)
    acepta_ley_1581: bool

    @field_validator("contacto_email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not _EMAIL_RE.match(clean):
            raise ValueError("El correo corporativo de contacto no tiene un formato válido.")
        return clean

    @field_validator("codigo_ciiu")
    @classmethod
    def _validate_ciiu(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        digits = limpiar_digitos(v)
        if digits and (len(digits) < 3 or len(digits) > 6):
            raise ValueError("El código CIIU debe tener entre 3 y 6 dígitos (ej. 6201).")
        return v.strip()[:10]

    @model_validator(mode="after")
    def _validate_colombia_rules(self) -> "EmpresaProfileUpdateRequest":
        if not self.acepta_ley_1581:
            raise ValueError(
                "Debes autorizar el tratamiento de datos personales conforme a la Ley 1581 de 2012 (Colombia)."
            )

        nit_digits = limpiar_digitos(self.nit)
        rut_clean = (self.rut_numero or "").strip()

        if self.tipo_persona == "juridica":
            if not nit_digits or len(nit_digits) < 6 or len(nit_digits) > 15:
                raise ValueError("Para Persona Jurídica debes ingresar un NIT válido (6 a 15 dígitos).")
        else:
            if not rut_clean and not nit_digits:
                raise ValueError("Para Persona Natural con RUT debes ingresar el número de RUT o documento NIT.")

        if nit_digits:
            if len(nit_digits) < 5 or len(nit_digits) > 15:
                raise ValueError("El NIT debe tener entre 5 y 15 dígitos numéricos.")
            dv_esperado = calcular_dv_nit(nit_digits)
            dv_ingresado = limpiar_digitos(self.digito_verificacion)
            if dv_ingresado and dv_ingresado != dv_esperado:
                raise ValueError(
                    f"El Dígito de Verificación ({dv_ingresado}) no coincide con el NIT {nit_digits} (esperado: {dv_esperado})."
                )
            self.nit = nit_digits
            self.digito_verificacion = dv_esperado
        else:
            self.nit = None
            self.digito_verificacion = None

        self.rut_numero = rut_clean or None
        return self


class IdiomaItem(BaseModel):
    idioma: str = Field(min_length=1, max_length=50)
    nivel: str = Field(default="Intermedio", max_length=30)


class PreguntaFiltroItem(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    pregunta: str = Field(min_length=3, max_length=300)
    tipo: Literal["texto", "numero", "si_no"] = "texto"
    obligatoria: bool = True


ATS_STAGE_LABELS: Dict[str, str] = {
    "postulado": "Postulado",
    "preseleccionado": "Preseleccionado",
    "en_entrevista": "En Entrevista",
    "prueba_tecnica": "Prueba Técnica / Práctica",
    "finalista": "Finalista / Oferta",
    "contratado": "Contratado",
    "descartado": "Descartado",
}

ATS_STAGE_TO_ESTADO: Dict[str, str] = {
    "postulado": "cv_analizado",
    "preseleccionado": "en_revision",
    "en_entrevista": "en_revision",
    "prueba_tecnica": "prueba_pendiente",
    "finalista": "en_revision",
    "contratado": "aprobado",
    "descartado": "rechazado",
}


def parse_json_preguntas(raw: Optional[str]) -> List[Dict[str, Any]]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            out: List[Dict[str, Any]] = []
            for idx, item in enumerate(data):
                if isinstance(item, dict) and str(item.get("pregunta", "")).strip():
                    out.append({
                        "id": str(item.get("id") or f"q_{idx + 1}").strip(),
                        "pregunta": str(item["pregunta"]).strip(),
                        "tipo": item.get("tipo") if item.get("tipo") in ("texto", "numero", "si_no") else "texto",
                        "obligatoria": bool(item.get("obligatoria", True)),
                    })
            return out
    except Exception:
        pass
    return []


def parse_json_respuestas(raw: Optional[str]) -> List[Dict[str, str]]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            out: List[Dict[str, str]] = []
            for item in data:
                if isinstance(item, dict) and str(item.get("pregunta", "")).strip():
                    out.append({
                        "pregunta": str(item["pregunta"]).strip(),
                        "respuesta": str(item.get("respuesta") or "").strip(),
                    })
            return out
    except Exception:
        pass
    return []


def parse_analisis_cv(analisis: Any, fallback_cv_score: Optional[float] = None) -> Dict[str, Any]:
    """Extrae diagnóstico estructurado de analisis_cv (Gemini o respaldo local)."""
    if not analisis:
        return {
            "puntaje_afinidad": float(fallback_cv_score) if fallback_cv_score is not None else None,
            "experiencia_anios": None,
            "requisitos_cumplidos": [],
            "requisitos_faltantes": [],
            "alertas": [],
            "resumen_ejecutivo": "",
            "proveedor_ia": None,
        }

    cumplidos = parse_json_list_str(getattr(analisis, "habilidades_detectadas", None))
    faltantes = parse_json_list_str(getattr(analisis, "habilidades_faltantes", None))
    alertas = parse_json_list_str(getattr(analisis, "alertas", None))
    preguntas_entrevista = parse_json_list_str(getattr(analisis, "preguntas_entrevista", None))
    raw_resumen = (getattr(analisis, "resumen", None) or "").strip()

    exec_parts: List[str] = []
    for block in raw_resumen.split("\n\n"):
        clean = block.strip()
        if not clean:
            continue
        if clean.startswith("Habilidades faltantes:"):
            if not faltantes:
                tail = clean.split(":", 1)[1].strip()
                faltantes = [x.strip() for x in tail.split(",") if x.strip()]
        elif clean.startswith("Alertas:"):
            if not alertas:
                tail = clean.split(":", 1)[1].strip()
                alertas = [x.strip() for x in tail.split(";") if x.strip()]
        else:
            exec_parts.append(clean)

    updated_at = getattr(analisis, "updated_at", None) or getattr(analisis, "created_at", None)
    return {
        "puntaje_afinidad": float(analisis.puntaje_afinidad)
        if analisis.puntaje_afinidad is not None
        else (float(fallback_cv_score) if fallback_cv_score is not None else None),
        "experiencia_anios": float(analisis.experiencia_anios) if analisis.experiencia_anios is not None else None,
        "requisitos_cumplidos": cumplidos,
        "requisitos_faltantes": faltantes,
        "alertas": alertas,
        "preguntas_entrevista": preguntas_entrevista,
        "resumen_ejecutivo": "\n\n".join(exec_parts) or raw_resumen,
        "proveedor_ia": getattr(analisis, "proveedor_ia", None),
        "analisis_updated_at": updated_at.isoformat() if updated_at else None,
    }


class PostulacionATSUpdateRequest(BaseModel):
    etapa_seleccion: Optional[
        Literal[
            "postulado",
            "preseleccionado",
            "en_entrevista",
            "prueba_tecnica",
            "finalista",
            "contratado",
            "descartado",
        ]
    ] = None
    notas_reclutador: Optional[str] = Field(default=None, max_length=4000)
    calificacion_reclutador: Optional[int] = Field(default=None, ge=1, le=5)
    revisado: Optional[bool] = None
    notificar_candidato: bool = True
    mensaje_notificacion: Optional[str] = Field(default=None, max_length=1000)


class VacanteEstadoRequest(BaseModel):
    estado: Literal["abierta", "pausada", "cerrada"]


class AnalizarPendientesRequest(BaseModel):
    forzar_reanalisis: bool = False


class EvaluarTalentoMatchRequest(BaseModel):
    usuario_id: int
    vacante_id: int


class CompararCandidatosRequest(BaseModel):
    postulacion_ids: List[int] = Field(min_length=2, max_length=5)


class VacanteUpsertRequest(BaseModel):
    titulo: str = Field(min_length=3, max_length=150)
    categoria_area: str = Field(default="Tecnología y Sistemas", min_length=2, max_length=100)
    cantidad_vacantes: int = Field(default=1, ge=1, le=500)
    descripcion: str = Field(min_length=10, max_length=5000)
    funciones: Optional[str] = Field(default=None, max_length=5000)
    modalidad: Literal["presencial", "remoto", "hibrido"] = "remoto"
    departamento: Optional[str] = Field(default=None, max_length=80)
    ciudad: Optional[str] = Field(default=None, max_length=100)
    tipo_contrato: str = Field(default="Término Indefinido", max_length=60)
    jornada: str = Field(default="Tiempo Completo", max_length=60)
    esquema_salarial: Literal[
        "salario_fijo",
        "rango_salarial",
        "salario_comisiones",
        "salario_integral",
        "a_convenir",
    ] = "a_convenir"
    salario_min_cop: Optional[int] = Field(default=None, ge=0, le=500_000_000)
    salario_max_cop: Optional[int] = Field(default=None, ge=0, le=500_000_000)
    salario_visible: bool = True
    salario: Optional[str] = Field(default=None, max_length=120)
    beneficios: Optional[str] = Field(default=None, max_length=2000)
    experiencia: str = Field(default="Sin experiencia / Primer empleo", max_length=60)
    nivel_educativo: str = Field(default="No requerido", max_length=40)
    requisitos_indispensables: Optional[str] = Field(default=None, max_length=4000)
    requisitos_deseables: Optional[str] = Field(default=None, max_length=4000)
    requisitos: Optional[str] = Field(default=None, max_length=4000)
    habilidades_clave: List[str] = Field(default_factory=list)
    idiomas: List[IdiomaItem] = Field(default_factory=list)
    preguntas_filtro: List[PreguntaFiltroItem] = Field(default_factory=list)
    puntaje_minimo: float = Field(default=60.0, ge=0, le=100)
    perfil_id: Optional[int] = None
    empresa_id: Optional[int] = None

    @model_validator(mode="after")
    def _validate_vacancy_fields(self) -> "VacanteUpsertRequest":
        if self.modalidad in ("presencial", "hibrido") and not (self.ciudad and self.ciudad.strip()):
            raise ValueError("Para modalidad presencial o híbrida debes indicar la ciudad en Colombia.")

        if self.esquema_salarial == "rango_salarial":
            if not self.salario_min_cop or not self.salario_max_cop:
                raise ValueError("En rango salarial debes ingresar salario mínimo y máximo en COP.")
            if self.salario_max_cop < self.salario_min_cop:
                raise ValueError("El salario máximo en COP no puede ser menor al salario mínimo.")
        elif self.esquema_salarial in ("salario_fijo", "salario_integral", "salario_comisiones"):
            if not self.salario_min_cop and not (self.salario and self.salario.strip()):
                raise ValueError("Ingresa el monto salarial base en COP para el esquema seleccionado.")
            if (
                self.salario_min_cop is not None
                and self.salario_max_cop is not None
                and self.salario_max_cop < self.salario_min_cop
            ):
                raise ValueError("El salario máximo no puede ser menor al mínimo.")

        if not (self.requisitos_indispensables and self.requisitos_indispensables.strip()) and not (
            self.requisitos and self.requisitos.strip()
        ):
            raise ValueError("Debes especificar al menos un requisito indispensable para la vacante.")

        self.habilidades_clave = [h.strip() for h in self.habilidades_clave if h and h.strip()]
        return self
