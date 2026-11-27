import { useState, useEffect, useMemo } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Vacancy, VacancyEvaluationResult, VacancyRespuestaFiltro } from "../../services/api";
import {
  Search, MapPin, Briefcase, Building2, Clock, CheckCircle, AlertTriangle,
  Sparkles, Bookmark, Banknote, FileCheck2, FilterX, Calendar, Users, ShieldCheck
} from "lucide-react";

interface JobSearchExplorerProps {
  vacancies: Vacancy[];
  userApplications: Array<{ vacante_id?: number }>;
  hasCv: boolean;
  selectedVacancy: Vacancy | null;
  onSelectVacancy: (vac: Vacancy) => void;
  evaluation: VacancyEvaluationResult | null;
  isEvaluating: boolean;
  onEvaluateVacancy: (vac: Vacancy) => void;
  isApplying: boolean;
  onApplyToVacancy: (vacanteId: number, respuestasFiltro?: VacancyRespuestaFiltro[]) => void;
  applyFeedback?: { type: "success" | "error"; message: string } | null;
  onGoToUploadCv?: () => void;
  iaConsentAccepted?: boolean;
  isTogglingConsent?: boolean;
  onToggleAIConsent?: (aceptado: boolean) => void;
}

const SAVED_VACANCIES_KEY = "prepia_saved_vacancies";

function formatRelativeDate(iso?: string | null): string {
  if (!iso) return "Reciente";
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return "Reciente";
  const diffDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 30) return `Hace ${diffDays} días`;
  return iso.slice(0, 10);
}

