import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { SupportTicketsPanel } from "../components/SupportTicketsPanel";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  apiCreateAdminCategory,
  apiCreateAdminResource,
  apiDeleteAdminCategory,
  apiDeleteAdminResource,
  apiDeleteAdminUser,
  apiGetAdminOverview,
  apiReviewAdminVacancy,
  apiUpdateUserRole,
  apiUpdateUserStatus,
  AdminCategoryItem,
  AdminEmpresaItem,
  AdminOverviewResponse,
  AdminUserItem,
  AdminVacancyItem,
  PreparationResource,
  SystemRole,
} from "../../services/api";
import {
  Shield, Users, Building2, Briefcase, Search,
  Trash2, UserCheck, Ban, TrendingUp, Settings, User,
  Crown, RefreshCw, AlertCircle, Plus, KeyRound, Lock, UserMinus,
  CheckCircle, XCircle, Clock, MapPin, Banknote, ChevronLeft, ChevronRight,
  BookOpen, Upload, ExternalLink, Headphones
} from "lucide-react";

const ROLE_LABELS: Record<SystemRole, string> = {
  usuario: "Candidato",
  reclutador: "Empresa",
  admin: "Administrador",
  agente_soporte: "Agente de Soporte",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserType, setSelectedUserType] = useState("Todos");

  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  // Estado para la sección dedicada "Roles y Permisos"
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>("");
  const [selectedTargetRole, setSelectedTargetRole] = useState<SystemRole>("reclutador");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("auto");
  const [newEmpresaNombre, setNewEmpresaNombre] = useState("");
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Estado para crear categorías reales
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Estado para aprobación de empleos subidos por empresas
  const [vacancyFilter, setVacancyFilter] = useState<string>("todas");
  const [busyVacancyId, setBusyVacancyId] = useState<number | null>(null);
  const [rejectingVacancyId, setRejectingVacancyId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Estado para publicar material real de preparación
  const [resTitle, setResTitle] = useState("");
  const [resCategory, setResCategory] = useState<PreparationResource["categoria"]>("Guías de Estudio");
  const [resType, setResType] = useState("PDF");
  const [resDesc, setResDesc] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [resFile, setResFile] = useState<File | null>(null);
  const [isUploadingRes, setIsUploadingRes] = useState(false);

  // Carrusel de pestañas
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateTabScrollState = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateTabScrollState();
    window.addEventListener("resize", updateTabScrollState);
    return () => window.removeEventListener("resize", updateTabScrollState);
  }, [updateTabScrollState, overview]);

  const scrollTabs = (direction: "left" | "right") => {
    const el = tabsScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -220 : 220, behavior: "smooth" });
  };

  const showSuccess = (msg: string) => {
    setErrorMsg("");
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(""), 6000);
  };

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await apiGetAdminOverview();
      setOverview(data);

      // Seleccionar por defecto un usuario editable en el selector de Roles y Permisos
      const editableUsers = data.users.filter(
        (u) => !u.es_admin_principal && u.id !== data.current_admin.id
      );
      if (editableUsers.length > 0) {
        setSelectedTargetUserId((prev) =>
          prev && editableUsers.some((u) => String(u.id) === prev)
            ? prev
            : String(editableUsers[0].id)
        );
      } else {
        setSelectedTargetUserId("");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo cargar la información real de la base de datos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const currentAdmin = overview?.current_admin;
  const isPrimaryAdmin = Boolean(currentAdmin?.es_admin_principal);
  const usersList: AdminUserItem[] = overview?.users ?? [];
  const empresasList: AdminEmpresaItem[] = overview?.empresas ?? [];
  const categoriesList: AdminCategoryItem[] = overview?.categories ?? [];
  const vacanciesList: AdminVacancyItem[] = overview?.vacancies ?? [];
  const resourcesList: PreparationResource[] = overview?.resources ?? [];
  const stats = overview?.stats;

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim()) return;
    if (!resFile && !resUrl.trim()) {
      setErrorMsg("Adjunta un archivo real o ingresa un enlace URL para publicar el recurso.");
      return;
    }
    setIsUploadingRes(true);
    setErrorMsg("");
    try {
      const fd = new FormData();
      fd.append("titulo", resTitle.trim());
      fd.append("categoria", resCategory);
      fd.append("tipo", resType);
      fd.append("descripcion", resDesc.trim());
      if (resUrl.trim()) fd.append("url_externa", resUrl.trim());
      if (resFile) fd.append("file", resFile);
      const created = await apiCreateAdminResource(fd);
      setResTitle("");
      setResDesc("");
      setResUrl("");
      setResFile(null);
      await loadOverview();
      showSuccess(`Recurso "${created.titulo}" publicado para los candidatos.`);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo publicar el recurso.");
    } finally {
      setIsUploadingRes(false);
    }
  };

  const handleDeleteResource = async (r: PreparationResource) => {
    if (!confirm(`¿Eliminar el recurso "${r.titulo}"?`)) return;
    setErrorMsg("");
    try {
      await apiDeleteAdminResource(r.id);
      await loadOverview();
      showSuccess(`Recurso "${r.titulo}" eliminado.`);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo eliminar el recurso.");
    }
  };
  const analytics = overview?.analytics;

  const handleReviewVacancy = async (
    vacanteId: number,
    accion: "aprobar" | "rechazar" | "cerrar" | "pendiente",
    motivo?: string
  ) => {
    setBusyVacancyId(vacanteId);
    setErrorMsg("");
    try {
      await apiReviewAdminVacancy(vacanteId, accion, motivo);
      setRejectingVacancyId(null);
      setRejectReason("");
      await loadOverview();
      const actionMsg =
        accion === "aprobar"
          ? "Empleo aprobado y publicado en el portal de vacantes."
          : accion === "rechazar"
            ? "Empleo rechazado y notificado a la empresa."
            : accion === "cerrar"
              ? "Vacante cerrada."
              : "Vacante devuelta a estado pendiente.";
      showSuccess(actionMsg);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo procesar la revisión del empleo.");
    } finally {
      setBusyVacancyId(null);
    }
  };

  const editableUsers = usersList.filter(
    (u) => !u.es_admin_principal && u.id !== currentAdmin?.id
  );

  const filteredUsers = usersList.filter((user) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      user.nombre.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      (user.empresa_nombre || "").toLowerCase().includes(q);

    const matchesType =
      selectedUserType === "Todos" ||
      (selectedUserType === "Candidato" && user.rol === "usuario") ||
      (selectedUserType === "Empresa" && user.rol === "reclutador") ||
      (selectedUserType === "Admin" && user.rol === "admin") ||
      (selectedUserType === "Soporte" && user.rol === "agente_soporte") ||
      (selectedUserType === "Suspendido" && !user.activo);

    return matchesSearch && matchesType;
  });

  const handleRoleChange = async (
    userId: number,
    newRole: SystemRole,
    options?: { empresaId?: number | null; empresaNombre?: string | null }
  ) => {
    setBusyUserId(userId);
    setErrorMsg("");
    try {
      const updated = await apiUpdateUserRole(userId, {
        rol: newRole,
        empresa_id: options?.empresaId ?? null,
        empresa_nombre: options?.empresaNombre ?? null,
      });
      await loadOverview();
      showSuccess(
        `Rol actualizado: ${updated.nombre} ahora tiene el rol ${ROLE_LABELS[updated.rol]}${
          updated.empresa_nombre ? ` (${updated.empresa_nombre})` : ""
        }.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "Error al cambiar el rol del usuario.");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRoleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetUserId) return;

    setIsSubmittingRole(true);
    setErrorMsg("");
    try {
      const empresaOptions =
        selectedTargetRole === "reclutador"
          ? selectedEmpresaId === "new"
            ? { empresaNombre: newEmpresaNombre.trim() || null }
            : selectedEmpresaId !== "auto"
              ? { empresaId: Number(selectedEmpresaId) }
              : undefined
          : undefined;

      await handleRoleChange(Number(selectedTargetUserId), selectedTargetRole, empresaOptions);
      setNewEmpresaNombre("");
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleToggleStatus = async (user: AdminUserItem) => {
    setBusyUserId(user.id);
    setErrorMsg("");
    try {
      const updated = await apiUpdateUserStatus(user.id, !user.activo);
      await loadOverview();
      showSuccess(
        updated.activo
          ? `Cuenta de ${updated.nombre} reactivada.`
          : `Cuenta de ${updated.nombre} suspendida.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo cambiar el estado del usuario.");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUserItem) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente a ${user.nombre} (${user.email})?`)) {
      return;
    }
    setBusyUserId(user.id);
    setErrorMsg("");
    try {
      await apiDeleteAdminUser(user.id);
      await loadOverview();
      showSuccess(`Usuario ${user.nombre} eliminado de la base de datos.`);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo eliminar el usuario.");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    setErrorMsg("");
    try {
      const created = await apiCreateAdminCategory(newCategoryName.trim(), newCategoryDesc.trim() || undefined);
      setNewCategoryName("");
      setNewCategoryDesc("");
      await loadOverview();
      showSuccess(`Categoría "${created.nombre}" creada en PostgreSQL.`);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo crear la categoría.");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: AdminCategoryItem) => {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) return;
    setErrorMsg("");
    try {
      await apiDeleteAdminCategory(cat.id);
      await loadOverview();
      showSuccess(`Categoría "${cat.nombre}" eliminada.`);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo eliminar la categoría.");
    }
  };

  const adminUsers = usersList.filter((u) => u.rol === "admin");
  const supportUsers = usersList.filter((u) => u.rol === "agente_soporte");
  const companyUsers = usersList.filter((u) => u.rol === "reclutador");
  const candidateUsers = usersList.filter((u) => u.rol === "usuario");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-purple-500/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Panel de Administración
                </h1>
                <p className="text-gray-600 dark:text-slate-300 font-medium text-sm mt-0.5">
                  Sesión activa:{" "}
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    {currentAdmin?.nombre || "Administrador"}
                  </span>{" "}
                  ({currentAdmin?.email || "—"})
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className="bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs flex items-center gap-1">
                    {isPrimaryAdmin ? <Crown className="w-3.5 h-3.5 text-amber-500" /> : <Shield className="w-3.5 h-3.5" />}
                    {isPrimaryAdmin ? "Administrador Principal (Superadmin)" : "Administrador"}
                  </Badge>
                  {isPrimaryAdmin && (
                    <Badge className="bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs flex items-center gap-1">
                      <Headphones className="w-3.5 h-3.5" />
                      Permisos de Agente de Soporte
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                    PostgreSQL en vivo
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={loadOverview}
                disabled={isLoading}
                className="border-gray-200 dark:border-slate-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <Button
                onClick={() => setActiveTab("settings")}
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </Button>
            </div>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {errorMsg.toLowerCase().includes("autenticado") && (
                  <Link to="/login" className="underline font-semibold">
                    Iniciar sesión
                  </Link>
                )}
                <button onClick={() => setErrorMsg("")} className="text-xs underline cursor-pointer">
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {feedbackMsg && (
            <div className="mb-4 p-4 rounded-xl bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-medium">{feedbackMsg}</span>
              </div>
              <button onClick={() => setFeedbackMsg("")} className="text-xs underline cursor-pointer">
                Cerrar
              </button>
            </div>
          )}

          {stats && stats.pending_jobs > 0 && (
            <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Hay <strong>{stats.pending_jobs}</strong>{" "}
                  {stats.pending_jobs === 1 ? "empleo subido por una empresa esperando" : "empleos subidos por empresas esperando"}{" "}
                  tu aprobación para publicarse.
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setVacancyFilter("pendiente_aprobacion");
                  setActiveTab("vacancies");
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
              >
                Revisar ahora
              </Button>
            </div>
          )}

          {/* Quick Stats - Datos 100% reales de PostgreSQL */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="text-center">
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats ? stats.total_users : "—"}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Total Usuarios</p>
              </div>
            </Card>
            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="text-center">
                <UserCheck className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats ? stats.candidates : "—"}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Candidatos</p>
              </div>
            </Card>
            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="text-center">
                <Building2 className="w-8 h-8 text-green-600 dark:text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats ? stats.companies : "—"}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Empresas</p>
              </div>
            </Card>
            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="text-center">
                <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats ? stats.admins : "—"}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Admins</p>
              </div>
            </Card>
            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="text-center">
                <Briefcase className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats ? stats.total_jobs : "—"}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Vacantes</p>
              </div>
            </Card>
            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-teal-600 dark:text-teal-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats ? stats.total_applications : "—"}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Postulaciones</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6 flex items-center gap-2">
            {(canScrollLeft || canScrollRight) && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => scrollTabs("left")}
                disabled={!canScrollLeft}
                aria-label="Pestañas anteriores"
                className="h-10 w-9 shrink-0 rounded-xl border-gray-200 dark:border-slate-700 bg-white dark:bg-[#141d33] disabled:opacity-35"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}

            <div
              ref={tabsScrollRef}
              onScroll={updateTabScrollState}
              className="flex-1 min-w-0 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <TabsList className="w-max min-w-full flex-nowrap justify-start gap-1 h-11">
                <TabsTrigger value="users" className="shrink-0 whitespace-nowrap">
                  Gestión de Usuarios
                </TabsTrigger>
                <TabsTrigger value="vacancies" className="shrink-0 whitespace-nowrap gap-2">
                  Aprobación de Empleos
                  {(stats?.pending_jobs ?? 0) > 0 && (
                    <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                      {stats?.pending_jobs}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="roles" className="shrink-0 whitespace-nowrap">
                  Roles y Permisos
                </TabsTrigger>
                {isPrimaryAdmin && (
                  <TabsTrigger value="support" className="shrink-0 whitespace-nowrap gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-cyan-500" />
                    Mesa de Soporte
                  </TabsTrigger>
                )}
                <TabsTrigger value="categories" className="shrink-0 whitespace-nowrap">
                  Categorías Profesionales
                </TabsTrigger>
                <TabsTrigger value="resources" className="shrink-0 whitespace-nowrap">
                  Recursos ({resourcesList.length})
                </TabsTrigger>
                <TabsTrigger value="analytics" className="shrink-0 whitespace-nowrap">
                  Analíticas
                </TabsTrigger>
                <TabsTrigger value="settings" className="shrink-0 whitespace-nowrap">
                  Configuración
                </TabsTrigger>
              </TabsList>
            </div>

            {(canScrollLeft || canScrollRight) && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => scrollTabs("right")}
                disabled={!canScrollRight}
                aria-label="Siguientes pestañas"
                className="h-10 w-9 shrink-0 rounded-xl border-gray-200 dark:border-slate-700 bg-white dark:bg-[#141d33] disabled:opacity-35"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Users Management Tab */}
          <TabsContent value="users">
            <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
              <div className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Usuarios Inscritos en Base de Datos ({filteredUsers.length})
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("roles")}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <KeyRound className="w-4 h-4 mr-1.5" />
                    Administrar Roles
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nombre, correo o empresa..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 dark:bg-slate-900 dark:border-slate-700"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "Todos", label: "Todos" },
                      { key: "Candidato", label: "Candidatos" },
                      { key: "Empresa", label: "Empresas" },
                      { key: "Soporte", label: "Soporte" },
                      { key: "Admin", label: "Admins" },
                      { key: "Suspendido", label: "Suspendidos" },
                    ].map((f) => (
                      <Button
                        key={f.key}
                        variant={selectedUserType === f.key ? "default" : "outline"}
                        onClick={() => setSelectedUserType(f.key)}
                        size="sm"
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap">Usuario</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap">Rol</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap min-w-[170px]">Especialidad / Empresa</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap">Estado</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap">Registro</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap">Info BD</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
                          {isLoading ? "Cargando usuarios reales desde PostgreSQL..." : "No hay usuarios que coincidan con el filtro."}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const isSelf = user.id === currentAdmin?.id;
                        const isProtected = user.es_admin_principal || isSelf;
                        const isBusy = busyUserId === user.id;

                        return (
                          <tr
                            key={user.id}
                            className="border-b border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                          >
                            <td className="p-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-gray-900 dark:text-white">{user.nombre}</p>
                                  {user.es_admin_principal && (
                                    <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px]">
                                      <Crown className="w-3 h-3 mr-1" /> Principal
                                    </Badge>
                                  )}
                                  {isSelf && (
                                    <Badge variant="outline" className="text-[10px] dark:border-slate-600">
                                      Tú
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-slate-400">{user.email}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge
                                className={
                                  user.rol === "usuario"
                                    ? "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300"
                                    : user.rol === "reclutador"
                                      ? "bg-green-100 dark:bg-emerald-950/70 text-green-700 dark:text-emerald-300"
                                      : user.rol === "agente_soporte"
                                        ? "bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300"
                                        : "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300"
                                }
                              >
                                {ROLE_LABELS[user.rol]}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <span className="text-sm text-gray-700 dark:text-slate-300">
                                {user.rol === "reclutador"
                                  ? user.empresa_nombre || user.especialidad
                                  : user.especialidad}
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={user.activo ? "default" : "outline"}
                                className={
                                  user.activo
                                    ? "bg-emerald-600 text-white"
                                    : "border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                                }
                              >
                                {user.activo ? "Activo" : "Suspendido"}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <span className="text-sm text-gray-600 dark:text-slate-400">
                                {formatDate(user.created_at)}
                              </span>
                            </td>
                            <td className="p-3">
                              {user.rol === "usuario" && (
                                <div className="text-xs text-gray-700 dark:text-slate-300 space-y-0.5">
                                  <p>
                                    {user.cv_count > 0
                                      ? `CV: ${user.cv_score !== null ? `${user.cv_score}/100` : "Cargado"}`
                                      : "Sin CV"}
                                  </p>
                                  <p className="text-gray-500 dark:text-slate-400">
                                    {user.postulaciones_count} postulaciones
                                  </p>
                                </div>
                              )}
                              {user.rol === "reclutador" && (
                                <span className="text-sm text-gray-700 dark:text-slate-300">
                                  {user.vacantes_count} vacantes
                                </span>
                              )}
                              {user.rol === "admin" && (
                                <span className="text-xs text-purple-600 dark:text-purple-300 font-medium">
                                  {user.es_admin_principal ? "Control total + Soporte" : "Acceso admin"}
                                </span>
                              )}
                              {user.rol === "agente_soporte" && (
                                <span className="text-xs text-cyan-600 dark:text-cyan-300 font-medium">
                                  Mesa de soporte técnico
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {isProtected ? (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                                  <Lock className="w-3.5 h-3.5" />
                                  {user.es_admin_principal ? "Principal protegido" : "Sesión actual"}
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {user.rol === "usuario" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isBusy}
                                      onClick={() => handleRoleChange(user.id, "reclutador")}
                                      className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 text-xs h-8 px-2.5"
                                    >
                                      <Building2 className="w-3.5 h-3.5 mr-1" />
                                      Dar Empresa
                                    </Button>
                                  )}

                                  {user.rol !== "agente_soporte" && (isPrimaryAdmin || user.rol !== "admin") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isBusy}
                                      onClick={() => handleRoleChange(user.id, "agente_soporte")}
                                      className="bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800 hover:bg-cyan-100 text-xs h-8 px-2.5"
                                    >
                                      <Headphones className="w-3.5 h-3.5 mr-1" />
                                      Dar Soporte
                                    </Button>
                                  )}

                                  {user.rol !== "usuario" && (isPrimaryAdmin || user.rol === "reclutador" || user.rol === "agente_soporte") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isBusy}
                                      onClick={() => handleRoleChange(user.id, "usuario")}
                                      className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 hover:bg-blue-100 text-xs h-8 px-2.5"
                                    >
                                      <UserMinus className="w-3.5 h-3.5 mr-1" />
                                      Quitar Rol
                                    </Button>
                                  )}

                                  {isPrimaryAdmin && user.rol !== "admin" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isBusy}
                                      onClick={() => handleRoleChange(user.id, "admin")}
                                      className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 hover:bg-purple-100 text-xs h-8 px-2.5"
                                    >
                                      <Shield className="w-3.5 h-3.5 mr-1" />
                                      Dar Admin
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isBusy}
                                    onClick={() => handleToggleStatus(user)}
                                    title={user.activo ? "Suspender usuario" : "Reactivar usuario"}
                                    className="h-8 px-2"
                                  >
                                    {user.activo ? (
                                      <Ban className="w-4 h-4 text-orange-500" />
                                    ) : (
                                      <UserCheck className="w-4 h-4 text-emerald-500" />
                                    )}
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isBusy}
                                    onClick={() => handleDeleteUser(user)}
                                    title="Eliminar usuario"
                                    className="h-8 px-2"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Dedicated Roles & Permissions Section */}
          <TabsContent value="roles">
            <div className="space-y-6">
              {/* Principal Admin Hierarchy Banner */}
              <Card className="p-5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <Crown className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Sección de Roles y Permisos {isPrimaryAdmin ? "— Control del Administrador Principal" : ""}
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-slate-300 mt-1">
                      {isPrimaryAdmin
                        ? "Como Administrador Principal (Superadmin) tienes permisos completos de Administrador y de Agente de Soporte (puedes atender tickets en la pestaña Mesa de Soporte), además de asignar el rol de Agente de Soporte, Empresa o Administrador a cualquier otro usuario."
                        : "Solo el Administrador Principal puede asignar o quitar el rol de Administrador y acceder como Superadmin a la Mesa de Soporte. Como administrador secundario puedes gestionar roles de Agente de Soporte, Empresa y Candidato."}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Assign / Revoke Form */}
              <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-purple-500" />
                  Asignar o Quitar Rol a un Usuario
                </h4>

                {editableUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    No hay otros usuarios registrados para modificar.
                  </p>
                ) : (
                  <form onSubmit={handleRoleFormSubmit} className="grid md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">
                        Usuario inscrito
                      </label>
                      <select
                        value={selectedTargetUserId}
                        onChange={(e) => setSelectedTargetUserId(e.target.value)}
                        className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-gray-900 dark:text-white"
                      >
                        {editableUsers.map((u) => (
                          <option key={u.id} value={String(u.id)}>
                            {u.nombre} ({u.email}) — Actual: {ROLE_LABELS[u.rol]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">
                        Nuevo rol a asignar
                      </label>
                      <select
                        value={selectedTargetRole}
                        onChange={(e) => setSelectedTargetRole(e.target.value as SystemRole)}
                        className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-gray-900 dark:text-white"
                      >
                        <option value="reclutador">Empresa / Reclutador</option>
                        <option value="agente_soporte">Agente de Soporte (Mesa de ayuda y tickets)</option>
                        <option value="admin" disabled={!isPrimaryAdmin}>
                          Administrador {!isPrimaryAdmin ? "(Solo Principal)" : ""}
                        </option>
                        <option value="usuario">Candidato (Quitar rol asignado)</option>
                      </select>
                    </div>

                    <div>
                      <Button
                        type="submit"
                        disabled={isSubmittingRole || !selectedTargetUserId}
                        className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isSubmittingRole ? "Guardando..." : "Aplicar Cambio de Rol"}
                      </Button>
                    </div>

                    {selectedTargetRole === "reclutador" && (
                      <div className="md:col-span-3 grid md:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-slate-800">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">
                            Empresa asociada (requerida para Reclutador)
                          </label>
                          <select
                            value={selectedEmpresaId}
                            onChange={(e) => setSelectedEmpresaId(e.target.value)}
                            className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-gray-900 dark:text-white"
                          >
                            <option value="auto">Crear empresa automática para el usuario</option>
                            {empresasList.map((emp) => (
                              <option key={emp.id} value={String(emp.id)}>
                                {emp.nombre} ({emp.sector || "General"})
                              </option>
                            ))}
                            <option value="new">+ Registrar nueva empresa...</option>
                          </select>
                        </div>

                        {selectedEmpresaId === "new" && (
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">
                              Nombre de la nueva empresa
                            </label>
                            <Input
                              placeholder="Ej: Acme Colombia S.A.S."
                              value={newEmpresaNombre}
                              onChange={(e) => setNewEmpresaNombre(e.target.value)}
                              className="dark:bg-slate-900 dark:border-slate-700"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </form>
                )}
              </Card>

              {/* Grouped Role Lists */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Administradores */}
                <Card className="p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-500" />
                      Administradores ({adminUsers.length})
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {adminUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{u.nombre}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{u.email}</p>
                          </div>
                          {u.es_admin_principal ? (
                            <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] shrink-0">
                              <Crown className="w-3 h-3 mr-1" /> Principal + Soporte
                            </Badge>
                          ) : isPrimaryAdmin ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyUserId === u.id}
                              onClick={() => handleRoleChange(u.id, "usuario")}
                              className="text-xs h-7 px-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 shrink-0"
                            >
                              Quitar Admin
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Agentes de Soporte */}
                <Card className="p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Headphones className="w-4 h-4 text-cyan-500" />
                      Soporte ({supportUsers.length})
                    </h4>
                  </div>
                  {supportUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Solo el Superadmin tiene permisos de soporte actualmente. Asigna a cualquier usuario aquí.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {supportUsers.map((u) => (
                        <div
                          key={u.id}
                          className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 space-y-2"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{u.nombre}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{u.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyUserId === u.id}
                              onClick={() => handleRoleChange(u.id, "usuario")}
                              className="text-xs h-7 px-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                            >
                              Quitar Soporte
                            </Button>
                            {isPrimaryAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyUserId === u.id}
                                onClick={() => handleRoleChange(u.id, "admin")}
                                className="text-xs h-7 px-2 border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-300"
                              >
                                Hacer Admin
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Empresas / Reclutadores */}
                <Card className="p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      Empresas ({companyUsers.length})
                    </h4>
                  </div>
                  {companyUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Aún no hay usuarios con rol de Empresa asignado.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {companyUsers.map((u) => (
                        <div
                          key={u.id}
                          className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 space-y-2"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{u.nombre}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{u.email}</p>
                            {u.empresa_nombre && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                                {u.empresa_nombre}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyUserId === u.id}
                              onClick={() => handleRoleChange(u.id, "usuario")}
                              className="text-xs h-7 px-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                            >
                              Quitar Empresa
                            </Button>
                            {isPrimaryAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyUserId === u.id}
                                onClick={() => handleRoleChange(u.id, "admin")}
                                className="text-xs h-7 px-2 border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-300"
                              >
                                Hacer Admin
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Candidatos */}
                <Card className="p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      Candidatos ({candidateUsers.length})
                    </h4>
                  </div>
                  {candidateUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      No hay usuarios con rol Candidato.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {candidateUsers.map((u) => (
                        <div
                          key={u.id}
                          className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 space-y-2"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{u.nombre}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{u.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyUserId === u.id}
                              onClick={() => handleRoleChange(u.id, "reclutador")}
                              className="text-xs h-7 px-2 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                            >
                              Dar Empresa
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyUserId === u.id}
                              onClick={() => handleRoleChange(u.id, "agente_soporte")}
                              className="text-xs h-7 px-2 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300"
                            >
                              Dar Soporte
                            </Button>
                            {isPrimaryAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyUserId === u.id}
                                onClick={() => handleRoleChange(u.id, "admin")}
                                className="text-xs h-7 px-2 border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-300"
                              >
                                Dar Admin
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Dedicated Support Desk Tab for Superadmin */}
          {isPrimaryAdmin && (
            <TabsContent value="support">
              <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Headphones className="w-5 h-5 text-cyan-500" />
                      Mesa de Soporte Técnico (Permisos de Superadmin)
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                      Como Administrador Principal puedes atender, asignar y responder todos los tickets de soporte igual que un Agente de Soporte.
                    </p>
                  </div>
                  <Link to="/dashboard/support">
                    <Button variant="outline" size="sm" className="border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300">
                      Abrir vista completa
                    </Button>
                  </Link>
                </div>
                <SupportTicketsPanel />
              </Card>
            </TabsContent>
          )}

          {/* Vacancies Approval Tab */}
          <TabsContent value="vacancies">
            <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Aprobación de Empleos Subidos por Empresas
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                    Los empleos creados por las empresas requieren aprobación del administrador antes de aparecer a los candidatos.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "todas", label: `Todas (${vacanciesList.length})` },
                    {
                      key: "pendiente_aprobacion",
                      label: `Pendientes (${vacanciesList.filter((v) => v.estado === "pendiente_aprobacion").length})`,
                    },
                    {
                      key: "abierta",
                      label: `Aprobadas (${vacanciesList.filter((v) => v.estado === "abierta").length})`,
                    },
                    {
                      key: "rechazada",
                      label: `Rechazadas (${vacanciesList.filter((v) => v.estado === "rechazada").length})`,
                    },
                  ].map((f) => (
                    <Button
                      key={f.key}
                      size="sm"
                      variant={vacancyFilter === f.key ? "default" : "outline"}
                      onClick={() => setVacancyFilter(f.key)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {vacanciesList
                  .filter((v) => vacancyFilter === "todas" || v.estado === vacancyFilter)
                  .map((vac) => {
                    const isBusy = busyVacancyId === vac.id;
                    const isRejecting = rejectingVacancyId === vac.id;

                    return (
                      <div
                        key={vac.id}
                        className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/50 p-5 space-y-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold uppercase tracking-wider text-[#0066CC] dark:text-blue-400">
                                {vac.empresa_nombre}
                              </span>
                              <Badge
                                className={
                                  vac.estado === "pendiente_aprobacion"
                                    ? "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                    : vac.estado === "abierta"
                                      ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                      : vac.estado === "rechazada"
                                        ? "bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800"
                                        : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                                }
                              >
                                {vac.estado === "pendiente_aprobacion"
                                  ? "Pendiente de aprobación"
                                  : vac.estado === "abierta"
                                    ? "Aprobada y publicada"
                                    : vac.estado === "rechazada"
                                      ? "Rechazada"
                                      : vac.estado}
                              </Badge>
                            </div>

                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{vac.titulo}</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              Subida por: <span className="font-medium">{vac.reclutador_nombre}</span> ({vac.reclutador_email}) ·{" "}
                              {formatDate(vac.created_at)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {vac.estado !== "abierta" && (
                              <Button
                                size="sm"
                                disabled={isBusy}
                                onClick={() => handleReviewVacancy(vac.id, "aprobar")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                Aprobar y Publicar
                              </Button>
                            )}

                            {vac.estado !== "rechazada" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => {
                                  setRejectingVacancyId(isRejecting ? null : vac.id);
                                  setRejectReason("");
                                }}
                                className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs"
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                Rechazar
                              </Button>
                            )}

                            {vac.estado === "abierta" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => handleReviewVacancy(vac.id, "pendiente")}
                                className="text-xs dark:border-slate-700"
                              >
                                Pasar a pendiente
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {vac.ciudad} ({vac.modalidad})
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                            {vac.salario}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                            {vac.experiencia} · {vac.tipo_contrato}
                          </span>
                          <span>Puntaje mínimo: {vac.puntaje_minimo} pts</span>
                        </div>

                        <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                          {vac.descripcion}
                        </p>

                        {vac.requisitos.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {vac.requisitos.map((req, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300"
                              >
                                • {req}
                              </span>
                            ))}
                          </div>
                        )}

                        {vac.motivo_rechazo && (
                          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                            <strong>Motivo de rechazo:</strong> {vac.motivo_rechazo}
                          </div>
                        )}

                        {isRejecting && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 space-y-2">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                              Motivo del rechazo (visible para la empresa):
                            </label>
                            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                              <Input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Ej: Faltan detalles de salario o requisitos claros..."
                                className="dark:bg-slate-950 dark:border-slate-700"
                              />
                              <Button
                                size="sm"
                                disabled={isBusy}
                                onClick={() => handleReviewVacancy(vac.id, "rechazar", rejectReason)}
                                className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                              >
                                Confirmar Rechazo
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {vacanciesList.filter((v) => vacancyFilter === "todas" || v.estado === vacancyFilter).length === 0 && (
                  <p className="text-center text-sm text-gray-500 dark:text-slate-400 py-8">
                    No hay empleos en esta categoría.
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Resources Tab - Subir y administrar material real */}
          <TabsContent value="resources">
            <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  Material de Preparación para Candidatos ({resourcesList.length})
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                  Sube archivos reales (PDF, DOCX, etc.) o enlaces de video/guía para que aparezcan en la sección Recursos del candidato.
                </p>
              </div>

              <form onSubmit={handleCreateResource} className="grid md:grid-cols-2 gap-4 p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                <div>
                  <label className="block text-xs font-semibold mb-1">Título del material *</label>
                  <Input
                    required
                    value={resTitle}
                    onChange={(e) => setResTitle(e.target.value)}
                    placeholder="Ej: Guía de Entrevistas Técnicas 2026"
                    className="dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Categoría</label>
                    <select
                      value={resCategory}
                      onChange={(e) => setResCategory(e.target.value as any)}
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                    >
                      <option value="Guías de Estudio">Guías de Estudio</option>
                      <option value="Videos Tutoriales">Videos Tutoriales</option>
                      <option value="Plantillas Profesionales">Plantillas Profesionales</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Formato</label>
                    <select
                      value={resType}
                      onChange={(e) => setResType(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                    >
                      <option value="PDF">PDF</option>
                      <option value="DOCX">DOCX</option>
                      <option value="Video">Video</option>
                      <option value="Enlace">Enlace</option>
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Descripción breve</label>
                  <Input
                    value={resDesc}
                    onChange={(e) => setResDesc(e.target.value)}
                    placeholder="Describe brevemente qué contiene este material..."
                    className="dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Subir archivo (opcional si pones enlace)</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.mp4"
                    onChange={(e) => setResFile(e.target.files?.[0] || null)}
                    className="dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Enlace externo (opcional si subes archivo)</label>
                  <Input
                    type="url"
                    value={resUrl}
                    onChange={(e) => setResUrl(e.target.value)}
                    placeholder="https://..."
                    className="dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={isUploadingRes} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Upload className="w-4 h-4 mr-1.5" />
                    {isUploadingRes ? "Publicando..." : "Publicar Material"}
                  </Button>
                </div>
              </form>

              {resourcesList.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-slate-400 py-6">
                  Aún no hay material publicado en la base de datos.
                </p>
              ) : (
                <div className="space-y-3">
                  {resourcesList.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-blue-100 dark:bg-blue-950/70 text-[#0066CC] dark:text-blue-300 text-xs">
                            {r.tipo}
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-slate-400">{r.categoria}</span>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white mt-1">{r.titulo}</p>
                        {r.descripcion && <p className="text-xs text-gray-500 dark:text-slate-400">{r.descripcion}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {(r.archivo_url || r.url_externa) && (
                          <a
                            href={r.archivo_url || r.url_externa || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#0066CC] dark:text-blue-400 hover:underline inline-flex items-center gap-1 px-2"
                          >
                            Ver <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteResource(r)}
                          className="text-red-600 hover:text-red-700 dark:border-slate-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Categories Tab - Reales desde perfiles_profesionales */}
          <TabsContent value="categories">
            <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Categorías Profesionales ({categoriesList.length})
              </h3>

              <form onSubmit={handleCreateCategory} className="grid md:grid-cols-3 gap-3 mb-6">
                <Input
                  placeholder="Nombre de la categoría (ej. Ciberseguridad)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="dark:bg-slate-900 dark:border-slate-700"
                />
                <Input
                  placeholder="Descripción breve (opcional)"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="dark:bg-slate-900 dark:border-slate-700"
                />
                <Button
                  type="submit"
                  disabled={isCreatingCategory || !newCategoryName.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  {isCreatingCategory ? "Creando..." : "Nueva Categoría"}
                </Button>
              </form>

              <div className="space-y-3">
                {categoriesList.map((category) => (
                  <div
                    key={category.id}
                    className="border border-gray-200 dark:border-slate-800 rounded-lg p-4 flex justify-between items-center gap-4"
                  >
                    <div>
                      <h4 className="font-semibold text-base text-gray-900 dark:text-white">{category.nombre}</h4>
                      {category.descripcion && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{category.descripcion}</p>
                      )}
                      <div className="flex gap-6 text-xs text-gray-600 dark:text-slate-400 mt-1.5">
                        <span>{category.vacantes_count} vacantes</span>
                        <span>{category.ejercicios_count} ejercicios</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCategory(category)}
                      className="text-red-600 hover:text-red-700 dark:border-slate-700"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Analytics Tab - Datos reales */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Distribución Real de Usuarios Activos
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-slate-300">
                        Candidatos ({analytics?.role_distribution.usuario.percent ?? 0}%)
                      </span>
                      <span className="text-sm font-medium">{analytics?.role_distribution.usuario.count ?? 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${analytics?.role_distribution.usuario.percent ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-slate-300">
                        Empresas ({analytics?.role_distribution.reclutador.percent ?? 0}%)
                      </span>
                      <span className="text-sm font-medium">{analytics?.role_distribution.reclutador.count ?? 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-emerald-600 h-2 rounded-full"
                        style={{ width: `${analytics?.role_distribution.reclutador.percent ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-slate-300">
                        Administradores ({analytics?.role_distribution.admin.percent ?? 0}%)
                      </span>
                      <span className="text-sm font-medium">{analytics?.role_distribution.admin.count ?? 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${analytics?.role_distribution.admin.percent ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Métricas Reales de PostgreSQL
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-300">Candidatos con CV cargado</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {analytics?.cv_completion_rate ?? 0}% ({stats?.total_cvs ?? 0} CVs)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-300">Postulaciones por vacante (promedio)</span>
                    <span className="text-lg font-bold text-[#0066CC] dark:text-blue-400">
                      {analytics?.avg_applications_per_vacancy ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-300">Postulaciones aprobadas</span>
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {analytics?.approved_applications ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-300">Usuarios registrados (últimos 30 días)</span>
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {analytics?.recent_users_30d ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-300">Sesiones de entrevista registradas</span>
                    <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
                      {stats?.total_interviews ?? 0}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Configuración y Jerarquía del Sistema
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Información real del entorno administrativo y empresas registradas en PostgreSQL.
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-800 pt-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Administrador Principal</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {adminUsers.find((a) => a.es_admin_principal)
                      ? `${adminUsers.find((a) => a.es_admin_principal)?.nombre} (${adminUsers.find((a) => a.es_admin_principal)?.email})`
                      : "Sin asignar"}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setActiveTab("roles")}>
                  Ir a Roles y Permisos
                </Button>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-800 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Empresas Registradas en Base de Datos ({empresasList.length})
                </h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {empresasList.map((emp) => (
                    <div
                      key={emp.id}
                      className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50"
                    >
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{emp.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{emp.sector || "General"}</p>
                      <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">
                        {emp.reclutadores_count} reclutadores · {emp.vacantes_count} vacantes
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
