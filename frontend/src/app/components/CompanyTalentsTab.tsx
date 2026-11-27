import { useState, useMemo, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  apiEvaluateTalentMatchWithAI,
  apiFetchCompanyCVBlob,
  CompanyTalentItem,
  CompanyVacancyItem,
  TalentAIMatchResult,
} from "../../services/api";
import { buildWhatsAppColombiaUrl, NIVELES_EDUCATIVOS_CO } from "../../data/colombia";
import {
  Search, Send, Mail, MessageCircle, Download, MapPin, GraduationCap,
  Briefcase, Sparkles, CheckCircle, AlertTriangle
} from "lucide-react";

interface CompanyTalentsTabProps {
  talents: CompanyTalentItem[];
  vacancies: CompanyVacancyItem[];
  companyName: string;
  onOpenInvite: (talent: CompanyTalentItem, defaultVacancyId?: number) => void;
  onError: (message: string) => void;
}

export function CompanyTalentsTab({
  talents,
  vacancies,
  companyName,
  onOpenInvite,
  onError,
}: CompanyTalentsTabProps) {
  const [keyword, setKeyword] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("todas");
  const [educationFilter, setEducationFilter] = useState("todos");

  const evaluableVacancies = useMemo(() => {
    const active = vacancies.filter((v) => v.estado === "abierta");
    return active.length > 0 ? active : vacancies;
  }, [vacancies]);

  const [selectedVacancyId, setSelectedVacancyId] = useState<string>("");
  const [loadingMatchId, setLoadingMatchId] = useState<number | null>(null);
  const [matchResults, setMatchResults] = useState<Record<number, TalentAIMatchResult>>({});

  useEffect(() => {
    if (!selectedVacancyId && evaluableVacancies.length > 0) {
      setSelectedVacancyId(String(evaluableVacancies[0].id));
    }
  }, [evaluableVacancies, selectedVacancyId]);

  const filteredTalents = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const c = cityFilter.trim().toLowerCase();
    return talents.filter((t) => {
      if (q) {
        const hay = [
          t.nombre,
          t.email,
          t.especialidad,
          ...(t.habilidades || []),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (c && !(t.ciudad || "").toLowerCase().includes(c)) {
        return false;
      }
      if (experienceFilter !== "todas") {
        if (!(t.nivel_experiencia || "").toLowerCase().includes(experienceFilter)) return false;
      }
      if (educationFilter !== "todos") {
        if ((t.nivel_educativo || "").toLowerCase() !== educationFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [talents, keyword, cityFilter, experienceFilter, educationFilter]);

  const handleEvaluateMatch = async (talent: CompanyTalentItem) => {
    if (!selectedVacancyId) {
      onError("Primero crea o selecciona una vacante para evaluar la afinidad con IA.");
      return;
    }
    setLoadingMatchId(talent.usuario_id);
    try {
      const res = await apiEvaluateTalentMatchWithAI(talent.usuario_id, Number(selectedVacancyId));
      setMatchResults((prev) => ({ ...prev, [talent.usuario_id]: res.match }));
    } catch (err: any) {
      onError(err?.message || "No se pudo evaluar la afinidad del candidato con IA.");
    } finally {
      setLoadingMatchId(null);
    }
  };

  const handleDownloadTalentCV = async (t: CompanyTalentItem) => {
    if (!t.tiene_cv_archivo) return;
    try {
      const { blob } = await apiFetchCompanyCVBlob("talent", t.usuario_id, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = t.cv_nombre || `CV_${t.nombre}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err: any) {
      onError(err?.message || "No se pudo descargar el CV del candidato.");
    }
  };

  return (
    <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Buscador de Talento ({filteredTalents.length})
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Filtra candidatos registrados, evalúa su afinidad con IA contra una de tus vacantes e invítalos a postularse.
          </p>
        </div>

        <div className="min-w-[260px]">
          <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
            Vacante para evaluar afinidad con IA
          </label>
          <select
            value={selectedVacancyId}
            onChange={(e) => {
              setSelectedVacancyId(e.target.value);
              setMatchResults({});
            }}
            className="w-full h-9 rounded-lg border border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-slate-900 px-3 text-xs font-medium"
          >
            {evaluableVacancies.length === 0 ? (
              <option value="">No hay vacantes registradas</option>
            ) : (
              evaluableVacancies.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.titulo} ({v.estado})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Filtros Buscar Talento */}
      <div className="grid sm:grid-cols-12 gap-3">
        <div className="sm:col-span-4 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Palabra clave, rol o habilidad..."
            className="pl-9 dark:bg-slate-900 dark:border-slate-700"
          />
        </div>
        <div className="sm:col-span-3 relative">
          <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Ciudad / Departamento..."
            className="pl-9 dark:bg-slate-900 dark:border-slate-700"
          />
        </div>
        <div className="sm:col-span-3">
          <select
            value={experienceFilter}
            onChange={(e) => setExperienceFilter(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
          >
            <option value="todas">Experiencia: Todas</option>
            <option value="junior">Junior / Sin experiencia</option>
            <option value="1">1 - 3 años / Semi-Senior</option>
            <option value="senior">Senior / +3 años</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <select
            value={educationFilter}
            onChange={(e) => setEducationFilter(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
          >
            <option value="todos">Educación: Todas</option>
            {NIVELES_EDUCATIVOS_CO.filter((e) => e !== "No requerido").map((ed) => (
              <option key={ed} value={ed}>
                {ed}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredTalents.length === 0 ? (
        <p className="text-center text-sm text-gray-500 dark:text-slate-400 py-8">
          No hay candidatos que coincidan con los filtros actuales.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredTalents.map((t) => {
            const waUrl = buildWhatsAppColombiaUrl(
              t.telefono,
              `Hola ${t.nombre}, te escribimos de ${companyName}. Vimos tu perfil en PrepIA y nos interesa invitarte a nuestras vacantes.`
            );
            const mailUrl = `mailto:${t.email}?subject=${encodeURIComponent(
              `Oportunidad laboral en ${companyName}`
            )}&body=${encodeURIComponent(
              `Hola ${t.nombre},\n\nVimos tu perfil en PrepIA y nos gustaría invitarte a postularte en ${companyName}.`
            )}`;
            const matchDiag = matchResults[t.usuario_id];
            const isEvaluating = loadingMatchId === t.usuario_id;

            return (
              <div
                key={t.usuario_id}
                className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-gray-50/50 dark:bg-slate-900/40"
              >
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-base text-gray-900 dark:text-white">{t.nombre}</h4>
                      <Badge variant="outline" className="text-xs dark:border-slate-700">
                        <Briefcase className="w-3 h-3 mr-1" />
                        {t.nivel_experiencia}
                      </Badge>
                      {t.nivel_educativo && t.nivel_educativo !== "No especificado" && (
                        <Badge variant="outline" className="text-xs dark:border-slate-700">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {t.nivel_educativo}
                        </Badge>
                      )}
                      {t.ya_notificado && (
                        <Badge className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs">
                          Notificado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {t.email} · {t.especialidad} · {t.ciudad}
                    </p>
                    {t.habilidades && t.habilidades.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {t.habilidades.slice(0, 8).map((sk) => (
                          <Badge key={sk} variant="outline" className="text-[10px] dark:border-slate-700">
                            {sk}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {t.cv_score !== null && (
                      <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 mr-1">
                        CV: {t.cv_score}/100
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isEvaluating || !selectedVacancyId || !t.cv_nombre}
                      onClick={() => handleEvaluateMatch(t)}
                      className="text-xs border-indigo-300 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300 cursor-pointer"
                    >
                      <Sparkles className={`w-3.5 h-3.5 mr-1 ${isEvaluating ? "animate-spin" : ""}`} />
                      {isEvaluating ? "Evaluando..." : "Evaluar afinidad con IA"}
                    </Button>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    )}
                    <a
                      href={mailUrl}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Correo
                    </a>
                    {t.tiene_cv_archivo && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadTalentCV(t)}
                        className="text-xs dark:border-slate-700"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        CV
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() =>
                        onOpenInvite(t, selectedVacancyId ? Number(selectedVacancyId) : undefined)
                      }
                      className="bg-green-600 hover:bg-green-700 text-white text-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Invitar a Vacante
                    </Button>
                  </div>
                </div>

                {/* Resultado Match rápido IA */}
                {matchDiag && (
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-900/50 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Afinidad con "{matchDiag.vacante_titulo}" (
                        {matchDiag.proveedor_usado === "gemini" ? "Gemini IA" : "Motor Local"})
                      </span>
                      <Badge className="bg-emerald-600 text-white font-bold text-xs">
                        {Math.round(matchDiag.puntaje_afinidad)}% de Match · ~{matchDiag.experiencia_anios} años exp.
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-800 dark:text-slate-200">{matchDiag.resumen_ejecutivo}</p>
                    <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mb-0.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Cumple:
                        </p>
                        <p className="text-gray-700 dark:text-slate-300">
                          {matchDiag.requisitos_cumplidos.join(", ") || "Sin coincidencias directas"}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 mb-0.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Faltantes / Por validar:
                        </p>
                        <p className="text-gray-700 dark:text-slate-300">
                          {matchDiag.requisitos_faltantes.join(", ") || "Ninguna brecha crítica"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