export function JobSearchExplorer({
  vacancies,
  userApplications,
  hasCv,
  selectedVacancy,
  onSelectVacancy,
  evaluation,
  isEvaluating,
  onEvaluateVacancy,
  isApplying,
  onApplyToVacancy,
  applyFeedback,
  onGoToUploadCv,
  iaConsentAccepted,
  isTogglingConsent,
  onToggleAIConsent,
}: JobSearchExplorerProps) {
  const [keyword, setKeyword] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [appliedCity, setAppliedCity] = useState("");

  const [sortBy, setSortBy] = useState("recientes");
  const [dateFilter, setDateFilter] = useState("todas");
  const [modalityFilter, setModalityFilter] = useState("todas");
  const [salaryFilter, setSalaryFilter] = useState("todos");
  const [experienceFilter, setExperienceFilter] = useState("todas");
  const [contractFilter, setContractFilter] = useState("todas");
  const [onlySaved, setOnlySaved] = useState(false);
  const [screeningVacancy, setScreeningVacancy] = useState<Vacancy | null>(null);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [screeningError, setScreeningError] = useState("");

  const [savedIds, setSavedIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_VACANCIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const toggleSaveVacancy = (id: number) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem(SAVED_VACANCIES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filteredVacancies = useMemo(() => {
    const q = appliedKeyword.trim().toLowerCase();
    const c = appliedCity.trim().toLowerCase();
    const now = Date.now();

    const list = vacancies.filter((job) => {
      if (onlySaved && !savedIds.includes(job.id)) return false;

      if (q) {
        const hay = [
          job.titulo,
          job.empresa,
          job.sector,
          job.categoria_area,
          job.descripcion,
          job.funciones,
          ...(job.habilidades_clave || []),
          ...(job.requisitos || []),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (c) {
        const loc = `${job.ciudad || ""} ${job.departamento || ""} ${job.modalidad || ""}`.toLowerCase();
        if (!loc.includes(c)) return false;
      }

      if (modalityFilter !== "todas") {
        if ((job.modalidad || "").toLowerCase() !== modalityFilter) return false;
      }

      if (salaryFilter !== "todos") {
        const minSal = job.salario_min_cop ?? null;
        const maxSal = job.salario_max_cop ?? minSal;
        if (salaryFilter === "a_convenir") {
          if ((job.esquema_salarial || "a_convenir") !== "a_convenir" && minSal !== null) return false;
        } else {
          if (job.salario_visible === false || minSal === null || maxSal === null) return false;
          if (salaryFilter === "menos_2m" && minSal > 2_000_000) return false;
          if (salaryFilter === "2m_4m" && (maxSal < 2_000_000 || minSal > 4_000_000)) return false;
          if (salaryFilter === "4m_7m" && (maxSal < 4_000_000 || minSal > 7_000_000)) return false;
          if (salaryFilter === "mas_7m" && maxSal < 7_000_000) return false;
        }
      }

      if (experienceFilter !== "todas") {
        const exp = (job.experiencia || "").toLowerCase();
        if (!exp.includes(experienceFilter)) return false;
      }

      if (contractFilter !== "todas") {
        const cont = (job.tipo_contrato || "").toLowerCase();
        if (!cont.includes(contractFilter)) return false;
      }

      if (dateFilter !== "todas" && job.created_at) {
        const createdMs = new Date(job.created_at).getTime();
        if (!Number.isNaN(createdMs)) {
          const diffDays = (now - createdMs) / (1000 * 60 * 60 * 24);
          if (dateFilter === "hoy" && diffDays > 1) return false;
          if (dateFilter === "3dias" && diffDays > 3) return false;
          if (dateFilter === "semana" && diffDays > 7) return false;
          if (dateFilter === "mes" && diffDays > 30) return false;
        }
      }

      return true;
    });

    if (sortBy === "puntaje_asc") {
      return [...list].sort((a, b) => a.puntaje_minimo - b.puntaje_minimo);
    }
    if (sortBy === "puntaje_desc") {
      return [...list].sort((a, b) => b.puntaje_minimo - a.puntaje_minimo);
    }
    return list;
  }, [
    vacancies,
    appliedKeyword,
    appliedCity,
    modalityFilter,
    salaryFilter,
    experienceFilter,
    contractFilter,
    dateFilter,
    sortBy,
    onlySaved,
    savedIds,
  ]);

  // Seleccionar automáticamente desde hash (#vacante-4) o primera vacante filtrada
  useEffect(() => {
    if (filteredVacancies.length === 0) return;
    const hash = window.location.hash;
    const match = hash.match(/^#vacante-(\d+)$/);
    if (match) {
      const hashId = Number(match[1]);
      const found = filteredVacancies.find((v) => v.id === hashId);
      if (found && selectedVacancy?.id !== found.id) {
        onSelectVacancy(found);
        return;
      }
    }
    if (!selectedVacancy || !filteredVacancies.some((v) => v.id === selectedVacancy.id)) {
      onSelectVacancy(filteredVacancies[0]);
    }
  }, [filteredVacancies, selectedVacancy, onSelectVacancy]);

  const handleCardSelect = (job: Vacancy) => {
    window.history.replaceState(null, "", `#vacante-${job.id}`);
    onSelectVacancy(job);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedKeyword(keyword);
    setAppliedCity(cityQuery);
  };

  const hasActiveFilters =
    Boolean(appliedKeyword || appliedCity) ||
    modalityFilter !== "todas" ||
    salaryFilter !== "todos" ||
    experienceFilter !== "todas" ||
    contractFilter !== "todas" ||
    dateFilter !== "todas" ||
    onlySaved;

  const clearAllFilters = () => {
    setKeyword("");
    setCityQuery("");
    setAppliedKeyword("");
    setAppliedCity("");
    setModalityFilter("todas");
    setSalaryFilter("todos");
    setExperienceFilter("todas");
    setContractFilter("todas");
    setDateFilter("todas");
    setSortBy("recientes");
    setOnlySaved(false);
  };

  const activeJob =
    filteredVacancies.find((v) => v.id === selectedVacancy?.id) || filteredVacancies[0] || null;
  const activeEval =
    activeJob && evaluation && evaluation.vacante_id === activeJob.id ? evaluation : null;
  const isApplied = activeJob
    ? userApplications.some((app) => app.vacante_id === activeJob.id)
    : false;

  return (
    <div className="space-y-5">
      {/* Barra superior estilo CompuTrabajo (Cargo + Lugar + Buscar) */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setAppliedKeyword(e.target.value);
              }}
              placeholder="Cargo, habilidad o empresa (ej. Python, React...)"
              className="pl-10 h-11 rounded-xl bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700"
            />
          </div>

          <div className="md:col-span-4 relative">
            <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={cityQuery}
              onChange={(e) => {
                setCityQuery(e.target.value);
                setAppliedCity(e.target.value);
              }}
              placeholder="Ciudad o modalidad (ej. Barranquilla, Remoto...)"
              className="pl-10 h-11 rounded-xl bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700"
            />
          </div>

          <div className="md:col-span-3">
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-[#0066CC] hover:bg-[#004999] text-white font-semibold shadow-sm cursor-pointer"
            >
              <Search className="w-4 h-4 mr-2" />
              Buscar empleos
            </Button>
          </div>
        </form>

        {/* Barra de filtros horizontales tipo píldora */}
        <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Ordenar por"
            className="h-9 rounded-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-gray-700 dark:text-slate-200"
          >
            <option value="recientes">Ordenar: Más recientes</option>
            <option value="puntaje_asc">Menor puntaje mínimo</option>
            <option value="puntaje_desc">Mayor puntaje mínimo</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Fecha"
            className="h-9 rounded-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-gray-700 dark:text-slate-200"
          >
            <option value="todas">Fecha: Cualquiera</option>
            <option value="hoy">Hoy</option>
            <option value="3dias">Últimos 3 días</option>
            <option value="semana">Última semana</option>
            <option value="mes">Último mes</option>
          </select>

          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            aria-label="Modalidad"
            className="h-9 rounded-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-gray-700 dark:text-slate-200"
          >
            <option value="todas">Modalidad: Todas</option>
            <option value="remoto">Remoto</option>
            <option value="hibrido">Híbrido</option>
            <option value="presencial">Presencial</option>
          </select>

          <select
            value={salaryFilter}
            onChange={(e) => setSalaryFilter(e.target.value)}
            aria-label="Salario en COP"
            className="h-9 rounded-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-gray-700 dark:text-slate-200"
          >
            <option value="todos">Salario: Todos</option>
            <option value="menos_2m">Hasta $2M COP</option>
            <option value="2m_4m">$2M - $4M COP</option>
            <option value="4m_7m">$4M - $7M COP</option>
            <option value="mas_7m">Más de $7M COP</option>
            <option value="a_convenir">A convenir</option>
          </select>

          <select
            value={experienceFilter}
            onChange={(e) => setExperienceFilter(e.target.value)}
            aria-label="Experiencia"
            className="h-9 rounded-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-gray-700 dark:text-slate-200"
          >
            <option value="todas">Experiencia: Todas</option>
            <option value="sin experiencia">Sin experiencia / Primer empleo</option>
            <option value="6 meses">6 meses - 1 año</option>
            <option value="1 - 3">1 - 3 años</option>
            <option value="3 - 5">3 - 5 años</option>
            <option value="+5">+5 años</option>
          </select>

          <select
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            aria-label="Contrato"
            className="h-9 rounded-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-gray-700 dark:text-slate-200"
          >
            <option value="todas">Contrato: Todos</option>
            <option value="indefinido">Término Indefinido</option>
            <option value="fijo">Término Fijo</option>
            <option value="obra">Obra o Labor</option>
            <option value="prestación">Prestación de Servicios</option>
            <option value="aprendizaje">Contrato Aprendizaje (SENA)</option>
            <option value="pasantía">Pasantía</option>
          </select>

          <Button
            type="button"
            size="sm"
            variant={onlySaved ? "default" : "outline"}
            onClick={() => setOnlySaved((v) => !v)}
            className={`h-9 rounded-full text-xs px-3 ${
              onlySaved ? "bg-[#0066CC] text-white" : "dark:border-slate-700"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 mr-1" />
            Guardadas ({savedIds.length})
          </Button>

          {hasActiveFilters && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearAllFilters}
              className="h-9 rounded-full text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <FilterX className="w-3.5 h-3.5 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
          <span className="text-[#0066CC] dark:text-blue-400 font-bold">{filteredVacancies.length}</span>{" "}
          {filteredVacancies.length === 1 ? "oferta de empleo encontrada" : "ofertas de empleo encontradas"} en PostgreSQL
        </p>
        {!hasCv && (
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs">
              Sube tu CV para calcular % de Match con IA
            </Badge>
            {onGoToUploadCv && (
              <Button size="sm" variant="outline" onClick={onGoToUploadCv} className="h-7 text-xs">
                Subir CV
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Layout Maestro-Detalle (Izquierda lista, Derecha panel fijo de detalle) */}
      {filteredVacancies.length === 0 ? (
        <Card className="p-10 text-center bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
          <Search className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
            No se encontraron vacantes con esos filtros
          </h4>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-4">
            Prueba quitando algún filtro o buscando otro cargo o modalidad.
          </p>
          <Button onClick={clearAllFilters} variant="outline">
            Ver todas las ofertas disponibles
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Columna Izquierda: Lista de tarjetas clicables */}
          <div className="lg:col-span-5 space-y-3 lg:max-h-[780px] lg:overflow-y-auto pr-0.5">
            {filteredVacancies.map((job) => {
              const isSelected = activeJob?.id === job.id;
              const jobApplied = userApplications.some((a) => a.vacante_id === job.id);
              const isSaved = savedIds.includes(job.id);

              return (
                <article
                  key={job.id}
                  onClick={() => handleCardSelect(job)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 border-l-4 border-l-[#0066CC] shadow-sm"
                      : "bg-white dark:bg-[#141d33] border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-600 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-base text-gray-900 dark:text-white leading-snug hover:text-[#0066CC] dark:hover:text-blue-400">
                        {job.titulo}
                      </h4>
                      <p className="text-xs font-semibold text-[#0066CC] dark:text-blue-400 mt-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{job.empresa}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveVacancy(job.id);
                      }}
                      title={isSaved ? "Quitar de guardadas" : "Guardar oferta"}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#0066CC] hover:bg-blue-50 dark:hover:bg-slate-800 shrink-0"
                    >
                      <Bookmark
                        className={`w-4 h-4 ${isSaved ? "fill-[#0066CC] text-[#0066CC]" : ""}`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-slate-300 mt-2.5">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {job.ciudad || job.modalidad}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                      {job.salario || "A convenir"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                      {job.experiencia || "Sin experiencia / Junior"}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                    {job.descripcion}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 text-[11px] text-gray-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeDate(job.created_at)}
                    </span>

                    <div className="flex items-center gap-2">
                      {jobApplied ? (
                        <Badge className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px]">
                          Postulado
                        </Badge>
                      ) : (
                        <span className="font-semibold text-[#0066CC] dark:text-blue-400">
                          Postulación directa →
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Columna Derecha: Panel de detalle completo (sticky en escritorio) */}
          <div className="lg:col-span-7 lg:sticky lg:top-20">
            {activeJob && (
              <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm space-y-5">
                {/* Cabecera de la oferta */}
                <div className="space-y-2 border-b border-gray-100 dark:border-slate-800 pb-5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0066CC] dark:text-blue-400 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      {activeJob.empresa} · {activeJob.sector}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400 inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Publicada: {formatRelativeDate(activeJob.created_at)}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                    {activeJob.titulo}
                  </h3>

                  {/* Metadatos clave estilo portal */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="outline" className="text-xs py-1 px-2.5 dark:border-slate-700">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-red-500" />
                      {activeJob.ciudad || activeJob.modalidad} ({activeJob.modalidad})
                    </Badge>
                    <Badge variant="outline" className="text-xs py-1 px-2.5 dark:border-slate-700">
                      <Banknote className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                      {activeJob.salario || "A convenir"}
                    </Badge>
                    <Badge variant="outline" className="text-xs py-1 px-2.5 dark:border-slate-700">
                      <FileCheck2 className="w-3.5 h-3.5 mr-1 text-blue-500" />
                      {activeJob.tipo_contrato || "Término indefinido"}
                    </Badge>
                    <Badge variant="outline" className="text-xs py-1 px-2.5 dark:border-slate-700">
                      <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      {activeJob.jornada || "Tiempo completo"}
                    </Badge>
                    <Badge variant="outline" className="text-xs py-1 px-2.5 dark:border-slate-700">
                      <Briefcase className="w-3.5 h-3.5 mr-1 text-purple-500" />
                      {activeJob.experiencia || "Sin experiencia / Primer empleo"}
                    </Badge>
                    {activeJob.nivel_educativo && activeJob.nivel_educativo !== "No requerido" && (
                      <Badge variant="outline" className="text-xs py-1 px-2.5 dark:border-slate-700">
                        Educación: {activeJob.nivel_educativo}
                      </Badge>
                    )}
                    {activeJob.cantidad_vacantes && activeJob.cantidad_vacantes > 1 && (
                      <Badge variant="outline" className="text-xs py-1 px-2.5 dark:border-slate-700">
                        {activeJob.cantidad_vacantes} vacantes disponibles
                      </Badge>
                    )}
                  </div>

                  {/* Botones de acción principales */}
                  <div className="flex flex-wrap items-center gap-3 pt-4">
                    {isApplied ? (
                      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="w-4 h-4" />
                        Ya te postulaste (En revisión)
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          if (!hasCv) {
                            onApplyToVacancy(activeJob.id);
                            return;
                          }
                          if (activeJob.preguntas_filtro && activeJob.preguntas_filtro.length > 0) {
                            setScreeningVacancy(activeJob);
                            setScreeningAnswers({});
                            setScreeningError("");
                          } else {
                            onApplyToVacancy(activeJob.id);
                          }
                        }}
                        disabled={isApplying}
                        className="bg-[#0066CC] hover:bg-[#004999] text-white font-semibold px-6 rounded-xl cursor-pointer shadow-sm"
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        {isApplying ? "Enviando postulación..." : "Postularme"}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => onEvaluateVacancy(activeJob)}
                      disabled={isEvaluating}
                      className="rounded-xl dark:border-slate-700 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 mr-2 text-[#0066CC]" />
                      {isEvaluating ? "Analizando CV..." : "Comparar con mi CV (IA)"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleSaveVacancy(activeJob.id)}
                      title="Guardar oferta"
                      className="rounded-xl"
                    >
                      <Bookmark
                        className={`w-5 h-5 ${
                          savedIds.includes(activeJob.id)
                            ? "fill-[#0066CC] text-[#0066CC]"
                            : "text-gray-500"
                        }`}
                      />
                    </Button>
                  </div>

                  {onToggleAIConsent && (
                    <div
                      className={`mt-3 p-3 rounded-xl text-xs border flex items-center justify-between flex-wrap gap-2 ${
                        iaConsentAccepted
                          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                          : "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        {iaConsentAccepted
                          ? "Análisis con IA externa (Gemini) autorizado para tus postulaciones (CV anonimizado)."
                          : "¿Quieres que Gemini evalúe tu postulación con IA? (Tu CV se anonimiza antes de enviarse)."}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant={iaConsentAccepted ? "outline" : "default"}
                        disabled={isTogglingConsent}
                        onClick={() => onToggleAIConsent(!iaConsentAccepted)}
                        className={`h-7 text-xs ${
                          iaConsentAccepted ? "dark:border-slate-700" : "bg-[#0066CC] hover:bg-[#004999] text-white"
                        }`}
                      >
                        {isTogglingConsent
                          ? "Guardando..."
                          : iaConsentAccepted
                            ? "Revocar permiso IA"
                            : "Autorizar IA al postularme"}
                      </Button>
                    </div>
                  )}

                  {applyFeedback && (
                    <div
                      className={`mt-3 p-3 rounded-xl text-xs border flex items-center gap-2 ${
                        applyFeedback.type === "success"
                          ? "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
                          : "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      {applyFeedback.type === "success" ? (
                        <CheckCircle className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{applyFeedback.message}</span>
                    </div>
                  )}
                </div>

                {/* Diagnóstico IA contra el CV del candidato */}
                {activeEval && activeEval.tiene_cv && (
                  <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Compatibilidad IA con tu Hoja de Vida ({activeEval.cv_nombre || "CV"})
                      </span>
                      <Badge className="bg-emerald-600 text-white font-bold text-xs">
                        {activeEval.match_score}% de Match
                      </Badge>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/50">
                        <p className="font-bold text-green-900 dark:text-green-300 mb-1 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          Requisitos que CUMPLES:
                        </p>
                        <ul className="space-y-1 text-green-950 dark:text-green-200">
                          {activeEval.requisitos_cumplidos?.length ? (
                            activeEval.requisitos_cumplidos.map((c, i) => <li key={i}>✓ {c}</li>)
                          ) : (
                            <li>Ninguno detectado aún</li>
                          )}
                        </ul>
                      </div>

                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                        <p className="font-bold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Requisitos que TE FALTAN:
                        </p>
                        <ul className="space-y-1 text-amber-950 dark:text-amber-200">
                          {activeEval.requisitos_faltantes?.length ? (
                            activeEval.requisitos_faltantes.map((f, i) => <li key={i}>• {f}</li>)
                          ) : (
                            <li>¡Cumples todos los requisitos!</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {activeEval && !activeEval.tiene_cv && activeEval.mensaje && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{activeEval.mensaje}</span>
                  </div>
                )}

                {/* Descripción del cargo */}
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2">
                    Descripción de la oferta
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {activeJob.descripcion}
                  </p>
                </div>

                {activeJob.funciones && (
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2">
                      Funciones principales
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {activeJob.funciones}
                    </p>
                  </div>
                )}

                {activeJob.habilidades_clave && activeJob.habilidades_clave.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2">
                      Habilidades clave
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {activeJob.habilidades_clave.map((sk) => (
                        <Badge key={sk} variant="outline" className="text-xs dark:border-slate-700">
                          {sk}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {activeJob.idiomas && activeJob.idiomas.length > 0 && (
                  <div className="text-xs text-gray-700 dark:text-slate-300">
                    <strong>Idiomas:</strong>{" "}
                    {activeJob.idiomas.map((id) => `${id.idioma} (${id.nivel})`).join(" · ")}
                  </div>
                )}

                {activeJob.beneficios && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-900 dark:text-emerald-200">
                    <strong>Beneficios adicionales:</strong> {activeJob.beneficios}
                  </div>
                )}

                {/* Requerimientos */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-3">
                    Requerimientos del empleador
                  </h4>
                  <ul className="space-y-2">
                    {activeJob.requisitos?.map((req, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-800 dark:text-slate-200 flex items-start gap-2"
                      >
                        <span className="text-[#0066CC] dark:text-blue-400 font-bold mt-0.5">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Información adicional de evaluación PrepIA */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-slate-800 text-center">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-900/60">
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Puntaje mínimo</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                      {activeJob.puntaje_minimo} pts
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-900/60">
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Peso CV / Prueba</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                      {activeJob.peso_cv ?? 30}% / {activeJob.peso_prueba ?? 70}%
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-900/60">
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Postulados</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#0066CC]" />
                      {activeJob.total_postulados ?? 0}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-900/60">
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Estado</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 capitalize">
                      {activeJob.estado}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modal Preguntas Filtro al Postularse */}
      {screeningVacancy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Preguntas filtro — {screeningVacancy.titulo}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                La empresa solicita responder estas preguntas antes de registrar tu postulación.
              </p>
            </div>

            {screeningError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                {screeningError}
              </div>
            )}

            <div className="space-y-3">
              {(screeningVacancy.preguntas_filtro || []).map((pf) => (
                <div key={pf.id}>
                  <label className="block text-xs font-semibold mb-1 text-gray-800 dark:text-slate-200">
                    {pf.pregunta} {pf.obligatoria ? "*" : "(opcional)"}
                  </label>
                  {pf.tipo === "si_no" ? (
                    <select
                      value={screeningAnswers[pf.id] || ""}
                      onChange={(e) => setScreeningAnswers((prev) => ({ ...prev, [pf.id]: e.target.value }))}
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                    >
                      <option value="">Selecciona una opción...</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  ) : (
                    <Input
                      type={pf.tipo === "numero" ? "number" : "text"}
                      value={screeningAnswers[pf.id] || ""}
                      onChange={(e) => setScreeningAnswers((prev) => ({ ...prev, [pf.id]: e.target.value }))}
                      placeholder={pf.tipo === "numero" ? "Ej: 2500000" : "Tu respuesta..."}
                      className="dark:bg-slate-900 dark:border-slate-700"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setScreeningVacancy(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-[#0066CC] hover:bg-[#004999] text-white"
                onClick={() => {
                  const qs = screeningVacancy.preguntas_filtro || [];
                  for (const q of qs) {
                    if (q.obligatoria && !(screeningAnswers[q.id] || "").trim()) {
                      setScreeningError(`Responde la pregunta obligatoria: ${q.pregunta}`);
                      return;
                    }
                  }
                  const respuestas: VacancyRespuestaFiltro[] = qs.map((q) => ({
                    pregunta: q.pregunta,
                    respuesta: (screeningAnswers[q.id] || "").trim(),
                  }));
                  const targetId = screeningVacancy.id;
                  setScreeningVacancy(null);
                  onApplyToVacancy(targetId, respuestas);
                }}
              >
                Enviar Postulación
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
