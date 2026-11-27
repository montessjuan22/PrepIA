import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { JobSearchExplorer } from "../components/JobSearchExplorer";
import {
  apiApplyToVacancy,
  apiEvaluateVacancy,
  apiGetAIConsent,
  apiGetCandidateMetrics,
  apiGetUserApplications,
  apiGetVacancies,
  apiSetAIConsent,
  getCurrentUser,
  Vacancy,
  VacancyEvaluationResult,
  VacancyRespuestaFiltro,
} from "../../services/api";

export function Empleos() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [evaluation, setEvaluation] = useState<VacancyEvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [userApplications, setUserApplications] = useState<any[]>([]);
  const [hasCv, setHasCv] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [iaConsentAccepted, setIaConsentAccepted] = useState(false);
  const [isTogglingConsent, setIsTogglingConsent] = useState(false);

  useEffect(() => {
    const load = async () => {
      const vacs = await apiGetVacancies();
      setVacancies(vacs);
      if (vacs.length > 0) setSelectedVacancy(vacs[0]);

      if (currentUser?.email) {
        const [metrics, apps, consent] = await Promise.all([
          apiGetCandidateMetrics(currentUser.email),
          apiGetUserApplications(currentUser.email),
          apiGetAIConsent(currentUser.email),
        ]);
        setHasCv(Boolean(metrics.checklist?.cv_subido));
        setUserApplications(apps);
        setIaConsentAccepted(Boolean(consent.aceptado));
      }
    };
    load();
  }, [currentUser?.email]);

  const handleToggleConsent = async (aceptado: boolean) => {
    if (!currentUser?.email) {
      navigate("/login");
      return;
    }
    setIsTogglingConsent(true);
    try {
      const res = await apiSetAIConsent(aceptado, currentUser.email);
      setIaConsentAccepted(Boolean(res.aceptado));
    } finally {
      setIsTogglingConsent(false);
    }
  };

  const handleEvaluate = async (vac: Vacancy) => {
    setSelectedVacancy(vac);
    if (!currentUser?.email) {
      setApplyFeedback({
        type: "error",
        message: "Inicia sesión y sube tu Hoja de Vida para comparar tu compatibilidad con IA.",
      });
      return;
    }
    setIsEvaluating(true);
    setApplyFeedback(null);
    try {
      const res = await apiEvaluateVacancy(vac.id, currentUser.email);
      setEvaluation(res);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleApply = async (vacanteId: number, respuestasFiltro?: VacancyRespuestaFiltro[]) => {
    if (!currentUser?.email) {
      navigate("/login");
      return;
    }
    if (!hasCv) {
      setApplyFeedback({
        type: "error",
        message: "Debes subir tu Hoja de Vida en Mi Panel antes de postularte.",
      });
      return;
    }
    setIsApplying(true);
    setApplyFeedback(null);
    try {
      const res = await apiApplyToVacancy(vacanteId, currentUser.email, respuestasFiltro);
      if (res.status === "exito") {
        setApplyFeedback({ type: "success", message: res.mensaje });
        const apps = await apiGetUserApplications(currentUser.email);
        setUserApplications(apps);
      } else {
        setApplyFeedback({ type: "error", message: res.mensaje });
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Búsqueda de Vacantes
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            Explora ofertas reales registradas en PrepIA, filtra por cargo, ciudad o modalidad y postúlate con análisis de IA.
          </p>
        </div>

        <JobSearchExplorer
          vacancies={vacancies}
          userApplications={userApplications}
          hasCv={hasCv}
          selectedVacancy={selectedVacancy}
          onSelectVacancy={(v) => {
            setSelectedVacancy(v);
            setApplyFeedback(null);
          }}
          evaluation={evaluation}
          isEvaluating={isEvaluating}
          onEvaluateVacancy={handleEvaluate}
          isApplying={isApplying}
          onApplyToVacancy={handleApply}
          applyFeedback={applyFeedback}
          onGoToUploadCv={() => navigate("/dashboard/candidate")}
          iaConsentAccepted={iaConsentAccepted}
          isTogglingConsent={isTogglingConsent}
          onToggleAIConsent={currentUser?.email ? handleToggleConsent : undefined}
        />
      </div>
    </div>
  );
}
