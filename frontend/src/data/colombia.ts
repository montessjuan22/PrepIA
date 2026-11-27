// Catálogos y utilidades legales/laborales de Colombia para Empresas y Vacantes

export interface DepartamentoCO {
  nombre: string;
  ciudades: string[];
}

export const DEPARTAMENTOS_COLOMBIA: DepartamentoCO[] = [
  { nombre: "Bogotá D.C.", ciudades: ["Bogotá"] },
  { nombre: "Antioquia", ciudades: ["Medellín", "Envigado", "Itagüí", "Bello", "Rionegro", "Apartadó"] },
  { nombre: "Atlántico", ciudades: ["Barranquilla", "Soledad", "Malambo", "Puerto Colombia", "Sabanalarga"] },
  { nombre: "Valle del Cauca", ciudades: ["Cali", "Palmira", "Yumbo", "Jamundí", "Buenaventura", "Tuluá", "Cartago"] },
  { nombre: "Santander", ciudades: ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja"] },
  { nombre: "Cundinamarca", ciudades: ["Chía", "Soacha", "Cajicá", "Zipaquirá", "Facatativá", "Mosquera", "Funza", "Fusagasugá", "Girardot"] },
  { nombre: "Bolívar", ciudades: ["Cartagena", "Turbaco", "Magangué"] },
  { nombre: "Norte de Santander", ciudades: ["Cúcuta", "Villa del Rosario", "Los Patios", "Ocaña"] },
  { nombre: "Risaralda", ciudades: ["Pereira", "Dosquebradas", "Santa Rosa de Cabal"] },
  { nombre: "Caldas", ciudades: ["Manizales", "Villamaría", "La Dorada"] },
  { nombre: "Quindío", ciudades: ["Armenia", "Calarcá", "Montenegro"] },
  { nombre: "Tolima", ciudades: ["Ibagué", "Espinal", "Melgar"] },
  { nombre: "Huila", ciudades: ["Neiva", "Pitalito", "Garzón"] },
  { nombre: "Meta", ciudades: ["Villavicencio", "Acacías", "Granada"] },
  { nombre: "Boyacá", ciudades: ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá"] },
  { nombre: "Magdalena", ciudades: ["Santa Marta", "Ciénaga", "Fundación"] },
  { nombre: "Cesar", ciudades: ["Valledupar", "Aguachica"] },
  { nombre: "Córdoba", ciudades: ["Montería", "Cereté", "Lorica", "Sahagún"] },
  { nombre: "Sucre", ciudades: ["Sincelejo", "Corozal"] },
  { nombre: "Nariño", ciudades: ["Pasto", "Ipiales", "Tumaco"] },
  { nombre: "Cauca", ciudades: ["Popayán", "Santander de Quilichao"] },
  { nombre: "La Guajira", ciudades: ["Riohacha", "Maicao"] },
  { nombre: "Casanare", ciudades: ["Yopal", "Aguazul"] },
  { nombre: "Caquetá", ciudades: ["Florencia"] },
  { nombre: "Putumayo", ciudades: ["Mocoa", "Puerto Asís"] },
  { nombre: "Chocó", ciudades: ["Quibdó"] },
  { nombre: "Arauca", ciudades: ["Arauca"] },
  { nombre: "San Andrés y Providencia", ciudades: ["San Andrés"] },
  { nombre: "Amazonas", ciudades: ["Leticia"] },
  { nombre: "Guainía", ciudades: ["Inírida"] },
  { nombre: "Guaviare", ciudades: ["San José del Guaviare"] },
  { nombre: "Vaupés", ciudades: ["Mitú"] },
  { nombre: "Vichada", ciudades: ["Puerto Carreño"] },
];

export interface SectorCiiuItem {
  ciiu: string;
  sector: string;
}

export const SECTORES_CIIU_COLOMBIA: SectorCiiuItem[] = [
  { ciiu: "6201", sector: "Tecnología, Software e Informática" },
  { ciiu: "6202", sector: "Consultoría Informática y Datos" },
  { ciiu: "4711", sector: "Comercio al por Menor y Retail" },
  { ciiu: "4690", sector: "Comercio al por Mayor y Distribución" },
  { ciiu: "6920", sector: "Contabilidad, Auditoría y Finanzas" },
  { ciiu: "7020", sector: "Consultoría Administrativa y Empresarial" },
  { ciiu: "4111", sector: "Construcción, Arquitectura e Ingeniería Civil" },
  { ciiu: "4923", sector: "Logística, Transporte y Almacenamiento" },
  { ciiu: "8610", sector: "Salud, IPS y Servicios Médicos" },
  { ciiu: "8544", sector: "Educación, Capacitación e Investigación" },
  { ciiu: "5611", sector: "Gastronomía, Hotelería y Turismo" },
  { ciiu: "1089", sector: "Manufactura, Industria y Producción" },
  { ciiu: "0161", sector: "Agroindustria y Sector Rural" },
  { ciiu: "7310", sector: "Publicidad, Marketing y Medios" },
  { ciiu: "8220", sector: "Contact Center / BPO y Atención al Cliente" },
  { ciiu: "6412", sector: "Banca, Seguros y Servicios Financieros" },
  { ciiu: "8121", sector: "Servicios Generales, Aseo y Mantenimiento" },
  { ciiu: "8010", sector: "Seguridad Privada y Vigilancia" },
];

export const TAMANOS_EMPRESA_CO = ["Micro", "Pequeña", "Mediana", "Grande"] as const;

export const AREAS_LABORALES_CO = [
  "Tecnología y Sistemas",
  "Administración, Contabilidad y Finanzas",
  "Ventas, Comercial y Servicio al Cliente",
  "Marketing, Publicidad y Diseño",
  "Logística, Bodega y Transporte",
  "Ingeniería, Manufactura y Mantenimiento",
  "Construcción y Arquitectura",
  "Salud y Medicina",
  "Educación y Docencia",
  "Gastronomía, Alimentos y Turismo",
  "Recursos Humanos y Talento",
  "Derecho y Área Legal",
  "Agroindustria",
  "Servicios Generales y Oficios Varios",
];

export const CONTRATOS_COLOMBIA = [
  "Término Indefinido",
  "Término Fijo",
  "Obra o Labor",
  "Prestación de Servicios",
  "Contrato de Aprendizaje (SENA)",
  "Pasantía",
];

export const JORNADAS_COLOMBIA = [
  "Tiempo Completo",
  "Medio Tiempo",
  "Por Horas",
  "Turnos Rotativos",
  "Fines de Semana",
];

export const EXPERIENCIAS_COLOMBIA = [
  "Sin experiencia / Primer empleo",
  "6 meses - 1 año",
  "1 - 3 años",
  "3 - 5 años",
  "+5 años",
];

export const NIVELES_EDUCATIVOS_CO = [
  "No requerido",
  "Bachiller",
  "Técnico",
  "Tecnólogo",
  "Profesional",
  "Posgrado",
];

export const ESQUEMAS_SALARIALES_CO = [
  { value: "salario_fijo", label: "Salario Fijo (COP)" },
  { value: "rango_salarial", label: "Rango Salarial (Mín - Máx COP)" },
  { value: "salario_comisiones", label: "Salario + Comisiones / Bonificaciones" },
  { value: "salario_integral", label: "Salario Integral (Colombia)" },
  { value: "a_convenir", label: "A convenir" },
] as const;

export const IDIOMAS_COMUNES = ["Español", "Inglés", "Portugués", "Francés", "Alemán"];
export const NIVELES_IDIOMA = ["A1 - Básico", "A2 - Elemental", "B1 - Intermedio", "B2 - Intermedio Alto", "C1 - Avanzado", "Nativo"];

const DIAN_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Calcula el Dígito de Verificación (DV) oficial de la DIAN para un NIT numérico colombiano. */
export function calcularDvNitColombia(nitInput: string): string {
  const digits = nitInput.replace(/\D/g, "");
  if (!digits || digits.length > 15) return "";
  let total = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = Number(digits[digits.length - 1 - i]);
    total += digit * DIAN_WEIGHTS[i];
  }
  const rem = total % 11;
  return String(rem === 0 || rem === 1 ? rem : 11 - rem);
}

export function formatCopCurrency(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(String(value).replace(/\D/g, ""));
  if (Number.isNaN(num) || num <= 0) return "";
  return `$${num.toLocaleString("es-CO")} COP`;
}

export const ATS_ETAPAS_CO = [
  { value: "postulado", label: "Postulado", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { value: "preseleccionado", label: "Preseleccionado", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300" },
  { value: "en_entrevista", label: "En Entrevista", badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300" },
  { value: "prueba_tecnica", label: "Prueba Técnica / Práctica", badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300" },
  { value: "finalista", label: "Finalista / Oferta", badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300" },
  { value: "contratado", label: "Contratado", badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300" },
  { value: "descartado", label: "Descartado", badgeClass: "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300" },
] as const;

export function buildWhatsAppColombiaUrl(phoneRaw?: string | null, message = ""): string | null {
  const digits = (phoneRaw || "").replace(/\D/g, "");
  if (!digits || digits.length < 7) return null;
  const fullNumber = digits.startsWith("57") && digits.length >= 12 ? digits : `57${digits}`;
  const qs = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : "";
  return `https://wa.me/${fullNumber}${qs}`;
}
