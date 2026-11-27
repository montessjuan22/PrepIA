import { useState, useEffect, useMemo } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  apiAnalyzeApplicantWithAI,
  apiAnalyzePendingApplicantsWithAI,
  apiCompareApplicantsWithAI,
  apiFetchCompanyCVBlob,
  apiNotifyCandidateInterest,
  apiUpdateCompanyApplicantATS,
  ATSStage,
  CompanyApplicantItem,
  CompanyComparisonResult,
  CompanyVacancyItem,
} from "../../services/api";
import { ATS_ETAPAS_CO, buildWhatsAppColombiaUrl } from "../../data/colombia";
import {
  Search, Star, CheckCircle, AlertTriangle, FileText, Download, Eye, Mail,
  MessageCircle, Sparkles, User, MapPin, Briefcase, GraduationCap, ExternalLink,
  CalendarCheck, Send, X, RefreshCw, Brain, Scale, HelpCircle
} from "lucide-react";

interface CompanyApplicantsTabProps {
  applicants: CompanyApplicantItem[];
  vacancies: CompanyVacancyItem[];
  companyName: string;
  onApplicantUpdated: (updated: CompanyApplicantItem, message: string) => void;
  onBatchApplicantsUpdated: (updatedList: CompanyApplicantItem[], message: string) => void;
  onNotificationSent: (message: string) => void;
  onError: (message: string) => void;
}

function getStageBadgeClass(stage: string): string {
  return (
    ATS_ETAPAS_CO.find((item) => item.value === stage)?.badgeClass ||
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  );
}

