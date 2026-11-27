import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  CompanyVacancyItem,
  CompanyVacancyPayload,
  SalarySchemeCO,
  VacancyIdioma,
  VacancyPreguntaFiltro,
} from "../../services/api";
import {
  AREAS_LABORALES_CO,
  CONTRATOS_COLOMBIA,
  DEPARTAMENTOS_COLOMBIA,
  ESQUEMAS_SALARIALES_CO,
  EXPERIENCIAS_COLOMBIA,
  formatCopCurrency,
  IDIOMAS_COMUNES,
  JORNADAS_COLOMBIA,
  NIVELES_EDUCATIVOS_CO,
  NIVELES_IDIOMA,
} from "../../data/colombia";
import { Plus, X } from "lucide-react";

interface VacancyFormModalProps {
  open: boolean;
  editingVacancy: CompanyVacancyItem | null;
  defaultDepartamento?: string;
  defaultCiudad?: string;
  companyOptions?: { id: number; nombre: string; sector?: string | null }[];
  defaultEmpresaId?: number | null;
  directPublish?: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CompanyVacancyPayload, editingId: number | null) => Promise<void>;
}

export function VacancyFormModal({
  open,
  editingVacancy,
  defaultDepartamento = "Bogotá D.C.",
  defaultCiudad = "Bogotá",
  companyOptions,
  defaultEmpresaId = null,
  directPublish = false,
  isSubmitting,
  onClose,
  onSubmit,
}: VacancyFormModalProps) {
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>(
    defaultEmpresaId ? String(defaultEmpresaId) : companyOptions?.[0] ? String(companyOptions[0].id) : ""
  );
  const [titulo, setTitulo] = useState("");
  const [categoriaArea, setCategoriaArea] = useState(AREAS_LABORALES_CO[0]);
  const [cantidadVacantes, setCantidadVacantes] = useState("1");
  const [descripcion, setDescripcion] = useState("");
  const [funciones, setFunciones] = useState("");

  const [modalidad, setModalidad] = useState<"remoto" | "hibrido" | "presencial">("remoto");
  const [departamento, setDepartamento] = useState(defaultDepartamento);
  const [ciudad, setCiudad] = useState(defaultCiudad);

  const [tipoContrato, setTipoContrato] = useState(CONTRATOS_COLOMBIA[0]);
  const [jornada, setJornada] = useState(JORNADAS_COLOMBIA[0]);

  const [esquemaSalarial, setEsquemaSalarial] = useState<SalarySchemeCO>("rango_salarial");
  const [salarioMinCop, setSalarioMinCop] = useState("");
  const [salarioMaxCop, setSalarioMaxCop] = useState("");
  const [salarioVisible, setSalarioVisible] = useState(true);
  const [beneficios, setBeneficios] = useState("");

  const [experiencia, setExperiencia] = useState(EXPERIENCIAS_COLOMBIA[0]);
  const [nivelEducativo, setNivelEducativo] = useState(NIVELES_EDUCATIVOS_CO[0]);
  const [puntajeMinimo, setPuntajeMinimo] = useState("60");
  const [reqIndispensables, setReqIndispensables] = useState("");
  const [reqDeseables, setReqDeseables] = useState("");

  const [skillInput, setSkillInput] = useState("");
  const [habilidadesClave, setHabilidadesClave] = useState<string[]>([]);
  const [idiomaSel, setIdiomaSel] = useState("Inglés");
  const [idiomaNivel, setIdiomaNivel] = useState("B1 - Intermedio");
  const [idiomas, setIdiomas] = useState<VacancyIdioma[]>([]);
  const [preguntasFiltro, setPreguntasFiltro] = useState<VacancyPreguntaFiltro[]>([]);
  const [preguntaText, setPreguntaText] = useState("");
  const [preguntaTipo, setPreguntaTipo] = useState<"texto" | "numero" | "si_no">("texto");
  const [preguntaObligatoria, setPreguntaObligatoria] = useState(true);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLocalError("");
    setSelectedEmpresaId(
      defaultEmpresaId ? String(defaultEmpresaId) : companyOptions?.[0] ? String(companyOptions[0].id) : ""
    );
    if (editingVacancy) {
      setTitulo(editingVacancy.titulo);
      setCategoriaArea(editingVacancy.categoria_area || AREAS_LABORALES_CO[0]);
      setCantidadVacantes(String(editingVacancy.cantidad_vacantes || 1));
      setDescripcion(editingVacancy.descripcion || "");
      setFunciones(editingVacancy.funciones || "");
      setModalidad((editingVacancy.modalidad as "remoto" | "hibrido" | "presencial") || "remoto");
      setDepartamento(editingVacancy.departamento || defaultDepartamento);
      setCiudad(editingVacancy.ciudad === "Remoto (Colombia)" ? "" : editingVacancy.ciudad || "");
      setTipoContrato(editingVacancy.tipo_contrato || CONTRATOS_COLOMBIA[0]);
      setJornada(editingVacancy.jornada || JORNADAS_COLOMBIA[0]);
      setEsquemaSalarial(editingVacancy.esquema_salarial || "a_convenir");
      setSalarioMinCop(editingVacancy.salario_min_cop ? String(editingVacancy.salario_min_cop) : "");
      setSalarioMaxCop(editingVacancy.salario_max_cop ? String(editingVacancy.salario_max_cop) : "");
      setSalarioVisible(editingVacancy.salario_visible ?? true);
      setBeneficios(editingVacancy.beneficios || "");
      setExperiencia(editingVacancy.experiencia || EXPERIENCIAS_COLOMBIA[0]);
      setNivelEducativo(editingVacancy.nivel_educativo || NIVELES_EDUCATIVOS_CO[0]);
      setPuntajeMinimo(String(editingVacancy.puntaje_minimo ?? 60));
      setReqIndispensables(editingVacancy.requisitos_indispensables || editingVacancy.requisitos_raw || "");
      setReqDeseables(editingVacancy.requisitos_deseables || "");
      setHabilidadesClave(editingVacancy.habilidades_clave || []);
      setIdiomas(editingVacancy.idiomas || []);
      setPreguntasFiltro(editingVacancy.preguntas_filtro || []);
    } else {
      setTitulo("");
      setCategoriaArea(AREAS_LABORALES_CO[0]);
      setCantidadVacantes("1");
      setDescripcion("");
      setFunciones("");
      setModalidad("remoto");
      setDepartamento(defaultDepartamento);
      setCiudad("");
      setTipoContrato(CONTRATOS_COLOMBIA[0]);
      setJornada(JORNADAS_COLOMBIA[0]);
      setEsquemaSalarial("rango_salarial");
      setSalarioMinCop("");
      setSalarioMaxCop("");
      setSalarioVisible(true);
      setBeneficios("");
      setExperiencia(EXPERIENCIAS_COLOMBIA[0]);
      setNivelEducativo(NIVELES_EDUCATIVOS_CO[0]);
      setPuntajeMinimo("60");
      setReqIndispensables("");
      setReqDeseables("");
      setHabilidadesClave([]);
      setIdiomas([]);
      setPreguntasFiltro([]);
    }
  }, [open, editingVacancy, defaultDepartamento]);

  if (!open) return null;

  const availableCities =
    DEPARTAMENTOS_COLOMBIA.find((d) => d.nombre === departamento)?.ciudades || [];

  const handleAddSkill = () => {
    const tokens = skillInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length === 0) return;
    setHabilidadesClave((prev) => Array.from(new Set([...prev, ...tokens])));
    setSkillInput("");
  };

  const handleAddIdioma = () => {
    if (!idiomaSel.trim()) return;
    setIdiomas((prev) => {
      if (prev.some((i) => i.idioma.toLowerCase() === idiomaSel.toLowerCase())) return prev;
      return [...prev, { idioma: idiomaSel, nivel: idiomaNivel }];
    });
  };

  const handleAddPregunta = (customText?: string, customTipo?: "texto" | "numero" | "si_no") => {
    const txt = (customText ?? preguntaText).trim();
    if (!txt) return;
    setPreguntasFiltro((prev) => {
      if (prev.some((p) => p.pregunta.toLowerCase() === txt.toLowerCase())) return prev;
      return [
        ...prev,
        {
          id: `q_${Date.now()}_${prev.length + 1}`,
          pregunta: txt,
          tipo: customTipo ?? preguntaTipo,
          obligatoria: customText ? true : preguntaObligatoria,
        },
      ];
    });
    if (!customText) setPreguntaText("");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    const minNum = salarioMinCop.trim() ? Number(salarioMinCop.replace(/\D/g, "")) : null;
    const maxNum = salarioMaxCop.trim() ? Number(salarioMaxCop.replace(/\D/g, "")) : null;

    if (modalidad !== "remoto" && !ciudad.trim()) {
      setLocalError("Para modalidad presencial o híbrida debes indicar la ciudad en Colombia.");
      return;
    }
    if (esquemaSalarial === "rango_salarial" && (!minNum || !maxNum || maxNum < minNum)) {
      setLocalError("En rango salarial debes ingresar mínimo y máximo válidos en COP.");
      return;
    }
    if (
      (esquemaSalarial === "salario_fijo" ||
        esquemaSalarial === "salario_integral" ||
        esquemaSalarial === "salario_comisiones") &&
      !minNum
    ) {
      setLocalError("Ingresa el valor base mensual en COP para el esquema salarial seleccionado.");
      return;
    }

    await onSubmit(
      {
        titulo: titulo.trim(),
        categoria_area: categoriaArea.trim(),
        cantidad_vacantes: Math.max(1, Number(cantidadVacantes) || 1),
        descripcion: descripcion.trim(),
        funciones: funciones.trim() || undefined,
        modalidad,
        departamento: modalidad === "remoto" && !departamento ? undefined : departamento,
        ciudad: ciudad.trim() || undefined,
        tipo_contrato: tipoContrato,
        jornada,
        esquema_salarial: esquemaSalarial,
        salario_min_cop: esquemaSalarial === "a_convenir" ? null : minNum,
        salario_max_cop:
          esquemaSalarial === "rango_salarial" || esquemaSalarial === "salario_comisiones"
            ? maxNum
            : null,
        salario_visible: salarioVisible,
        beneficios: beneficios.trim() || undefined,
        experiencia,
        nivel_educativo: nivelEducativo,
        requisitos_indispensables: reqIndispensables.trim(),
        requisitos_deseables: reqDeseables.trim() || undefined,
        habilidades_clave: habilidadesClave,
        idiomas,
        preguntas_filtro: preguntasFiltro,
        puntaje_minimo: Number(puntajeMinimo) || 60,
        empresa_id: selectedEmpresaId ? Number(selectedEmpresaId) : undefined,
      },
      editingVacancy?.id ?? null
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingVacancy ? "Editar Vacante" : "Publicar Nueva Vacante (Colombia)"}
            </h3>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {editingVacancy
                ? "Actualiza las condiciones de la oferta. Si estaba rechazada volverá a revisión del administrador."
                : directPublish
                  ? "Como Superadmin, la vacante se publicará directamente en estado \"Abierta\"."
                  : 'Quedará en estado "Pendiente de aprobación" hasta que un administrador la revise.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {localError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {localError}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {companyOptions && companyOptions.length > 0 && !editingVacancy && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Empresa que publica la vacante *
              </label>
              <select
                value={selectedEmpresaId}
                onChange={(e) => setSelectedEmpresaId(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                {companyOptions.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.nombre} {emp.sector ? `(${emp.sector})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Cargo y Área */}
          <div className="grid sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold mb-1">Título del cargo *</label>
              <Input
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Auxiliar Contable / Operario Logístico / Dev React"
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold mb-1">Categoría / Área laboral *</label>
              <select
                value={AREAS_LABORALES_CO.includes(categoriaArea) ? categoriaArea : "otra"}
                onChange={(e) => {
                  if (e.target.value !== "otra") setCategoriaArea(e.target.value);
                }}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                {AREAS_LABORALES_CO.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">Vacantes *</label>
              <Input
                type="number"
                min={1}
                max={500}
                value={cantidadVacantes}
                onChange={(e) => setCantidadVacantes(e.target.value)}
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Modalidad, Ubicación, Contrato y Jornada */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Modalidad *</label>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as "remoto" | "hibrido" | "presencial")}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
                <option value="presencial">Presencial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Departamento {modalidad === "remoto" ? "(opcional)" : "*"}
              </label>
              <select
                value={departamento}
                onChange={(e) => {
                  setDepartamento(e.target.value);
                  const found = DEPARTAMENTOS_COLOMBIA.find((d) => d.nombre === e.target.value);
                  if (found && found.ciudades.length > 0 && modalidad !== "remoto") {
                    setCiudad(found.ciudades[0]);
                  }
                }}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                {DEPARTAMENTOS_COLOMBIA.map((d) => (
                  <option key={d.nombre} value={d.nombre}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Ciudad {modalidad === "remoto" ? "(opcional si 100% remoto)" : "*"}
              </label>
              <Input
                required={modalidad !== "remoto"}
                list="ciudades-vacante-colombia"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder={modalidad === "remoto" ? "Toda Colombia (remoto)" : "Ej: Medellín"}
                className="dark:bg-slate-900 dark:border-slate-700"
              />
              <datalist id="ciudades-vacante-colombia">
                {availableCities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Tipo de Contrato (Colombia) *</label>
              <select
                value={tipoContrato}
                onChange={(e) => setTipoContrato(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                {CONTRATOS_COLOMBIA.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Jornada Laboral *</label>
              <select
                value={jornada}
                onChange={(e) => setJornada(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                {JORNADAS_COLOMBIA.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Experiencia Mínima *</label>
              <select
                value={experiencia}
                onChange={(e) => setExperiencia(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                {EXPERIENCIAS_COLOMBIA.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Esquema Salarial en COP */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold mb-1">Esquema Salarial (COP)</label>
                <select
                  value={esquemaSalarial}
                  onChange={(e) => setEsquemaSalarial(e.target.value as SalarySchemeCO)}
                  className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                >
                  {ESQUEMAS_SALARIALES_CO.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {esquemaSalarial !== "a_convenir" && (
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {esquemaSalarial === "rango_salarial" ? "Salario Mínimo (COP) *" : "Salario Base (COP) *"}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={50000}
                    value={salarioMinCop}
                    onChange={(e) => setSalarioMinCop(e.target.value)}
                    placeholder="Ej: 1800000"
                    className="dark:bg-slate-900 dark:border-slate-700"
                  />
                  {salarioMinCop && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      {formatCopCurrency(salarioMinCop)}
                    </span>
                  )}
                </div>
              )}

              {(esquemaSalarial === "rango_salarial" || esquemaSalarial === "salario_comisiones") && (
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {esquemaSalarial === "rango_salarial" ? "Salario Máximo (COP) *" : "Tope con Comisiones (opcional)"}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={50000}
                    value={salarioMaxCop}
                    onChange={(e) => setSalarioMaxCop(e.target.value)}
                    placeholder="Ej: 2600000"
                    className="dark:bg-slate-900 dark:border-slate-700"
                  />
                  {salarioMaxCop && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      {formatCopCurrency(salarioMaxCop)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 items-center">
              <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={salarioVisible}
                  onChange={(e) => setSalarioVisible(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-green-600"
                />
                Mostrar salario públicamente en la oferta de empleo
              </label>

              <div>
                <Input
                  value={beneficios}
                  onChange={(e) => setBeneficios(e.target.value)}
                  placeholder="Beneficios adicionales (ej: Medicina prepagada, auxilio de conectividad...)"
                  className="h-9 text-xs dark:bg-slate-900 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Educación y Puntaje IA */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Nivel Educativo Mínimo</label>
              <select
                value={nivelEducativo}
                onChange={(e) => setNivelEducativo(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                {NIVELES_EDUCATIVOS_CO.map((ed) => (
                  <option key={ed} value={ed}>
                    {ed}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Puntaje mínimo sugerido IA (0-100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={puntajeMinimo}
                onChange={(e) => setPuntajeMinimo(e.target.value)}
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Descripción y Funciones */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Descripción general del rol *</label>
              <Textarea
                required
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Contexto del equipo, propósito del cargo y oportunidad..."
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Funciones principales (una por línea)</label>
              <Textarea
                rows={3}
                value={funciones}
                onChange={(e) => setFunciones(e.target.value)}
                placeholder={"• Atender clientes y cerrar ventas\n• Elaborar reportes semanales"}
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Requisitos estructurados para Gemini */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Requisitos indispensables (uno por línea) *</label>
              <Textarea
                required
                rows={4}
                value={reqIndispensables}
                onChange={(e) => setReqIndispensables(e.target.value)}
                placeholder={"• Experiencia mínima certificada\n• Manejo de herramientas del cargo"}
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Requisitos deseables (opcional)</label>
              <Textarea
                rows={4}
                value={reqDeseables}
                onChange={(e) => setReqDeseables(e.target.value)}
                placeholder={"• Certificaciones complementarias\n• Disponibilidad inmediata"}
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Habilidades Clave e Idiomas */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Habilidades clave (para análisis IA)</label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  placeholder="Ej: Excel, Ventas B2B, Python, Siigo..."
                  className="dark:bg-slate-900 dark:border-slate-700"
                />
                <Button type="button" variant="outline" onClick={handleAddSkill}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {habilidadesClave.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {habilidadesClave.map((sk) => (
                    <Badge key={sk} variant="outline" className="text-xs gap-1 dark:border-slate-700">
                      {sk}
                      <button
                        type="button"
                        onClick={() => setHabilidadesClave((prev) => prev.filter((item) => item !== sk))}
                        className="text-gray-400 hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Idiomas requeridos</label>
              <div className="flex gap-2">
                <select
                  value={idiomaSel}
                  onChange={(e) => setIdiomaSel(e.target.value)}
                  className="flex-1 h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                >
                  {IDIOMAS_COMUNES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <select
                  value={idiomaNivel}
                  onChange={(e) => setIdiomaNivel(e.target.value)}
                  className="flex-1 h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                >
                  {NIVELES_IDIOMA.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" onClick={handleAddIdioma}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {idiomas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {idiomas.map((idItem) => (
                    <Badge key={idItem.idioma} variant="outline" className="text-xs gap-1 dark:border-slate-700">
                      {idItem.idioma} ({idItem.nivel})
                      <button
                        type="button"
                        onClick={() =>
                          setIdiomas((prev) => prev.filter((item) => item.idioma !== idItem.idioma))
                        }
                        className="text-gray-400 hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preguntas Filtro al Postularse */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-900 dark:text-white">
                  Preguntas filtro opcionales al postularse
                </label>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  El candidato responderá estas preguntas antes de enviar su postulación.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddPregunta("¿Cuál es tu aspiración salarial mensual en COP?", "numero")}
                  className="text-[11px] px-2 py-1 rounded-md border border-gray-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                >
                  + Aspiración salarial
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPregunta("¿Tienes disponibilidad inmediata para iniciar?", "si_no")}
                  className="text-[11px] px-2 py-1 rounded-md border border-gray-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                >
                  + Disponibilidad inmediata
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-12 gap-2 items-center">
              <Input
                value={preguntaText}
                onChange={(e) => setPreguntaText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPregunta();
                  }
                }}
                placeholder="Escribe una pregunta filtro personalizada..."
                className="sm:col-span-6 h-9 text-xs dark:bg-slate-900 dark:border-slate-700"
              />
              <select
                value={preguntaTipo}
                onChange={(e) => setPreguntaTipo(e.target.value as "texto" | "numero" | "si_no")}
                className="sm:col-span-3 h-9 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
              >
                <option value="texto">Respuesta texto</option>
                <option value="numero">Número / COP</option>
                <option value="si_no">Sí / No</option>
              </select>
              <label className="sm:col-span-2 flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={preguntaObligatoria}
                  onChange={(e) => setPreguntaObligatoria(e.target.checked)}
                />
                Obligatoria
              </label>
              <Button type="button" size="sm" variant="outline" onClick={() => handleAddPregunta()} className="sm:col-span-1 h-9">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {preguntasFiltro.length > 0 && (
              <div className="space-y-1.5">
                {preguntasFiltro.map((pf) => (
                  <div
                    key={pf.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs"
                  >
                    <span className="text-gray-800 dark:text-slate-200">
                      {pf.pregunta}{" "}
                      <span className="text-[10px] text-gray-500">
                        ({pf.tipo === "si_no" ? "Sí/No" : pf.tipo === "numero" ? "Número" : "Texto"}
                        {pf.obligatoria ? " · Obligatoria" : " · Opcional"})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreguntasFiltro((prev) => prev.filter((item) => item.id !== pf.id))}
                      className="text-red-500 hover:underline text-xs shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
              {isSubmitting
                ? "Guardando..."
                : editingVacancy
                  ? "Guardar Cambios"
                  : directPublish
                    ? "Publicar Vacante"
                    : "Enviar a Aprobación"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
