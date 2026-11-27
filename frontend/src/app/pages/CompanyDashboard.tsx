import { useState, useEffect, useCallback } from "react";
import { Navbar } from "../components/Navbar";
import { CompanyProfileTab } from "../components/CompanyProfileTab";
import { CompanyApplicantsTab } from "../components/CompanyApplicantsTab";
import { CompanyTalentsTab } from "../components/CompanyTalentsTab";
import { VacancyFormModal } from "../components/VacancyFormModal";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  apiChangeCompanyVacancyStatus,
  apiCreateCompanyVacancy,
  apiDeleteCompanyVacancy,
  apiGetCompanyOverview,
  apiNotifyCandidateInterest,
  apiUpdateCompanyVacancy,
  CompanyApplicantItem,
  CompanyOverviewResponse,
  CompanyProfile,
  CompanyTalentItem,
  CompanyVacancyItem,
  CompanyVacancyPayload,
  getCurrentUser,
} from "../../services/api";
import {
  Building2, Plus, Users, Briefcase, CheckCircle, Trash2,
  Clock, AlertCircle, X, XCircle, RefreshCw, Edit3, ShieldCheck,
  PauseCircle, PlayCircle, Lock, UserCheck
} from "lucide-react";

export function CompanyDashboard() {
  const [activeTab, setActiveTab] = useState("jobs");
  const [overview, setOverview] = useState<CompanyOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal de Nueva Vacante / Editar Vacante
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<CompanyVacancyItem | null>(null);
  const [isSubmittingVacancy, setIsSubmittingVacancy] = useState(false);

  // Modal Mostrar Interés / Invitar a Vacante
  const [interestTarget, setInterestTarget] = useState<CompanyTalentItem | null>(null);
  const [interestVacanteId, setInterestVacanteId] = useState<string>("");
  const [interestMessage, setInterestMessage] = useState("");
  const [isSendingInterest, setIsSendingInterest] = useState(false);

  const currentUser = getCurrentUser();
  const isSuperAdmin = Boolean(currentUser?.rol === "admin" && currentUser?.es_admin_principal);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);

  const loadOverview = useCallback(async (overrideEmpresaId?: number | null) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const targetId = overrideEmpresaId !== undefined ? overrideEmpresaId : selectedEmpresaId;
      const data = await apiGetCompanyOverview(targetId);
      setOverview(data);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo cargar la información de la empresa.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmpresaId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleOpenCreateVacancy = () => {
    setEditingVacancy(null);
    setIsVacancyModalOpen(true);
  };

  const handleOpenEditVacancy = (job: CompanyVacancyItem) => {
    setEditingVacancy(job);
    setIsVacancyModalOpen(true);
  };

  const handleSaveVacancy = async (payload: CompanyVacancyPayload, editingId: number | null) => {
    setIsSubmittingVacancy(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = editingId
        ? await apiUpdateCompanyVacancy(editingId, payload)
        : await apiCreateCompanyVacancy({
            ...payload,
            empresa_id: payload.empresa_id ?? selectedEmpresaId ?? empresa?.id ?? undefined,
          });
      setIsVacancyModalOpen(false);
      setEditingVacancy(null);
      setSuccessMsg(res.mensaje);
      setActiveTab("jobs");
      await loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error al guardar la vacante.");
    } finally {
      setIsSubmittingVacancy(false);
    }
  };

  const handleVacancyStatusChange = async (
    vacanteId: number,
    newEstado: "abierta" | "pausada" | "cerrada",
    titulo: string
  ) => {
    if (newEstado === "cerrada" && !confirm(`¿Deseas cerrar definitivamente la vacante "${titulo}"?`)) {
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await apiChangeCompanyVacancyStatus(vacanteId, newEstado);
      setSuccessMsg(res.mensaje);
      await loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo cambiar el estado de la vacante.");
    }
  };

  const handleDeleteVacancy = async (vacanteId: number, vacTitulo: string) => {
    if (!confirm(`¿Deseas eliminar la vacante "${vacTitulo}"?`)) return;
    setErrorMsg("");
    try {
      await apiDeleteCompanyVacancy(vacanteId);
      setSuccessMsg(`Vacante "${vacTitulo}" eliminada.`);
      await loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo eliminar la vacante.");
    }
  };

  const handleProfileSaved = (updatedEmpresa: CompanyProfile, message: string) => {
    setOverview((prev) => (prev ? { ...prev, empresa: updatedEmpresa } : prev));
    setSuccessMsg(message);
  };

  const handleApplicantUpdated = (updated: CompanyApplicantItem, message: string) => {
    setOverview((prev) => {
      if (!prev) return prev;
      const nextApplicants = prev.applicants.map((a) => (a.id === updated.id ? updated : a));
      return {
        ...prev,
        applicants: nextApplicants,
        stats: {
          ...prev.stats,
          unreviewed_applicants: nextApplicants.filter((a) => !a.revisado_por_empresa).length,
        },
      };
    });
    setSuccessMsg(message);
  };

  const handleBatchApplicantsUpdated = (updatedList: CompanyApplicantItem[], message: string) => {
    setOverview((prev) => {
      if (!prev) return prev;
      const map = new Map(updatedList.map((u) => [u.id, u]));
      const nextApplicants = prev.applicants.map((a) => map.get(a.id) ?? a);
      return {
        ...prev,
        applicants: nextApplicants,
        stats: {
          ...prev.stats,
          unreviewed_applicants: nextApplicants.filter((a) => !a.revisado_por_empresa).length,
        },
      };
    });
    setSuccessMsg(message);
  };

  const empresa = overview?.empresa ?? null;
  const companyName = empresa?.nombre_comercial || empresa?.nombre || currentUser?.nombre || "Panel de Empresa";
  const companyEmail = currentUser?.email || "";
  const vacancies = overview?.vacancies ?? [];
  const openVacancies = vacancies.filter((v) => v.estado === "abierta");
  const applicants = overview?.applicants ?? [];
  const talents = overview?.talents ?? [];
  const stats = overview?.stats;
  const profileCompletion = empresa?.completitud ?? 0;

  const handleOpenInterest = (talent: CompanyTalentItem, defaultVacancyId?: number) => {
    setInterestTarget(talent);
    const chosenId = defaultVacancyId
      ? String(defaultVacancyId)
      : openVacancies.length > 0
        ? String(openVacancies[0].id)
        : "";
    setInterestVacanteId(chosenId);
    setInterestMessage(
      `Hola ${talent.nombre}, revisamos tu perfil en PrepIA y nos interesa invitarte a postularte en ${companyName}.`
    );
  };

  const handleSendInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interestTarget) return;
    setIsSendingInterest(true);
    setErrorMsg("");
    try {
      const res = await apiNotifyCandidateInterest({
        usuario_id: interestTarget.usuario_id,
        vacante_id: interestVacanteId ? Number(interestVacanteId) : null,
        mensaje: interestMessage.trim() || undefined,
      });
      setInterestTarget(null);
      setSuccessMsg(res.mensaje);
      await loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo enviar la notificación.");
    } finally {
      setIsSendingInterest(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-green-500/20 overflow-hidden shrink-0">
                {empresa?.logo_url ? (
                  <img src={empresa.logo_url} alt={companyName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{companyName}</h1>
                <p className="text-gray-600 dark:text-slate-300 font-medium text-sm mt-0.5">
                  {companyEmail}
                  {empresa?.sector ? ` · ${empresa.sector}` : ""}
                  {empresa?.nit ? ` · NIT ${empresa.nit}${empresa.digito_verificacion ? `-${empresa.digito_verificacion}` : ""}` : ""}
                  {empresa?.ciudad ? ` · ${empresa.ciudad}` : ""}
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <Badge className="bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-xs">
                    {isSuperAdmin ? "Superadmin · Permisos de Empresa" : "Empresa / Reclutador"}
                  </Badge>
                  {overview?.empresas_disponibles && overview.empresas_disponibles.length > 0 && currentUser?.rol === "admin" && (
                    <select
                      value={String(selectedEmpresaId ?? empresa?.id ?? "")}
                      onChange={(e) => {
                        const nextId = e.target.value ? Number(e.target.value) : null;
                        setSelectedEmpresaId(nextId);
                        loadOverview(nextId);
                      }}
                      className="h-7 rounded-full border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-gray-800 dark:text-slate-200"
                    >
                      {overview.empresas_disponibles.map((emp) => (
                        <option key={emp.id} value={String(emp.id)}>
                          Gestionando: {emp.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-pointer ${
                      profileCompletion >= 100
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Perfil empresarial: {profileCompletion}%
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => loadOverview()} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <Button
                onClick={handleOpenCreateVacancy}
                className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Vacante
              </Button>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-4 rounded-xl bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-300 text-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg("")} className="text-xs underline cursor-pointer">
                Cerrar
              </button>
            </div>
          )}

          {/* Quick Stats (4 tarjetas ATS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    Vacantes Activas
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats ? stats.active_jobs : "—"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-950/50">
                  <Briefcase className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    Pendientes de Aprobación
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats ? stats.pending_jobs : "—"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    Postulaciones Recibidas
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats ? stats.total_applicants : "—"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50">
                  <Users className="w-6 h-6 text-[#0066CC] dark:text-blue-400" />
                </div>
              </div>
            </Card>
            <Card
              onClick={() => setActiveTab("candidates")}
              className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-400 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    Candidatos Sin Revisar
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats ? stats.unreviewed_applicants : "—"}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50">
                  <UserCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="jobs">Mis Vacantes ({vacancies.length})</TabsTrigger>
            <TabsTrigger value="candidates">
              Postulantes ({applicants.length})
              {stats && stats.unreviewed_applicants > 0 ? ` · ${stats.unreviewed_applicants} nuevos` : ""}
            </TabsTrigger>
            <TabsTrigger value="talents">Buscar Talento ({talents.length})</TabsTrigger>
            <TabsTrigger value="profile">Perfil de Empresa ({profileCompletion}%)</TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Vacantes de {companyName} ({vacancies.length})
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Toda vacante nueva queda en revisión hasta ser aprobada por un administrador. Luego puedes pausarla, reactivarla o cerrarla.
                  </p>
                </div>
                <Button onClick={handleOpenCreateVacancy} className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Publicar Nueva Vacante
                </Button>
              </div>

              {vacancies.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-slate-400 py-8">
                  Aún no has publicado vacantes para esta empresa.
                </p>
              ) : (
                <div className="space-y-4">
                  {vacancies.map((job) => (
                    <div
                      key={job.id}
                      className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 bg-gray-50/50 dark:bg-slate-900/40"
                    >
                      <div className="flex justify-between items-start gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{job.titulo}</h4>
                            <Badge variant="outline" className="text-[11px] dark:border-slate-700">
                              {job.categoria_area || "General"}
                            </Badge>
                            {job.cantidad_vacantes > 1 && (
                              <Badge variant="outline" className="text-[11px] dark:border-slate-700">
                                {job.cantidad_vacantes} cupos
                              </Badge>
                            )}
                            <Badge
                              className={
                                job.estado === "abierta"
                                  ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                                  : job.estado === "pendiente_aprobacion"
                                    ? "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300"
                                    : job.estado === "pausada"
                                      ? "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300"
                                      : job.estado === "rechazada"
                                        ? "bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300"
                                        : "bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                              }
                            >
                              {job.estado === "abierta"
                                ? "Aprobada y activa"
                                : job.estado === "pendiente_aprobacion"
                                  ? "Pendiente de aprobación"
                                  : job.estado === "pausada"
                                    ? "Pausada"
                                    : job.estado === "cerrada"
                                      ? "Cerrada"
                                      : job.estado === "rechazada"
                                        ? "Rechazada"
                                        : job.estado}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-slate-300">
                            {job.ciudad} ({job.modalidad}) · {job.salario}{!job.salario_visible ? " (Oculto al público)" : ""} · {job.tipo_contrato} · {job.jornada} ·{" "}
                            <strong className="text-gray-900 dark:text-white">{job.total_postulados} postulados</strong>
                            {job.preguntas_filtro && job.preguntas_filtro.length > 0
                              ? ` · ${job.preguntas_filtro.length} preguntas filtro`
                              : ""}
                          </p>
                        </div>

                        <div className="flex items-center flex-wrap gap-1.5">
                          {job.estado === "abierta" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVacancyStatusChange(job.id, "pausada", job.titulo)}
                              className="text-xs dark:border-slate-700"
                              title="Pausar vacante"
                            >
                              <PauseCircle className="w-4 h-4 mr-1 text-amber-500" />
                              Pausar
                            </Button>
                          )}
                          {job.estado === "pausada" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVacancyStatusChange(job.id, "abierta", job.titulo)}
                              className="text-xs dark:border-slate-700"
                              title="Reactivar vacante"
                            >
                              <PlayCircle className="w-4 h-4 mr-1 text-emerald-500" />
                              Reactivar
                            </Button>
                          )}
                          {(job.estado === "abierta" || job.estado === "pausada") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVacancyStatusChange(job.id, "cerrada", job.titulo)}
                              className="text-xs dark:border-slate-700"
                              title="Cerrar vacante"
                            >
                              <Lock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              Cerrar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditVacancy(job)}
                            className="dark:border-slate-700"
                            title="Editar vacante"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteVacancy(job.id, job.titulo)}
                            className="text-red-600 hover:text-red-700 dark:border-slate-700"
                            title="Eliminar vacante"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-slate-300">{job.descripcion}</p>

                      {job.habilidades_clave && job.habilidades_clave.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {job.habilidades_clave.map((sk) => (
                            <Badge key={sk} variant="outline" className="text-[11px] dark:border-slate-700">
                              {sk}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {job.estado === "rechazada" && job.motivo_rechazo && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>
                            <strong>Motivo de rechazo del admin:</strong> {job.motivo_rechazo}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Candidates Tab (ATS Ranking + Pipeline + Notas + Gemini) */}
          <TabsContent value="candidates">
            <CompanyApplicantsTab
              applicants={applicants}
              vacancies={vacancies}
              companyName={companyName}
              onApplicantUpdated={handleApplicantUpdated}
              onBatchApplicantsUpdated={handleBatchApplicantsUpdated}
              onNotificationSent={(msg) => setSuccessMsg(msg)}
              onError={(msg) => setErrorMsg(msg)}
            />
          </TabsContent>

          {/* Talents Tab (Buscador de Talento con filtros + IA Match + WhatsApp/Correo/CV) */}
          <TabsContent value="talents">
            <CompanyTalentsTab
              talents={talents}
              vacancies={vacancies}
              companyName={companyName}
              onOpenInvite={handleOpenInterest}
              onError={(msg) => setErrorMsg(msg)}
            />
          </TabsContent>

          {/* Company Profile Tab (Colombia) */}
          <TabsContent value="profile">
            <CompanyProfileTab
              empresa={empresa}
              defaultEmail={companyEmail}
              onProfileSaved={handleProfileSaved}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Mostrar Interés */}
      {interestTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Invitar a {interestTarget.nombre}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  El candidato recibirá una notificación y podrá desplegar la información y postularse.
                </p>
              </div>
              <button onClick={() => setInterestTarget(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInterest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Vacante asociada (opcional)</label>
                <select
                  value={interestVacanteId}
                  onChange={(e) => setInterestVacanteId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                >
                  <option value="">Interés general (mostrar vacantes abiertas de la empresa)</option>
                  {openVacancies.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.titulo} ({v.modalidad})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Mensaje para el candidato</label>
                <Textarea
                  rows={3}
                  value={interestMessage}
                  onChange={(e) => setInterestMessage(e.target.value)}
                  className="dark:bg-slate-900 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setInterestTarget(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSendingInterest} className="bg-green-600 hover:bg-green-700 text-white">
                  {isSendingInterest ? "Enviando..." : "Enviar Invitación"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Crear / Editar Vacante */}
      <VacancyFormModal
        open={isVacancyModalOpen}
        editingVacancy={editingVacancy}
        defaultDepartamento={empresa?.departamento || "Bogotá D.C."}
        defaultCiudad={empresa?.ciudad || "Bogotá"}
        companyOptions={isSuperAdmin ? overview?.empresas_disponibles : undefined}
        defaultEmpresaId={selectedEmpresaId ?? empresa?.id ?? null}
        directPublish={isSuperAdmin}
        isSubmitting={isSubmittingVacancy}
        onClose={() => {
          setIsVacancyModalOpen(false);
          setEditingVacancy(null);
        }}
        onSubmit={handleSaveVacancy}
      />
    </div>
  );
}