function ProviderBadge({ provider }: { provider?: string | null }) {
  const isGemini = (provider || "").toLowerCase() === "gemini";
  return (
    <Badge
      className={`text-[10px] border-0 ${
        isGemini
          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      <Sparkles className="w-3 h-3 mr-1" />
      {isGemini ? "Analizado con Gemini IA" : "Motor Local"}
    </Badge>
  );
}

export function CompanyApplicantsTab({
  applicants,
  vacancies,
  companyName,
  onApplicantUpdated,
  onBatchApplicantsUpdated,
  onNotificationSent,
  onError,
}: CompanyApplicantsTabProps) {
  const [vacancyFilter, setVacancyFilter] = useState<string>("todas");
  const [stageFilter, setStageFilter] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Estado edición ATS del candidato seleccionado
  const [draftStage, setDraftStage] = useState<ATSStage>("postulado");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftRating, setDraftRating] = useState<number>(0);
  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const [isSavingATS, setIsSavingATS] = useState(false);

  // Estados IA (individual, lote y comparación)
  const [isAnalyzingSingle, setIsAnalyzingSingle] = useState(false);
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<CompanyComparisonResult | null>(null);

  // Visor CV modal
  const [cvModal, setCvModal] = useState<{
    title: string;
    blobUrl: string | null;
    isPdf: boolean;
    textPreview: string;
  } | null>(null);
  const [isLoadingCV, setIsLoadingCV] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const filteredApplicants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return applicants
      .filter((a) => {
        if (vacancyFilter !== "todas" && String(a.vacante_id) !== vacancyFilter) return false;
        if (stageFilter !== "todas" && a.etapa_seleccion !== stageFilter) return false;
        if (q) {
          const hay = [
            a.nombre,
            a.email,
            a.ciudad,
            a.vacante_titulo,
            a.especialidad,
            ...(a.requisitos_cumplidos || []),
          ]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.cv_score ?? -1) - (a.cv_score ?? -1) || b.id - a.id);
  }, [applicants, vacancyFilter, stageFilter, searchTerm]);

  const activeApplicant = useMemo(() => {
    return (
      filteredApplicants.find((a) => a.id === selectedId) ||
      filteredApplicants[0] ||
      null
    );
  }, [filteredApplicants, selectedId]);

  useEffect(() => {
    if (!activeApplicant) return;
    setSelectedId(activeApplicant.id);
    setDraftStage(activeApplicant.etapa_seleccion || "postulado");
    setDraftNotes(activeApplicant.notas_reclutador || "");
    setDraftRating(activeApplicant.calificacion_reclutador || 0);
  }, [activeApplicant?.id, activeApplicant?.etapa_seleccion, activeApplicant?.notas_reclutador, activeApplicant?.calificacion_reclutador]);

  const targetVacancyIdForBatch = useMemo(() => {
    if (vacancyFilter !== "todas") return Number(vacancyFilter);
    if (activeApplicant) return activeApplicant.vacante_id;
    const vacWithApps = vacancies.find((v) => v.total_postulados > 0);
    return vacWithApps?.id ?? null;
  }, [vacancyFilter, activeApplicant, vacancies]);

  const handleToggleCompare = (app: CompanyApplicantItem) => {
    setCompareIds((prev) => {
      if (prev.includes(app.id)) {
        return prev.filter((id) => id !== app.id);
      }
      if (prev.length >= 5) {
        onError("Puedes comparar hasta 5 postulantes a la vez.");
        return prev;
      }
      if (prev.length > 0) {
        const firstSelected = applicants.find((a) => a.id === prev[0]);
        if (firstSelected && firstSelected.vacante_id !== app.vacante_id) {
          onError("Selecciona postulantes de la misma vacante para compararlos con IA.");
          return prev;
        }
      }
      return [...prev, app.id];
    });
  };

  const handleAnalyzeSingle = async () => {
    if (!activeApplicant) return;
    setIsAnalyzingSingle(true);
    try {
      const res = await apiAnalyzeApplicantWithAI(activeApplicant.id);
      onApplicantUpdated(res.applicant, res.mensaje);
    } catch (err: any) {
      onError(err?.message || "No se pudo analizar al postulante con IA.");
    } finally {
      setIsAnalyzingSingle(false);
    }
  };

  const handleAnalyzePendingBatch = async () => {
    if (!targetVacancyIdForBatch) {
      onError("Selecciona una vacante con postulantes para analizar pendientes.");
      return;
    }
    setIsAnalyzingBatch(true);
    try {
      const res = await apiAnalyzePendingApplicantsWithAI(targetVacancyIdForBatch, false);
      onBatchApplicantsUpdated(res.updated_applicants, res.mensaje);
    } catch (err: any) {
      onError(err?.message || "Error al ejecutar el análisis masivo con IA.");
    } finally {
      setIsAnalyzingBatch(false);
    }
  };

  const handleCompareSelected = async () => {
    if (compareIds.length < 2 || compareIds.length > 5) {
      onError("Selecciona entre 2 y 5 postulantes de una vacante para compararlos.");
      return;
    }
    const first = applicants.find((a) => a.id === compareIds[0]);
    if (!first) return;
    setIsComparing(true);
    try {
      const res = await apiCompareApplicantsWithAI(first.vacante_id, compareIds);
      setComparisonResult(res.comparison);
    } catch (err: any) {
      onError(err?.message || "No se pudo generar la comparación con IA.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleSaveATS = async (overrideStage?: ATSStage) => {
    if (!activeApplicant) return;
    setIsSavingATS(true);
    try {
      const stageToSave = overrideStage ?? draftStage;
      const res = await apiUpdateCompanyApplicantATS(activeApplicant.id, {
        etapa_seleccion: stageToSave,
        notas_reclutador: draftNotes,
        calificacion_reclutador: draftRating > 0 ? draftRating : undefined,
        revisado: true,
        notificar_candidato: notifyCandidate,
      });
      setDraftStage(res.applicant.etapa_seleccion);
      onApplicantUpdated(res.applicant, res.mensaje);
    } catch (err: any) {
      onError(err?.message || "No se pudo guardar el seguimiento del postulante.");
    } finally {
      setIsSavingATS(false);
    }
  };

  const handleViewCV = async (app: CompanyApplicantItem) => {
    if (!app.tiene_cv) return;
    setIsLoadingCV(true);
    try {
      if (app.tiene_cv_archivo) {
        const { blob, contentType } = await apiFetchCompanyCVBlob("applicant", app.id, false);
        const url = URL.createObjectURL(blob);
        const isPdf = contentType.includes("pdf") || (app.cv_nombre || "").toLowerCase().endsWith(".pdf");
        setCvModal({
          title: `${app.nombre} — ${app.cv_nombre || "Hoja de Vida"}`,
          blobUrl: isPdf ? url : null,
          isPdf,
          textPreview: app.cv_texto_preview || "Archivo disponible para descarga directa.",
        });
      } else {
        setCvModal({
          title: `${app.nombre} — ${app.cv_nombre || "Hoja de Vida"}`,
          blobUrl: null,
          isPdf: false,
          textPreview: app.cv_texto_preview || "No hay vista previa de texto disponible.",
        });
      }
    } catch (err: any) {
      onError(err?.message || "No se pudo abrir el visor de CV.");
    } finally {
      setIsLoadingCV(false);
    }
  };

  const handleDownloadCV = async (app: CompanyApplicantItem) => {
    if (!app.tiene_cv_archivo) return;
    try {
      const { blob } = await apiFetchCompanyCVBlob("applicant", app.id, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = app.cv_nombre || `CV_${app.nombre}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err: any) {
      onError(err?.message || "No se pudo descargar la Hoja de Vida.");
    }
  };

  const handleInviteInterview = async (app: CompanyApplicantItem) => {
    if (!app.usuario_id) return;
    setIsSendingInvite(true);
    try {
      const res = await apiNotifyCandidateInterest({
        usuario_id: app.usuario_id,
        vacante_id: app.vacante_id,
        tipo: "invitacion_entrevista",
        mensaje: `Hola ${app.nombre}, en ${companyName} revisamos tu postulación para ${app.vacante_titulo} y queremos citarte a entrevista. Pronto te contactaremos por WhatsApp o correo.`,
      });
      onNotificationSent(res.mensaje);
    } catch (err: any) {
      onError(err?.message || "No se pudo enviar la citación a entrevista.");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const whatsappUrl = activeApplicant
    ? buildWhatsAppColombiaUrl(
        activeApplicant.telefono,
        `Hola ${activeApplicant.nombre}, te contactamos de ${companyName} respecto a tu postulación para el cargo ${activeApplicant.vacante_titulo}.`
      )
    : null;

  const mailtoUrl = activeApplicant
    ? `mailto:${activeApplicant.email}?subject=${encodeURIComponent(
        `Proceso de selección: ${activeApplicant.vacante_titulo} — ${companyName}`
      )}&body=${encodeURIComponent(
        `Hola ${activeApplicant.nombre},\n\nRevisamos tu perfil en PrepIA para la vacante ${activeApplicant.vacante_titulo} en ${companyName} y nos gustaría avanzar contigo.\n\nSaludos.`
      )}`
    : "#";

  return (
    <div className="space-y-4">
      {/* Barra de filtros ATS + Acciones masivas de IA */}
      <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-3">
        <div className="grid sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, correo, ciudad o habilidad..."
              className="pl-9 dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
          <div className="sm:col-span-4">
            <select
              value={vacancyFilter}
              onChange={(e) => setVacancyFilter(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            >
              <option value="todas">Todas las vacantes ({applicants.length})</option>
              {vacancies.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.titulo} ({v.total_postulados})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            >
              <option value="todas">Todas las etapas</option>
              {ATS_ETAPAS_CO.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isAnalyzingBatch || !targetVacancyIdForBatch}
              onClick={handleAnalyzePendingBatch}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Brain className={`w-3.5 h-3.5 mr-1.5 ${isAnalyzingBatch ? "animate-pulse" : ""}`} />
              {isAnalyzingBatch ? "Analizando con Gemini..." : "Analizar pendientes con IA"}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isComparing || compareIds.length < 2}
              onClick={handleCompareSelected}
              className="text-xs font-semibold dark:border-slate-700 cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              {isComparing
                ? "Comparando..."
                : `Comparar seleccionados con IA (${compareIds.length}/5)`}
            </Button>

            {compareIds.length > 0 && (
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Limpiar selección
              </button>
            )}
          </div>

          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Marca 2 a 5 candidatos de la misma vacante para comparar con Gemini.
          </p>
        </div>
      </Card>

      {filteredApplicants.length === 0 ? (
        <Card className="p-10 text-center bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            No hay postulantes que coincidan con los filtros seleccionados.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Ranking Izquierda */}
          <div className="lg:col-span-5 space-y-2.5 lg:max-h-[820px] lg:overflow-y-auto pr-0.5">
            <div className="px-1 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
              <span>Ordenados por mayor Match IA</span>
              <span>{filteredApplicants.length} candidatos</span>
            </div>

            {filteredApplicants.map((app, index) => {
              const isSelected = activeApplicant?.id === app.id;
              const isChecked = compareIds.includes(app.id);
              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedId(app.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-green-50/70 dark:bg-emerald-950/30 border-green-400 dark:border-emerald-700 border-l-4 border-l-green-600 shadow-sm"
                      : "bg-white dark:bg-[#141d33] border-gray-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => handleToggleCompare(app)}
                        title="Seleccionar para comparar con IA"
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-gray-400">#{index + 1}</span>
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {app.nombre}
                          </h4>
                          {!app.revisado_por_empresa && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-semibold">
                              Sin revisar
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                          {app.vacante_titulo} · {app.ciudad}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <Badge className="bg-emerald-600 text-white font-bold text-xs">
                        {app.cv_score !== null ? `${Math.round(app.cv_score)}%` : "—"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-1.5 mt-3 pl-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className={`text-[10px] border-0 ${getStageBadgeClass(app.etapa_seleccion)}`}>
                        {app.etapa_label}
                      </Badge>
                      <ProviderBadge provider={app.proveedor_ia} />
                    </div>
                    {app.calificacion_reclutador ? (
                      <span className="inline-flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {app.calificacion_reclutador}/5
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detalle ATS Derecha */}
          <div className="lg:col-span-7 lg:sticky lg:top-20">
            {activeApplicant && (
              <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-5">
                {/* Datos del candidato */}
                <div className="flex items-start justify-between flex-wrap gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {activeApplicant.nombre}
                      </h3>
                      <Badge className={`text-xs border-0 ${getStageBadgeClass(activeApplicant.etapa_seleccion)}`}>
                        {activeApplicant.etapa_label}
                      </Badge>
                      <ProviderBadge provider={activeApplicant.proveedor_ia} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Postulado a <strong className="text-gray-800 dark:text-slate-200">{activeApplicant.vacante_titulo}</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600 dark:text-slate-300 mt-2.5">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {activeApplicant.email}
                      </span>
                      {activeApplicant.telefono && (
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                          {activeApplicant.telefono}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {activeApplicant.ciudad}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        {activeApplicant.nivel_experiencia}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                        {activeApplicant.nivel_educativo}
                      </span>
                    </div>

                    {(activeApplicant.linkedin_url || activeApplicant.github_url) && (
                      <div className="flex flex-wrap gap-3 mt-2 text-xs">
                        {activeApplicant.linkedin_url && (
                          <a
                            href={activeApplicant.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#0066CC] hover:underline"
                          >
                            LinkedIn <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {activeApplicant.github_url && (
                          <a
                            href={activeApplicant.github_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#0066CC] hover:underline"
                          >
                            GitHub <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Match Ring / Score */}
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-center min-w-[120px]">
                    <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">
                      Afinidad ({activeApplicant.proveedor_ia === "gemini" ? "Gemini IA" : "Local"})
                    </p>
                    <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {activeApplicant.cv_score !== null ? `${Math.round(activeApplicant.cv_score)}%` : "—"}
                    </p>
                    {activeApplicant.experiencia_anios !== null && (
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-200">
                        ~{activeApplicant.experiencia_anios} años exp.
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones rápidas de IA, contacto y CV */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isAnalyzingSingle}
                    onClick={handleAnalyzeSingle}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isAnalyzingSingle ? "animate-spin" : ""}`} />
                    {isAnalyzingSingle ? "Analizando con Gemini..." : "Analizar / Re-analizar con IA"}
                  </Button>

                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp (+57)
                    </a>
                  )}
                  <a
                    href={mailtoUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-semibold"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Correo
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSendingInvite}
                    onClick={() => handleInviteInterview(activeApplicant)}
                    className="text-xs dark:border-slate-700"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                    {isSendingInvite ? "Enviando..." : "Citar a Entrevista"}
                  </Button>
                  {activeApplicant.tiene_cv && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isLoadingCV}
                      onClick={() => handleViewCV(activeApplicant)}
                      className="text-xs dark:border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Ver CV
                    </Button>
                  )}
                  {activeApplicant.tiene_cv_archivo && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadCV(activeApplicant)}
                      className="text-xs dark:border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Descargar CV
                    </Button>
                  )}
                </div>

                {/* Diagnóstico Gemini */}
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-900/50 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Diagnóstico para Reclutador ({activeApplicant.cv_nombre || "CV"})
                    </span>
                    <ProviderBadge provider={activeApplicant.proveedor_ia} />
                  </div>

                  {activeApplicant.resumen_ejecutivo && (
                    <p className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed">
                      {activeApplicant.resumen_ejecutivo}
                    </p>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/50">
                      <p className="font-bold text-green-900 dark:text-green-300 mb-1 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        Requisitos cumplidos
                      </p>
                      <ul className="space-y-1 text-green-950 dark:text-green-200">
                        {activeApplicant.requisitos_cumplidos.length > 0 ? (
                          activeApplicant.requisitos_cumplidos.map((item, idx) => <li key={idx}>✓ {item}</li>)
                        ) : (
                          <li>Sin coincidencias registradas</li>
                        )}
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                      <p className="font-bold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Brechas / Faltantes
                      </p>
                      <ul className="space-y-1 text-amber-950 dark:text-amber-200">
                        {activeApplicant.requisitos_faltantes.length > 0 ? (
                          activeApplicant.requisitos_faltantes.map((item, idx) => <li key={idx}>• {item}</li>)
                        ) : (
                          <li>No se detectaron brechas críticas</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Preguntas recomendadas para entrevista */}
                  {activeApplicant.preguntas_entrevista && activeApplicant.preguntas_entrevista.length > 0 && (
                    <div className="p-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/35 border border-indigo-200 dark:border-indigo-900/50">
                      <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1.5 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                        Preguntas recomendadas para entrevista (según brechas del CV)
                      </p>
                      <ul className="space-y-1 text-xs text-indigo-950 dark:text-indigo-200">
                        {activeApplicant.preguntas_entrevista.map((q, idx) => (
                          <li key={idx}>
                            {idx + 1}. {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Respuestas a Preguntas Filtro */}
                {activeApplicant.respuestas_filtro && activeApplicant.respuestas_filtro.length > 0 && (
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Respuestas a Preguntas Filtro
                    </h4>
                    <div className="space-y-2">
                      {activeApplicant.respuestas_filtro.map((rf, idx) => (
                        <div key={idx} className="text-xs">
                          <p className="font-semibold text-gray-800 dark:text-slate-200">{rf.pregunta}</p>
                          <p className="text-gray-600 dark:text-slate-400 mt-0.5">{rf.respuesta || "Sin respuesta"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pipeline ATS + Estrellas + Notas privadas */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/40 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-green-600" />
                      Seguimiento y Pipeline de Selección
                    </h4>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 mr-1">Calificación:</span>
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setDraftRating(starVal)}
                          className="p-0.5 cursor-pointer"
                          title={`${starVal} estrellas`}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              starVal <= draftRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-gray-300 dark:text-slate-600"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Etapa del candidato</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ATS_ETAPAS_CO.map((st) => (
                        <button
                          key={st.value}
                          type="button"
                          onClick={() => setDraftStage(st.value)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            draftStage === st.value
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300"
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Notas internas privadas de la empresa
                    </label>
                    <Textarea
                      rows={3}
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Observaciones de entrevista, disponibilidad, expectativa salarial, comentarios del equipo..."
                      className="dark:bg-slate-900 dark:border-slate-700 text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyCandidate}
                        onChange={(e) => setNotifyCandidate(e.target.checked)}
                      />
                      Notificar automáticamente al candidato si cambia de etapa
                    </label>

                    <Button
                      type="button"
                      disabled={isSavingATS}
                      onClick={() => handleSaveATS()}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {isSavingATS ? "Guardando..." : "Guardar Seguimiento"}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modal Comparación IA */}
      {comparisonResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Comparación IA — {comparisonResult.vacante_titulo}
                  </h3>
                  <ProviderBadge provider={comparisonResult.proveedor_usado} />
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Evaluación comparativa de los {comparisonResult.ranking.length} candidatos seleccionados.
                </p>
              </div>
              <button type="button" onClick={() => setComparisonResult(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                <p className="text-xs font-bold uppercase text-blue-900 dark:text-blue-300 mb-1">Resumen Comparativo</p>
                <p className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed">
                  {comparisonResult.resumen_comparativo}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <p className="text-xs font-bold uppercase text-emerald-900 dark:text-emerald-300 mb-1">
                  Recomendación de Contratación
                </p>
                <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                  {comparisonResult.recomendacion_contratacion}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {comparisonResult.ranking.map((item, idx) => (
                <Card key={item.postulacion_id} className="p-4 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">#{idx + 1}</span>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white inline ml-2">{item.nombre}</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        ~{item.experiencia_anios} años de experiencia
                      </p>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-bold">{Math.round(item.puntaje_afinidad)}%</Badge>
                  </div>

                  <div className="text-xs">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Fortalezas:</p>
                    <ul className="space-y-0.5 text-gray-700 dark:text-slate-300">
                      {item.fortalezas.map((f, i) => <li key={i}>✓ {f}</li>)}
                    </ul>
                  </div>

                  <div className="text-xs">
                    <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">Riesgos / Brechas:</p>
                    <ul className="space-y-0.5 text-gray-700 dark:text-slate-300">
                      {item.riesgos_brechas.map((r, i) => <li key={i}>• {r}</li>)}
                    </ul>
                  </div>

                  <div className="text-xs">
                    <p className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Preguntas sugeridas:</p>
                    <ul className="space-y-0.5 text-gray-700 dark:text-slate-300">
                      {item.preguntas_entrevista.map((q, i) => <li key={i}>{i + 1}. {q}</li>)}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Visor modal de Hoja de Vida */}
      {cvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{cvModal.title}</h3>
              <button
                type="button"
                onClick={() => {
                  if (cvModal.blobUrl) URL.revokeObjectURL(cvModal.blobUrl);
                  setCvModal(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {cvModal.isPdf && cvModal.blobUrl ? (
              <iframe
                src={cvModal.blobUrl}
                title={cvModal.title}
                className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-slate-700 bg-white"
              />
            ) : (
              <div className="overflow-y-auto max-h-[65vh] p-4 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs text-gray-800 dark:text-slate-200 whitespace-pre-wrap">
                {cvModal.textPreview}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
