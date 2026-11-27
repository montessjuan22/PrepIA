import { useState, useEffect, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { JobSearchExplorer } from "../components/JobSearchExplorer";
import { StructuredResumeCard } from "../components/StructuredResumeCard";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import {
  getCurrentUser, setCurrentUser as saveCurrentUser, UserSession,
  apiGetCandidateMetrics, apiAnalyzeCVFile, apiAnalyzeCVText, apiUpdateProfile, apiChatWithCV,
  apiGetVacancies, apiEvaluateVacancy, apiApplyToVacancy, apiGetUserApplications,
  apiDeleteCV, apiWithdrawApplication, apiGetPreparationResources,
  apiGetCandidateNotifications, apiMarkNotificationRead,
  apiUploadProfilePhoto, apiDeleteProfilePhoto,
  apiGetAIConsent, apiSetAIConsent,
  CandidateMetricsResponse, CVAnalysisResult, Vacancy, VacancyEvaluationResult,
  PreparationResource, CandidateNotificationItem, CandidateNotificationVacancy,
  VacancyRespuestaFiltro
} from "../../services/api";
import {
  Upload, FileText, TrendingUp, Briefcase, Bell, BookOpen, Video, Download, ExternalLink,
  CheckCircle, AlertCircle, Star, Award, User, Brain,
  MessageSquare, Sparkles, Users, Shirt, Clock, ThumbsUp, ThumbsDown, Edit, X,
  CheckCircle2, AlertTriangle, Lightbulb, RefreshCw, Send, Check, Bot, Building2, ChevronRight,
  MapPin, Globe, Trash2, FolderOpen, ChevronDown, Banknote, Camera, ShieldCheck
} from "lucide-react";

export function CandidateDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const topFileInputRef = useRef<HTMLInputElement>(null);
  const [interviewQuestion, setInterviewQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [interviewHistory, setInterviewHistory] = useState<Array<{question: string, answer: string, feedback: string}>>([]);

  // Estados completos y editables del perfil del usuario
  const [currentUser, setCurrentUserState] = useState<UserSession | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editSectionTab, setEditSectionTab] = useState<"personal" | "profesional" | "enlaces">("personal");
  
  // Datos editables individuales
  const initialSession = getCurrentUser();
  const [editName, setEditName] = useState(initialSession?.nombre || "");
  const [editEmail, setEditEmail] = useState(initialSession?.email || "");
  const [editPhone, setEditPhone] = useState(initialSession?.telefono || "");
  const [editCategory, setEditCategory] = useState(initialSession?.especialidad || "Desarrollo de Software / Tecnología");
  const [editCity, setEditCity] = useState(initialSession?.ciudad || "Bogotá, Colombia");
  const [editLinkedIn, setEditLinkedIn] = useState(initialSession?.linkedin_url || "");
  const [editGitHub, setEditGitHub] = useState(initialSession?.github_url || "");
  const [editExperience, setEditExperience] = useState(initialSession?.nivel_experiencia || "Junior");
  const [editBio, setEditBio] = useState(initialSession?.biografia || "");
  const [editRole, setEditRole] = useState<string>(initialSession?.rol || "usuario");

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");

  // Estados reales conectados a PostgreSQL
  const [metrics, setMetrics] = useState<CandidateMetricsResponse | null>(null);
  const [cvAnalysis, setCvAnalysis] = useState<CVAnalysisResult | null>(null);
  const [isAnalyzingCv, setIsAnalyzingCv] = useState(false);
  const [cvAnalysisSuccess, setCvAnalysisSuccess] = useState(false);
  const [cvText, setCvText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [isDeletingCv, setIsDeletingCv] = useState(false);

  // Chatbot Auditor de Hoja de Vida
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: '¡Hola! Soy tu **Copiloto de IA de PrepIA**. Aún no has cargado tu Hoja de Vida en la base de datos. Sube tu archivo en PDF/Word o pega tu perfil para contrastar tus habilidades con los requerimientos de las empresas empleadoras.',
      time: 'Justo ahora'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Vacantes Reales de PostgreSQL y Comparativa de Requerimientos
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [vacancyEvalResult, setVacancyEvalResult] = useState<VacancyEvaluationResult | null>(null);
  const [isEvaluatingVacancy, setIsEvaluatingVacancy] = useState(false);
  const [userApplications, setUserApplications] = useState<any[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [prepResources, setPrepResources] = useState<PreparationResource[]>([]);
  const [notifications, setNotifications] = useState<CandidateNotificationItem[]>([]);
  const [expandedNotifId, setExpandedNotifId] = useState<number | null>(null);
  const [coverImageFailed, setCoverImageFailed] = useState(false);
  const [isCoverZoomOpen, setIsCoverZoomOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [iaConsentAccepted, setIaConsentAccepted] = useState(false);
  const [isTogglingConsent, setIsTogglingConsent] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleToggleAIConsent = async (aceptado: boolean) => {
    setIsTogglingConsent(true);
    try {
      const res = await apiSetAIConsent(aceptado, candidateEmail);
      setIaConsentAccepted(Boolean(res.aceptado));
    } catch (err: any) {
      setAnalysisError(err?.message || "No se pudo actualizar el consentimiento de IA.");
    } finally {
      setIsTogglingConsent(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploadingAvatar(true);
    setAnalysisError("");
    try {
      await apiUploadProfilePhoto(file, candidateEmail);
      await loadMetrics(candidateEmail);
    } catch (err: any) {
      setAnalysisError(err?.message || "No se pudo subir la foto de perfil.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      await apiDeleteProfilePhoto(candidateEmail);
      await loadMetrics(candidateEmail);
    } catch (err: any) {
      setAnalysisError(err?.message || "No se pudo quitar la foto de perfil.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const loadMetrics = async (email: string) => {
    setCoverImageFailed(false);
    try {
      const [data, vacsData, appsData, resourcesData, notifsData, consentData] = await Promise.all([
        apiGetCandidateMetrics(email),
        apiGetVacancies(),
        apiGetUserApplications(email),
        apiGetPreparationResources(),
        apiGetCandidateNotifications(email),
        apiGetAIConsent(email).catch(() => ({ aceptado: false, puede_enviar_externa: false })),
      ]);
      setIaConsentAccepted(Boolean(consentData?.aceptado));
      setPrepResources(resourcesData);
      setNotifications(notifsData);
      setMetrics(data);
      if (data.nombre) setEditName(data.nombre);
      if (data.email) setEditEmail(data.email);
      if (data.telefono) setEditPhone(data.telefono);
      if (data.especialidad) setEditCategory(data.especialidad);
      if (data.ciudad) setEditCity(data.ciudad);
      if (data.linkedin_url) setEditLinkedIn(data.linkedin_url);
      if (data.github_url) setEditGitHub(data.github_url);
      if (data.nivel_experiencia) setEditExperience(data.nivel_experiencia);
      if (data.biografia) setEditBio(data.biografia);
      if (data.rol) setEditRole(data.rol);

      if (data.cv_evaluado && data.ultimo_analisis) {
        setCvAnalysis(data.ultimo_analisis);
      } else {
        setCvAnalysis(null);
      }

      setVacancies(vacsData);
      setUserApplications(appsData);

      const targetVacancy = selectedVacancy || (vacsData.length > 0 ? vacsData[0] : null);
      if (vacsData.length > 0 && !selectedVacancy) {
        setSelectedVacancy(vacsData[0]);
      }

      if (data.checklist?.cv_subido && targetVacancy) {
        try {
          const evalRes = await apiEvaluateVacancy(targetVacancy.id, email);
          setVacancyEvalResult(evalRes);
        } catch (e) {
          console.warn("Error evaluando vacante:", e);
        }
      } else if (!data.checklist?.cv_subido && targetVacancy) {
        setVacancyEvalResult({
          tiene_cv: false,
          vacante_id: targetVacancy.id,
          vacante_titulo: targetVacancy.titulo,
          empresa: targetVacancy.empresa,
          requerimientos_empleador: targetVacancy.requisitos || [],
          mensaje: "Sube tu Hoja de Vida para que la IA verifique cuáles de estos requerimientos cumples y cuáles te hacen falta."
        });
      }

      const empresasReales = Array.from(new Set(vacsData.map(v => v.empresa))).slice(0, 3).join(", ");
      setChatMessages([
        {
          sender: 'bot',
          text: data.checklist?.cv_subido
            ? `¡Hola ${data.nombre || 'Candidato'}! He cargado tu Hoja de Vida **${data.cv_nombre || 'desde PostgreSQL'}** (${data.cv_score ?? '—'}/100). Puedo auditar tu CV, revisar el estado real de tu perfil (${data.perfil_completitud}%), consultar tus postulaciones (${appsData.length}), comparar tus requisitos contra las ${vacsData.length} vacantes abiertas${empresasReales ? ` (${empresasReales})` : ''} o simular preguntas técnicas según tu stack.`
            : `¡Hola ${data.nombre || 'Candidato'}! Soy tu **Asistente IA conectado a PostgreSQL**. Aún no tienes una Hoja de Vida cargada, pero ya puedes consultarme sobre las ${vacsData.length} vacantes abiertas, el estado de tu perfil (${data.perfil_completitud}%) o practicar preguntas de entrevista.`,
          time: 'Justo ahora'
        }
      ]);
    } catch (err) {
      console.warn("Error cargando métricas reales de BD:", err);
    }
  };

  const handleEvaluateForVacancy = async (vac: Vacancy) => {
    setSelectedVacancy(vac);
    setIsEvaluatingVacancy(true);
    setApplyFeedback(null);
    try {
      const res = await apiEvaluateVacancy(vac.id, candidateEmail);
      setVacancyEvalResult(res);
    } catch (err) {
      console.warn("Error evaluando vacante:", err);
    } finally {
      setIsEvaluatingVacancy(false);
    }
  };

  const handleApplyToVacancy = async (vacanteId: number, respuestasFiltro?: VacancyRespuestaFiltro[]) => {
    if (!metrics?.checklist?.cv_subido) {
      setApplyFeedback({
        type: 'error',
        message: 'No puedes postularte sin haber subido tu Hoja de Vida. Sube tu archivo primero en la sección Resumen.'
      });
      return;
    }
    setIsApplying(true);
    setApplyFeedback(null);
    try {
      const res = await apiApplyToVacancy(vacanteId, candidateEmail, respuestasFiltro);
      if (res.status === 'exito') {
        setApplyFeedback({
          type: 'success',
          message: res.mensaje || '¡Postulación enviada con éxito al empleador!'
        });
        await loadMetrics(candidateEmail);
      } else {
        setApplyFeedback({
          type: 'error',
          message: res.mensaje || 'Aviso al registrar postulación.'
        });
      }
    } catch {
      setApplyFeedback({
        type: 'error',
        message: 'Error al conectar con la base de datos para postularte.'
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleWithdrawApp = async (postulacionId: number) => {
    if (!confirm("¿Estás seguro de que deseas retirar esta postulación de la base de datos?")) return;
    try {
      const res = await apiWithdrawApplication(postulacionId, candidateEmail);
      if (res.success) {
        setApplyFeedback({
          type: 'success',
          message: 'Postulación retirada exitosamente de la base de datos.'
        });
        await loadMetrics(candidateEmail);
        setTimeout(() => setApplyFeedback(null), 5000);
      }
    } catch {
      alert("Error al retirar la postulación.");
    }
  };

  const handleDeleteCV = async () => {
    if (!confirm("¿Deseas eliminar tu Hoja de Vida de la base de datos? Podrás subir una nueva cuando lo desees.")) return;
    setIsDeletingCv(true);
    try {
      const res = await apiDeleteCV(candidateEmail);
      if (res.success) {
        setCvAnalysis(null);
        setCvFile(null);
        await loadMetrics(candidateEmail);
      }
    } catch {
      alert("Error al eliminar la Hoja de Vida.");
    } finally {
      setIsDeletingCv(false);
    }
  };

  const handleSendChatMessage = async (customMessage?: string) => {
    const textToSend = customMessage || chatInput;
    if (!textToSend.trim() || isBotThinking) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: textToSend.trim(), time: timeStr };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customMessage) setChatInput('');
    setIsBotThinking(true);

    setTimeout(() => {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);

    try {
      const response = await apiChatWithCV(textToSend.trim(), candidateEmail, chatMessages.slice(-6));
      const botMsg = { sender: 'bot' as const, text: response.respuesta, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorText = err instanceof Error && err.message
        ? `No pude completar la consulta en el servidor: ${err.message}`
        : 'No pude conectarme con el backend de PrepIA en el puerto 8000 para realizar esta consulta.';
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: errorText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsBotThinking(false);
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  };

  useEffect(() => {
    const sessionUser = getCurrentUser();
    let currentEmail = sessionUser?.email || "";
    if (sessionUser && sessionUser.email) {
      setCurrentUserState(sessionUser);
      setEditName(sessionUser.nombre || sessionUser.email.split("@")[0]);
      setEditEmail(sessionUser.email);
      if (sessionUser.telefono) setEditPhone(sessionUser.telefono);
      if (sessionUser.especialidad) setEditCategory(sessionUser.especialidad);
      if (sessionUser.ciudad) setEditCity(sessionUser.ciudad);
      if (sessionUser.linkedin_url) setEditLinkedIn(sessionUser.linkedin_url);
      if (sessionUser.github_url) setEditGitHub(sessionUser.github_url);
      if (sessionUser.nivel_experiencia) setEditExperience(sessionUser.nivel_experiencia);
      if (sessionUser.biografia) setEditBio(sessionUser.biografia);
      if (sessionUser.rol) setEditRole(sessionUser.rol);
      currentEmail = sessionUser.email;
    }
    loadMetrics(currentEmail);
  }, []);

  const candidateName = currentUser?.nombre || metrics?.nombre || editName || "Candidato";
  const candidateEmail = currentUser?.email || metrics?.email || editEmail || "";
  const candidateCategory = metrics?.especialidad || currentUser?.especialidad || editCategory || "Desarrollo de Software / Tecnología";
  const candidateCity = metrics?.ciudad || currentUser?.ciudad || editCity || "Bogotá, Colombia";
  const candidateExperience = metrics?.nivel_experiencia || currentUser?.nivel_experiencia || editExperience || "Semi-Senior";
  const candidateLinkedIn = metrics?.linkedin_url || currentUser?.linkedin_url || editLinkedIn || "";
  const candidateGitHub = metrics?.github_url || currentUser?.github_url || editGitHub || "";
  const candidateBio = metrics?.biografia || currentUser?.biografia || editBio || "";

  const getInitials = (name: string) => {
    if (!name) return "JS";
    return name
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join("");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim()) return;

    setIsSavingProfile(true);
    setProfileSaveError("");

    try {
      // 1. Guardar todos los campos extendidos en PostgreSQL
      const res = await apiUpdateProfile({
        usuario_id: metrics?.usuario_id || currentUser?.id,
        current_email: metrics?.email || currentUser?.email,
        email: editEmail.trim().toLowerCase(),
        nombre: editName.trim(),
        telefono: editPhone.trim() || undefined,
        especialidad: editCategory.trim(),
        ciudad: editCity.trim(),
        linkedin_url: editLinkedIn.trim(),
        github_url: editGitHub.trim(),
        nivel_experiencia: editExperience.trim(),
        biografia: editBio.trim(),
        rol: editRole,
      });

      if (!res.success) {
        setProfileSaveError(res.error || "No se pudieron guardar los cambios en la base de datos.");
        return;
      }

      const finalEmail = res.usuario?.email || editEmail.trim().toLowerCase();

      // 2. Actualizar sesión local
      const updatedUser: UserSession = {
        ...(currentUser || { id: res.usuario?.id || 3 }),
        id: res.usuario?.id || currentUser?.id || 3,
        nombre: res.usuario?.nombre || editName.trim(),
        email: finalEmail,
        telefono: res.usuario?.telefono ?? (editPhone.trim() || undefined),
        especialidad: res.usuario?.especialidad || editCategory.trim(),
        ciudad: res.usuario?.ciudad || editCity.trim(),
        linkedin_url: res.usuario?.linkedin_url ?? editLinkedIn.trim(),
        github_url: res.usuario?.github_url ?? editGitHub.trim(),
        nivel_experiencia: res.usuario?.nivel_experiencia || editExperience.trim(),
        biografia: res.usuario?.biografia ?? editBio.trim(),
        rol: (res.usuario?.rol || editRole) as any,
      };

      saveCurrentUser(updatedUser);
      setCurrentUserState(updatedUser);
      setEditEmail(finalEmail);
      setIsEditProfileOpen(false);
      setSaveSuccess(true);
      window.dispatchEvent(new Event("storage"));

      // 3. Recargar métricas actualizadas desde PostgreSQL
      await loadMetrics(finalEmail);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch {
      setProfileSaveError("No se pudieron guardar los cambios en la base de datos.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    e.target.value = "";
    setCvFile(file);
    setIsAnalyzingCv(true);
    setCvAnalysisSuccess(false);
    setAnalysisError("");

    try {
      const res = await apiAnalyzeCVFile(file, candidateEmail);
      setCvAnalysis(res);
      setIsAnalyzingCv(false);
      setCvAnalysisSuccess(true);
      setTimeout(() => setCvAnalysisSuccess(false), 6000);
      await loadMetrics(candidateEmail);
    } catch (err) {
      setIsAnalyzingCv(false);
      const message = err instanceof Error ? err.message : "";
      setAnalysisError(message || "Hubo un problema al procesar el archivo. Puedes intentar pegando el texto directamente.");
    }
  };

  const handleAnalyzeText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvText.trim() || cvText.trim().length < 25) {
      setAnalysisError("Por favor ingresa un texto de CV con más información (al menos 25 caracteres).");
      return;
    }
    setIsAnalyzingCv(true);
    setCvAnalysisSuccess(false);
    setAnalysisError("");

    try {
      const res = await apiAnalyzeCVText({
        texto_cv: cvText,
        nombre_archivo: "Curriculum_Ingresado.txt",
        email_usuario: candidateEmail
      });
      setCvAnalysis(res);
      setIsAnalyzingCv(false);
      setCvAnalysisSuccess(true);
      setShowTextInput(false);
      setTimeout(() => setCvAnalysisSuccess(false), 6000);
      await loadMetrics(candidateEmail);
    } catch (err) {
      setIsAnalyzingCv(false);
      const message = err instanceof Error ? err.message : "";
      setAnalysisError(message || "Error al analizar el texto de la Hoja de Vida.");
    }
  };

  const startInterview = () => {
    const questions = [
      `¿Por qué quieres trabajar en el área de ${candidateCategory}?`,
      "Cuéntame sobre una situación difícil que hayas enfrentado en un proyecto o trabajo anterior",
      "¿Cuáles son tus principales fortalezas y debilidades profesionales?",
      "¿Dónde te ves en 5 años dentro de la industria tecnológica?",
      "¿Cómo manejas el estrés y los plazos de entrega ajustados?"
    ];
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    setInterviewQuestion(randomQuestion);
    setUserAnswer("");
    setAiFeedback("");
  };

  const submitAnswer = () => {
    if (!userAnswer.trim()) return;

    const feedback = `Excelente respuesta. Has demostrado conocimiento y profesionalismo.
    Puntos positivos: Claridad en la comunicación, uso de ejemplos concretos.
    Áreas de mejora: Podrías profundizar más en los resultados específicos alcanzados.
    Puntuación: 8.5/10`;

    setAiFeedback(feedback);
    setInterviewHistory(prev => [...prev, {
      question: interviewQuestion,
      answer: userAnswer,
      feedback: feedback
    }]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Dinámico y Completo del Perfil */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0 group">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="Subir o cambiar foto de perfil"
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center select-none overflow-hidden cursor-pointer relative ${
                    metrics?.foto_perfil_url
                      ? "bg-transparent"
                      : "bg-[#0066CC] font-extrabold text-white text-2xl sm:text-3xl shadow-lg ring-4 ring-blue-500/20"
                  }`}
                >
                  {metrics?.foto_perfil_url ? (
                    <img
                      src={metrics.foto_perfil_url}
                      alt={candidateName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    getInitials(candidateName)
                  )}
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="Cambiar foto de perfil"
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[#0066CC] dark:text-blue-400 shadow flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {candidateName}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setEditSectionTab("personal");
                      setIsEditProfileOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#0066CC] dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Editar todos mis datos"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-gray-600 dark:text-slate-300 font-medium text-sm flex items-center gap-2">
                  <span>{candidateEmail}</span>
                  {metrics?.telefono && (
                    <span className="text-gray-400 dark:text-slate-500">• {metrics.telefono}</span>
                  )}
                </p>

                {/* Badges de Especialidad, Rol, Nivel y Ciudad */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge 
                    onClick={() => { setEditSectionTab("profesional"); setIsEditProfileOpen(true); }}
                    className="bg-blue-100 dark:bg-blue-950/80 text-[#0066CC] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold text-xs cursor-pointer hover:border-blue-400"
                    title="Clic para editar especialidad"
                  >
                    {candidateCategory}
                  </Badge>

                  <Badge 
                    onClick={() => { setEditSectionTab("profesional"); setIsEditProfileOpen(true); }}
                    className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs cursor-pointer hover:border-indigo-400"
                    title="Nivel de experiencia"
                  >
                    {candidateExperience}
                  </Badge>

                  <Badge 
                    onClick={() => { setEditSectionTab("profesional"); setIsEditProfileOpen(true); }}
                    className="bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs cursor-pointer hover:border-purple-400"
                    title="Rol de cuenta"
                  >
                    {editRole === 'reclutador' ? 'Reclutador / Empresa' : 'Aspirante / Candidato'}
                  </Badge>

                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800">
                    <MapPin className="w-3 h-3 text-red-500" />
                    {candidateCity}
                  </span>
                </div>

                {/* Enlaces de LinkedIn y GitHub si están configurados */}
                {(candidateLinkedIn || candidateGitHub || candidateBio) && (
                  <div className="pt-1.5 flex items-center gap-3 text-xs flex-wrap">
                    {candidateLinkedIn && (
                      <a 
                        href={candidateLinkedIn} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1 text-[#0066CC] dark:text-blue-400 font-semibold hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5" /> LinkedIn
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {candidateGitHub && (
                      <a 
                        href={candidateGitHub} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1 text-gray-700 dark:text-slate-300 font-semibold hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5" /> GitHub / Portafolio
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {candidateBio && (
                      <span className="text-gray-500 dark:text-slate-400 italic text-xs block max-w-xl truncate">
                        "{candidateBio}"
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditSectionTab("personal");
                  setIsEditProfileOpen(true);
                }}
                className="dark:border-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 text-sm font-medium cursor-pointer"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar Perfil Completo
              </Button>

              <Button 
                onClick={() => topFileInputRef.current?.click()}
                disabled={isAnalyzingCv}
                className="bg-[#0066CC] hover:bg-[#004999] text-white shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isAnalyzingCv ? "Analizando CV..." : "Actualizar CV"}
              </Button>
              <input
                ref={topFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleCVUpload}
                disabled={isAnalyzingCv}
                className="hidden"
              />

              {metrics?.checklist?.cv_subido && (
                <Button
                  variant="outline"
                  onClick={handleDeleteCV}
                  disabled={isDeletingCv}
                  className="border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs cursor-pointer"
                  title="Eliminar Hoja de Vida actual de la base de datos"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {isDeletingCv ? "Eliminando..." : "Eliminar CV"}
                </Button>
              )}
            </div>
          </div>

          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300 text-sm rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-green-600 dark:text-green-400" />
              <span>Todos tus datos han sido actualizados y sincronizados en la base de datos PostgreSQL.</span>
            </div>
          )}

          {/* Quick Stats - Conectadas en Tiempo Real a PostgreSQL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">Puntuación CV</p>
                  {metrics?.checklist?.cv_subido && metrics?.cv_score ? (
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.cv_score}/100</p>
                      <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">Evaluado</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-2xl font-bold text-gray-400 dark:text-slate-500">—</p>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Sin CV cargado</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50">
                  <Star className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">Perfil Completo</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {metrics ? metrics.perfil_completitud : 60}%
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50">
                  <Award className="w-6 h-6 text-[#0066CC] dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">Aplicaciones</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {userApplications.length}
                    </p>
                    <span className="text-[11px] text-gray-400 dark:text-slate-500">en BD</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
                  <Briefcase className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">Entrevistas</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {metrics ? metrics.total_entrevistas : 0}
                    </p>
                    <span className="text-[11px] text-gray-400 dark:text-slate-500">en BD</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="cv-chat" className="font-semibold text-[#0066CC] dark:text-blue-400">
              <Bot className="w-4 h-4 mr-2 text-indigo-500" />
              Chatbot IA
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-black rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white tracking-wider">
                COPILOT
              </span>
            </TabsTrigger>
            <TabsTrigger value="cv-analysis">
              <Brain className="w-4 h-4 mr-2" />
              Análisis IA
            </TabsTrigger>
            <TabsTrigger value="interview-simulator">
              <MessageSquare className="w-4 h-4 mr-2" />
              Simulador
            </TabsTrigger>
            <TabsTrigger value="dress-code">
              <Shirt className="w-4 h-4 mr-2" />
              Vestimenta
            </TabsTrigger>
            <TabsTrigger value="applications">
              Aplicaciones
              {userApplications.length > 0 && (
                <Badge className="ml-2 bg-[#0066CC] text-white text-[10px] px-1.5 py-0">
                  {userApplications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="jobs">Empleos</TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notificaciones
              {notifications.filter(n => !n.leida).length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">
                  {notifications.filter(n => !n.leida).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resources">
              <BookOpen className="w-4 h-4 mr-2" />
              Recursos
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab (Resumen) */}
          <TabsContent value="overview">
            {cvAnalysisSuccess && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-300 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">¡Hoja de Vida registrada y analizada con éxito en PostgreSQL!</p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Tus habilidades han sido detectadas y puedes compararlas en tiempo real contra los requisitos de las empresas.
                  </p>
                </div>
              </div>
            )}

            {applyFeedback && (
              <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm border ${
                applyFeedback.type === 'success'
                  ? 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300'
                  : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
              }`}>
                {applyFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <p className="text-sm font-semibold">{applyFeedback.message}</p>
              </div>
            )}

            {analysisError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm font-medium">{analysisError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Columna Principal (Izquierda): Hoja de Vida Estructurada estilo portal */}
              <div className="lg:col-span-7">
                <StructuredResumeCard
                  candidateName={candidateName}
                  candidateEmail={candidateEmail}
                  candidatePhone={metrics?.telefono || editPhone}
                  candidateCity={candidateCity}
                  candidateCategory={candidateCategory}
                  candidateExperience={candidateExperience}
                  candidateBio={candidateBio}
                  initials={getInitials(candidateName)}
                  fotoPerfilUrl={metrics?.foto_perfil_url}
                  isUploadingAvatar={isUploadingAvatar}
                  onUploadAvatar={handleAvatarUpload}
                  onDeleteAvatar={handleDeleteAvatar}
                  metrics={metrics}
                  detectedSkills={cvAnalysis?.habilidades_detectadas ?? []}
                  isAnalyzingCv={isAnalyzingCv}
                  onOpenEditModal={(tab) => {
                    setEditSectionTab(tab);
                    setIsEditProfileOpen(true);
                  }}
                  onUploadCv={handleCVUpload}
                  onDeleteCv={handleDeleteCV}
                  onViewCover={() => setActiveTab("cv-analysis")}
                  onSaved={() => loadMetrics(candidateEmail)}
                />
              </div>

              {/* Barra Lateral Derecha: Completitud + Diagnóstico IA vs Empleadores */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#0066CC] dark:text-blue-400" />
                      Completitud del Perfil
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-[#0066CC] dark:text-blue-300">
                      {metrics ? metrics.perfil_completitud : 40}%
                    </span>
                  </div>
                  <Progress value={metrics ? metrics.perfil_completitud : 40} className="mb-3 h-2" />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      <span>Datos básicos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                      {metrics?.checklist?.telefono_contacto ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span>Teléfono</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                      {metrics?.checklist?.cv_subido ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span>Hoja de Vida</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                      {candidateLinkedIn || candidateGitHub ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span>GitHub / LinkedIn</span>
                    </div>
                  </div>
                </Card>

                {/* Tarjeta 2: Diagnóstico e Idoneidad con Requerimientos del Empleador */}
                <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Brain className="w-5 h-5 text-[#0066CC] dark:text-blue-400" />
                      Diagnóstico vs Requerimientos del Empleador
                    </h3>
                    {metrics?.checklist?.cv_subido ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                        CV en Base de Datos
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Sin CV Cargado
                      </Badge>
                    )}
                  </div>

                  {/* ESTADO 1: SIN HOJA DE VIDA CARGADA */}
                  {!metrics?.checklist?.cv_subido ? (
                    <div className="space-y-4 py-2">
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-gray-200/80 dark:border-slate-800 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-[#0066CC] dark:text-blue-300 flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-base">
                            Aún no has subido tu Hoja de Vida
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-slate-300 max-w-md mx-auto mt-1 leading-relaxed">
                            Para que la Inteligencia Artificial compare tus datos contra las vacantes activas y te muestre <strong>qué requisitos del empleador cumples y cuáles te hacen falta</strong>, carga tu Hoja de Vida.
                          </p>
                        </div>

                        {/* Opciones de carga */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                          <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0066CC] hover:bg-[#004999] text-white font-medium text-xs cursor-pointer shadow-sm transition-all">
                            <Upload className="w-4 h-4" />
                            {isAnalyzingCv ? "Procesando con IA..." : "Subir Archivo (PDF / Word)"}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.txt"
                              onChange={handleCVUpload}
                              disabled={isAnalyzingCv}
                              className="hidden"
                            />
                          </label>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowTextInput(!showTextInput)}
                            className="w-full sm:w-auto text-xs dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            {showTextInput ? "Ocultar formulario" : "Pegar texto de mi CV"}
                          </Button>
                        </div>
                      </div>

                      {/* Formulario alternativo de texto */}
                      {showTextInput && (
                        <form onSubmit={handleAnalyzeText} className="space-y-3 p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 animate-fade-in">
                          <Label htmlFor="cvText" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                            Pega aquí el contenido de tu Hoja de Vida:
                          </Label>
                          <Textarea
                            id="cvText"
                            rows={4}
                            value={cvText}
                            onChange={(e) => setCvText(e.target.value)}
                            placeholder="Ej: Juan Montes, Desarrollador de Software con experiencia en Python, FastAPI, React, TypeScript y bases de datos PostgreSQL..."
                            className="text-xs"
                            required
                          />
                          <Button
                            type="submit"
                            disabled={isAnalyzingCv}
                            className="w-full bg-[#0066CC] hover:bg-[#004999] text-white text-xs h-9 cursor-pointer"
                          >
                            {isAnalyzingCv ? "Analizando con IA..." : "Guardar y Analizar Hoja de Vida"}
                          </Button>
                        </form>
                      )}

                      {/* Vista previa de requerimientos de empleadores reales */}
                      <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-[#0066CC] dark:text-blue-400" />
                          <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                            Requerimientos reales que solicitan los empleadores:
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-slate-300 mb-3">
                          Empresas registradas buscando aspirantes en PrepIA:
                        </p>
                        <div className="space-y-2">
                          {vacancies.slice(0, 3).map((v) => (
                            <div key={v.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/80 text-xs flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-gray-900 dark:text-white">{v.titulo}</span>
                                <span className="text-gray-500 dark:text-slate-400 ml-2">({v.empresa})</span>
                              </div>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-[#0066CC] dark:text-blue-300 font-medium">
                                {v.requisitos ? v.requisitos.length : 0} requisitos
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ESTADO 2: CON HOJA DE VIDA CARGADA — COMPARACIÓN REAL CONTRA LA VACANTE */
                    <div className="space-y-4">
                      {/* Ficha de la Hoja de Vida del candidato */}
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-slate-900 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">Hoja de Vida activa</span>
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white">{metrics?.cv_nombre || "Hoja_de_Vida.pdf"}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-xs">
                            Puntaje: {metrics?.cv_score || 70}/100
                          </span>
                        </div>
                      </div>

                      {/* Selector interactivo de Vacante para cotejar requisitos */}
                      <div>
                        <Label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 block">
                          Selecciona una vacante para verificar qué requisitos cumples y cuáles te faltan:
                        </Label>
                        <select
                          value={selectedVacancy?.id || ""}
                          onChange={(e) => {
                            const found = vacancies.find(v => v.id === Number(e.target.value));
                            if (found) handleEvaluateForVacancy(found);
                          }}
                          className="w-full text-xs h-10 px-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:border-[#0066CC]"
                        >
                          {vacancies.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.empresa} — {v.titulo} ({v.modalidad})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Diagnóstico específico de la vacante */}
                      {selectedVacancy && (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-slate-400">Empleador: <strong className="text-gray-900 dark:text-white">{selectedVacancy.empresa}</strong></p>
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white">{selectedVacancy.titulo}</h4>
                            </div>
                            {vacancyEvalResult?.match_score !== undefined && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 font-bold text-xs py-1">
                                {vacancyEvalResult.match_score}% de Match con la vacante
                              </Badge>
                            )}
                          </div>

                          {/* Requerimientos que CUMPLES */}
                          <div className="p-3.5 rounded-xl bg-green-50/70 dark:bg-green-950/30 border border-green-200/80 dark:border-green-900/50">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                              <h5 className="font-bold text-xs uppercase tracking-wider text-green-900 dark:text-green-300">
                                Requerimientos del Empleador que CUMPLES:
                              </h5>
                            </div>
                            {vacancyEvalResult?.requisitos_cumplidos && vacancyEvalResult.requisitos_cumplidos.length > 0 ? (
                              <ul className="space-y-1.5 text-xs text-green-950 dark:text-green-200">
                                {vacancyEvalResult.requisitos_cumplidos.map((req, rIdx) => (
                                  <li key={rIdx} className="flex items-start gap-2">
                                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                                    <span>{req}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-green-800 dark:text-green-300 italic">
                                Sube una versión con más detalle técnico para detectar coincidencias exactas.
                              </p>
                            )}
                          </div>

                          {/* Requerimientos que TE FALTAN */}
                          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <h5 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300">
                                Requerimientos que TE FALTAN según el empleador:
                              </h5>
                            </div>
                            {vacancyEvalResult?.requisitos_faltantes && vacancyEvalResult.requisitos_faltantes.length > 0 ? (
                              <ul className="space-y-1.5 text-xs text-amber-950 dark:text-amber-200">
                                {vacancyEvalResult.requisitos_faltantes.map((gap, gIdx) => (
                                  <li key={gIdx} className="flex items-start gap-2">
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                                    <span>{gap}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                                ¡Cumples con todos los requerimientos clave solicitados por este empleador!
                              </p>
                            )}
                          </div>

                          {/* Botón de Postulación a esta vacante */}
                          <div className="pt-2 flex items-center justify-between gap-3">
                            {userApplications.some(a => a.vacante_id === selectedVacancy.id) ? (
                              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 w-full justify-center">
                                <CheckCircle className="w-4 h-4" />
                                Ya te has postulado a esta vacante (Registrado en Base de Datos)
                              </div>
                            ) : (
                              <Button
                                onClick={() => handleApplyToVacancy(selectedVacancy.id)}
                                disabled={isApplying}
                                className="w-full bg-[#0066CC] hover:bg-[#004999] text-white text-xs h-10 font-semibold rounded-xl cursor-pointer shadow-sm"
                              >
                                <Briefcase className="w-4 h-4 mr-2" />
                                {isApplying ? "Guardando postulación en BD..." : `Postularme a ${selectedVacancy.empresa}`}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Enlace directo para chatear con el Copilot IA */}
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between gap-3 mt-2">
                        <div className="flex items-center gap-2.5">
                          <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <p className="text-xs text-gray-700 dark:text-slate-300">
                            ¿Dudas sobre cómo cumplir los requisitos que te faltan?
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setActiveTab("cv-chat")}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 px-3 rounded-lg cursor-pointer shrink-0 shadow-xs"
                        >
                          Abrir Chatbot
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pie de tarjeta con acción de re-evaluación */}
                {metrics?.checklist?.cv_subido && (
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-gray-500 dark:text-slate-400">
                      Conectado a PostgreSQL
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-[#0066CC] dark:text-blue-400 hover:underline font-semibold cursor-pointer flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Subir nueva versión
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleCVUpload}
                          disabled={isAnalyzingCv}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleDeleteCV}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar CV
                      </button>
                    </div>
                  </div>
                )}
              </Card>

                {/* Cómo mejorar mi Hoja de Vida */}
                <Card className="p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Cómo mejorar mi Hoja de Vida
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab("cv-analysis")}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 hover:border-[#0066CC] flex items-center justify-between text-left cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">Ver portada y diagnóstico IA</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">Revisa fortalezas y brechas detectadas</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("interview-simulator")}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 hover:border-[#0066CC] flex items-center justify-between text-left cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">Practicar entrevista con IA</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">Prepárate según tu área profesional</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                </Card>

                {/* Consentimiento de Análisis con IA Externa */}
                <Card className="p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 shrink-0 ${iaConsentAccepted ? "text-emerald-500" : "text-amber-500"}`} />
                      Consentimiento IA Externa
                    </h4>
                    <Badge className={`text-[10px] px-2 py-0.5 border-0 ${
                      iaConsentAccepted
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}>
                      {iaConsentAccepted ? "Autorizado" : "Pendiente"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                    {iaConsentAccepted
                      ? "Tu CV anonimizado se analizará con IA externa (Gemini) al postularte a vacantes."
                      : "Autoriza el envío de tu CV anonimizado a Gemini para análisis de afinidad con IA real en tus postulaciones."}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isTogglingConsent}
                    onClick={() => handleToggleAIConsent(!iaConsentAccepted)}
                    className={`w-full font-semibold cursor-pointer ${
                      iaConsentAccepted
                        ? "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700"
                        : "bg-[#0066CC] hover:bg-blue-700 text-white"
                    }`}
                  >
                    {isTogglingConsent
                      ? "Guardando..."
                      : iaConsentAccepted
                        ? "Revocar autorización de IA"
                        : "Autorizar análisis con IA (1 clic)"}
                  </Button>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Chatbot IA Tab */}
          <TabsContent value="cv-chat">
            <Card className="bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-md rounded-2xl overflow-hidden flex flex-col h-[700px]">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white dark:from-slate-900 dark:via-[#141d33] dark:to-slate-900 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0066CC] to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">Asistente IA PrepIA — Auditor de Hoja de Vida</h3>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> En línea
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Auditando: <strong className="text-gray-700 dark:text-slate-200">{metrics?.checklist?.cv_subido ? (metrics.cv_nombre || "CV en base de datos") : "Sin CV registrado aún"}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 dark:bg-blue-950 text-[#0066CC] dark:text-blue-300 font-bold text-xs py-1 px-3">
                    {metrics?.checklist?.cv_subido && metrics?.cv_score ? `Puntaje: ${metrics.cv_score}/100` : "Sin evaluar"}
                  </Badge>
                </div>
              </div>

              {/* Sugerencias Rápidas */}
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-900/60 border-b border-gray-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
                <span className="text-gray-400 dark:text-slate-500 shrink-0 font-medium text-[11px]">Consultas en BD:</span>
                {vacancies[0] && (
                  <button
                    type="button"
                    onClick={() => handleSendChatMessage(`¿Qué requisitos me faltan para ${vacancies[0].empresa}?`)}
                    className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-[#0066CC] dark:hover:border-blue-400 shrink-0 cursor-pointer transition-colors"
                  >
                    ⚡ Match con {vacancies[0].empresa}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSendChatMessage("¿Qué vacantes abiertas tienen mejor match con mi CV?")}
                  className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-[#0066CC] dark:hover:border-blue-400 shrink-0 cursor-pointer transition-colors"
                >
                  💼 Vacantes con mejor match
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage("¿Cómo está mi perfil y qué datos me faltan en PostgreSQL?")}
                  className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-[#0066CC] dark:hover:border-blue-400 shrink-0 cursor-pointer transition-colors"
                >
                  📋 Estado de mi perfil
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage("¿Cómo van mis postulaciones?")}
                  className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-[#0066CC] dark:hover:border-blue-400 shrink-0 cursor-pointer transition-colors"
                >
                  📨 Mis postulaciones
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage("¿Qué habilidades detectaste en mi hoja de vida?")}
                  className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-[#0066CC] dark:hover:border-blue-400 shrink-0 cursor-pointer transition-colors"
                >
                  🛠️ Habilidades de mi CV
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage("Simula una pregunta técnica basada en mi perfil")}
                  className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-[#0066CC] dark:hover:border-blue-400 shrink-0 cursor-pointer transition-colors"
                >
                  🎙️ Pregunta técnica
                </button>
              </div>

              {/* Mensajes del Chat */}
              <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                        msg.sender === 'user'
                          ? 'bg-[#0066CC] text-white rounded-tr-xs'
                          : 'bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-800 dark:text-slate-100 rounded-tl-xs whitespace-pre-line'
                      }`}
                    >
                      <p className="font-normal">{msg.text}</p>
                      <span className={`block text-[10px] mt-2 ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'}`}>
                        {msg.time}
                      </span>
                    </div>

                    {msg.sender === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-[#0066CC] text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-sm mt-1">
                        {getInitials(candidateName)}
                      </div>
                    )}
                  </div>
                ))}

                {isBotThinking && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-3 text-xs text-gray-600 dark:text-slate-300 flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                      <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">El Auditor de IA está analizando los requerimientos...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="p-3 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-[#141d33] flex items-center gap-2"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribe tu pregunta sobre tu CV o vacantes (ej: ¿qué me hace falta para TechNova?)..."
                  disabled={isBotThinking}
                  className="flex-1 text-xs h-10 rounded-xl"
                />
                <Button
                  type="submit"
                  disabled={!chatInput.trim() || isBotThinking}
                  className="bg-[#0066CC] hover:bg-[#004999] text-white h-10 px-4 rounded-xl cursor-pointer"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  Preguntar
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* CV Analysis Tab */}
          <TabsContent value="cv-analysis">
            <Card className="p-6 mb-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#0066CC]/10 p-3 rounded-xl">
                  <Brain className="w-6 h-6 text-[#0066CC] dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Análisis de CV con Inteligencia Artificial</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300">Sube tu CV para diagnosticar si eres apto para vacantes tecnológicas</p>
                </div>
              </div>

              <div className={`mb-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                iaConsentAccepted
                  ? "bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900/60"
                  : "bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/60"
              }`}>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className={`w-5 h-5 mt-0.5 shrink-0 ${
                    iaConsentAccepted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                  }`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {iaConsentAccepted
                        ? "Análisis con IA externa (Gemini) autorizado"
                        : "Autoriza el análisis con IA externa (Gemini)"}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-300">
                      {iaConsentAccepted
                        ? "Tus postulaciones enviarán el texto anonimizado de tu CV a Gemini."
                        : "Actívalo en 1 clic para que tus postulaciones usen Gemini en lugar del motor local."}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={isTogglingConsent}
                  onClick={() => handleToggleAIConsent(!iaConsentAccepted)}
                  className={`shrink-0 font-semibold cursor-pointer ${
                    iaConsentAccepted
                      ? "bg-white hover:bg-gray-100 text-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700"
                      : "bg-[#0066CC] hover:bg-blue-700 text-white"
                  }`}
                >
                  {isTogglingConsent
                    ? "Guardando..."
                    : iaConsentAccepted
                      ? "Revocar permiso IA"
                      : "Autorizar IA externa"}
                </Button>
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-8 text-center mb-6 hover:border-[#0066CC] transition-colors">
                <input
                  type="file"
                  id="cv-upload-tab"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleCVUpload}
                  disabled={isAnalyzingCv}
                  className="hidden"
                />
                <label htmlFor="cv-upload-tab" className="cursor-pointer block">
                  <Upload className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
                  <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                    {metrics?.cv_nombre || "Arrastra tu CV aquí o haz clic para seleccionar"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">PDF, DOC, DOCX o TXT — Procesado con el motor de IA de PrepIA</p>
                </label>
              </div>

              {isAnalyzingCv && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0066CC] mx-auto mb-3"></div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Evaluando idoneidad de tu CV con la API...</p>
                </div>
              )}
            </Card>

            {metrics?.checklist?.cv_subido && cvAnalysis ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Portada del Documento Subido */}
                <Card className="lg:col-span-4 p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-[#0066CC] shrink-0" />
                      <span className="truncate">Portada del Documento</span>
                    </h3>
                    <Badge variant="outline" className="text-[10px] uppercase shrink-0 dark:border-slate-700">
                      {(metrics.cv_nombre?.split(".").pop() || "DOC").slice(0, 6)}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate" title={metrics.cv_nombre || ""}>
                    {metrics.cv_nombre}
                  </p>

                  <div
                    className="aspect-[3/4] w-full rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-inner"
                    style={{ backgroundColor: "#ffffff" }}
                  >
                    {metrics.cv_portada_url && !coverImageFailed ? (
                      <img
                        src={metrics.cv_portada_url}
                        alt="Portada de la Hoja de Vida"
                        onError={() => setCoverImageFailed(true)}
                        onClick={() => setIsCoverZoomOpen(true)}
                        style={{ backgroundColor: "#ffffff" }}
                        className="w-full h-full object-contain object-top cursor-zoom-in"
                      />
                    ) : metrics.cv_archivo_url && /\.pdf$/i.test(metrics.cv_nombre || "") ? (
                      <iframe
                        src={`${metrics.cv_archivo_url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                        title="Portada de la Hoja de Vida"
                        className="w-full h-full border-0 bg-white"
                      />
                    ) : (
                      <div
                        className="w-full h-full p-4 overflow-hidden flex flex-col"
                        style={{ backgroundColor: "#ffffff", color: "#111827" }}
                      >
                        <div className="border-b border-gray-200 pb-2 mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#0066CC] truncate">
                            {metrics.cv_nombre || "Hoja de Vida"}
                          </span>
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            Vista previa
                          </span>
                        </div>
                        <p
                          className="text-[10px] leading-relaxed whitespace-pre-line overflow-hidden"
                          style={{ color: "#374151" }}
                        >
                          {metrics.cv_preview_text || "Documento procesado en PrepIA."}
                        </p>
                      </div>
                    )}
                  </div>

                  {metrics.cv_archivo_url && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <a
                        href={`${metrics.cv_archivo_url}&download=true`}
                        download={metrics.cv_nombre || undefined}
                        className="text-xs text-gray-600 dark:text-slate-300 hover:text-[#0066CC] inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> Descargar
                      </a>
                      {metrics.cv_portada_url && !coverImageFailed ? (
                        <button
                          type="button"
                          onClick={() => setIsCoverZoomOpen(true)}
                          className="text-xs font-semibold text-[#0066CC] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          Ampliar portada <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <a
                          href={metrics.cv_archivo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[#0066CC] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          Ver completo <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </Card>

                {/* Diagnóstico IA */}
                <div className="lg:col-span-8 space-y-6">
                  <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-[#0066CC] w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                          <span className="text-2xl font-extrabold text-white">{cvAnalysis.score}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Puntuación del CV</h3>
                          <p className="text-xs font-semibold text-[#0066CC] dark:text-blue-400 mt-0.5">
                            {cvAnalysis.nivel_aptitud}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={`px-4 py-1.5 ${
                          cvAnalysis.es_apto
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {cvAnalysis.es_apto ? "Apto para Postulación" : "Requiere Fortalecimiento"}
                      </Badge>
                    </div>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                      <h3 className="text-lg font-bold mb-4 text-green-700 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Fortalezas Detectadas
                      </h3>
                      <ul className="space-y-3">
                        {cvAnalysis.puntos_fuertes.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-gray-700 dark:text-slate-300">
                            <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                      <h3 className="text-lg font-bold mb-4 text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Áreas de Mejora
                      </h3>
                      <ul className="space-y-2 mb-4">
                        {cvAnalysis.elementos_faltantes.map((gap, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-amber-950 dark:text-amber-200">
                            <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                </div>
              </div>
            ) : (
              <Card className="p-8 text-center bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                <p className="text-gray-600 dark:text-slate-300 text-sm">
                  Carga tu archivo de Hoja de Vida arriba para generar tu informe de idoneidad, fortalezas y recomendaciones.
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Interview Simulator Tab */}
          <TabsContent value="interview-simulator">
            <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 dark:bg-purple-950/60 p-3 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Simulador de Entrevistas con IA</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300">Practica con preguntas reales y recibe retroalimentación instantánea</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-900/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Cómo funciona</h4>
                  </div>
                  <ol className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                    <li className="flex gap-2">
                      <span className="font-bold text-purple-600 dark:text-purple-400">1.</span>
                      <span>Inicia una nueva entrevista simulada</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-purple-600 dark:text-purple-400">2.</span>
                      <span>La IA te hará preguntas típicas de tu sector</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-purple-600 dark:text-purple-400">3.</span>
                      <span>Responde como si fuera una entrevista real</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-purple-600 dark:text-purple-400">4.</span>
                      <span>Recibe feedback detallado y puntuación</span>
                    </li>
                  </ol>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30 border border-green-200 dark:border-green-900/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Historial de Entrevistas</h4>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {interviewHistory.length} completadas
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Promedio general: {interviewHistory.length > 0 ? "8.5/10" : "Sin intentos aún"}
                  </p>
                </Card>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={startInterview} 
                  className="bg-[#0066CC] hover:bg-[#004999] text-white cursor-pointer"
                >
                  {interviewQuestion ? "Cambiar Pregunta" : "Iniciar Nueva Entrevista"}
                </Button>

                {interviewQuestion && (
                  <div className="space-y-4 border border-gray-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900/60">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl">
                      <p className="font-medium text-xs text-[#0066CC] dark:text-blue-300 uppercase tracking-wider mb-1">Pregunta del Entrevistador:</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{interviewQuestion}</p>
                    </div>

                    <div>
                      <Label htmlFor="interview-answer" className="text-xs font-semibold mb-1 block">Tu Respuesta:</Label>
                      <Textarea
                        id="interview-answer"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Escribe tu respuesta estructurada utilizando el método STAR..."
                        rows={4}
                        className="text-xs"
                      />
                    </div>

                    <Button 
                      onClick={submitAnswer} 
                      disabled={!userAnswer.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    >
                      Enviar Respuesta y Recibir Feedback
                    </Button>

                    {aiFeedback && (
                      <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-xl animate-fade-in">
                        <p className="font-bold text-xs text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-2">Evaluación de la IA:</p>
                        <p className="text-xs text-gray-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">{aiFeedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Dress Code Tab */}
          <TabsContent value="dress-code" className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-[#0066CC] dark:text-blue-400">
                  <Shirt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Guía Visual de Vestimenta por Género y Formalidad
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Compara el nivel de formalidad adecuado según la cultura de la empresa
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Formal Hombres */}
                <Card className="overflow-hidden bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="relative h-60 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80"
                        alt="Hombre con traje formal para entrevista"
                        className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-slate-900/90 text-white font-semibold text-[11px] backdrop-blur-xs">
                          Formal Ejecutivo
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                        ✓
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base">Hombres — Traje Clásico</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Banca, Leyes, Cargos Directivos</p>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300">
                        <p className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase tracking-wider">Aciertos clave:</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Traje completo en azul marino o gris oxford.</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Camisa blanca o celeste lisa de manga larga.</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Corbata sobria de nudo simétrico y calzado de cuero.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 text-[11px] text-red-800 dark:text-red-300">
                      <strong>Evitar:</strong> Zapatillas deportivas, corbatas llamativas, trajes arrugados.
                    </div>
                  </div>
                </Card>

                {/* 2. Semi-Formal Hombres */}
                <Card className="overflow-hidden bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="relative h-60 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80"
                        alt="Hombre semi-formal estilo tech"
                        className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-blue-600/90 text-white font-semibold text-[11px] backdrop-blur-xs">
                          Semi-Formal / Tech
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                        ✓
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base">Hombres — Smart Casual</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Software, Startups, Consultoría</p>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300">
                        <p className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase tracking-wider">Aciertos clave:</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Pantalón chino o drill en tonos beige, azul o gris.</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Camisa abotonada (sin corbata) o polo liso.</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Blazer desestructurado y mocasines o calzado pulcro.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 text-[11px] text-red-800 dark:text-red-300">
                      <strong>Evitar:</strong> Camisetas con estampados grandes, jeans rotos, gorras.
                    </div>
                  </div>
                </Card>

                {/* 3. Formal Mujeres */}
                <Card className="overflow-hidden bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="relative h-60 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80"
                        alt="Mujer con traje formal para entrevista"
                        className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-slate-900/90 text-white font-semibold text-[11px] backdrop-blur-xs">
                          Formal Ejecutivo
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                        ✓
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base">Mujeres — Traje Ejecutivo</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Sector Financiero, Gerencia, Legal</p>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300">
                        <p className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase tracking-wider">Aciertos clave:</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Traje sastre de pantalón o falda formal a la rodilla.</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Blusa en tonos neutros sin escotes pronunciados.</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Calzado cerrado de tacón medio o mocasines ejecutivos.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 text-[11px] text-red-800 dark:text-red-300">
                      <strong>Evitar:</strong> Joyería excesiva, colores fluorescentes, minifaldas.
                    </div>
                  </div>
                </Card>

                {/* 4. Semi-Formal Mujeres */}
                <Card className="overflow-hidden bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="relative h-60 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=800&q=80"
                        alt="Mujer semi-formal moderna para entrevista"
                        className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-blue-600/90 text-white font-semibold text-[11px] backdrop-blur-xs">
                          Smart Casual / Tech
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                        ✓
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base">Mujeres — Smart Casual</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Tecnología, Diseño, Marketing</p>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300">
                        <p className="font-semibold text-gray-900 dark:text-white text-[11px] uppercase tracking-wider">Aciertos clave:</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Pantalón de vestir recto o falda profesional estilizada.</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Blusa elegante o suéter fino de punto en tonos cálidos.</p>
                        <p className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Blazer contemporáneo con accesorios discretos y armoniosos.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 text-[11px] text-red-800 dark:text-red-300">
                      <strong>Evitar:</strong> Sandalias de playa, prendas transparentes o maquillaje sobrecargado.
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Códigos Visuales de Vestimenta por Sector Laboral */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Vestimenta por Sector y Tipo de Trabajo
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Adecúa tu atuendo a la cultura real del sector donde te vas a postular
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Sector 1: Tecnología */}
                <Card className="overflow-hidden bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                      alt="Equipo de tecnología en oficina moderna"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-3 left-4">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500 text-white">
                        Tecnología / Software
                      </span>
                      <h4 className="text-white font-bold text-base mt-1">Startups & Empresas Tech</h4>
                    </div>
                  </div>
                  <div className="p-5 text-xs text-gray-700 dark:text-slate-300 space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-white">Código: Smart Casual Profesional</p>
                    <p className="leading-relaxed">
                      El sector tecnológico valora la practicidad. Para la entrevista, camisa abotonada lisa o polo premium con pantalón de vestir o chinos genera el equilibrio perfecto entre accesibilidad e idoneidad técnica.
                    </p>
                  </div>
                </Card>

                {/* Sector 2: Salud */}
                <Card className="overflow-hidden bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80"
                      alt="Profesional de salud y enfermería"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-3 left-4">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500 text-white">
                        Salud / Enfermería
                      </span>
                      <h4 className="text-white font-bold text-base mt-1">Hospitales & Clínicas</h4>
                    </div>
                  </div>
                  <div className="p-5 text-xs text-gray-700 dark:text-slate-300 space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-white">Código: Formal Clínico / Pulcritud Máxima</p>
                    <p className="leading-relaxed">
                      La higiene y la pulcritud son determinantes. Usa traje formal sobrio. Cabello recogido, uñas cortas sin esmaltes llamativos, calzado cerrado y cero accesorios metálicos o colgantes.
                    </p>
                  </div>
                </Card>

                {/* Sector 3: Finanzas */}
                <Card className="overflow-hidden bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80"
                      alt="Distrito financiero corporativo"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-3 left-4">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500 text-white">
                        Banca & Corporativo
                      </span>
                      <h4 className="text-white font-bold text-base mt-1">Finanzas, Seguros & Legal</h4>
                    </div>
                  </div>
                  <div className="p-5 text-xs text-gray-700 dark:text-slate-300 space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-white">Código: Formal Estricto</p>
                    <p className="leading-relaxed">
                      Rigurosidad y sobriedad absoluta. Traje sastre completo de dos piezas (azul noche, grafito o negro), corbata tradicional para hombres, zapatos de vestir pulcros y portafolio sobrio.
                    </p>
                  </div>
                </Card>

                {/* Sector 4: Industria y Operaciones */}
                <Card className="overflow-hidden bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
                      alt="Ingeniero en planta industrial"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-3 left-4">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500 text-white">
                        Industria & Operaciones
                      </span>
                      <h4 className="text-white font-bold text-base mt-1">Ingeniería, Mecánica & Planta</h4>
                    </div>
                  </div>
                  <div className="p-5 text-xs text-gray-700 dark:text-slate-300 space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-white">Código: Semi-Formal Operativo</p>
                    <p className="leading-relaxed">
                      Camisa manga larga de drill o faena impecable, pantalón de trabajo formal sin roturas, calzado de seguridad lustrado o botas limpias. Demuestra disposición operativa con pulcritud técnica.
                    </p>
                  </div>
                </Card>

                {/* Sector 5: Educación */}
                <Card className="overflow-hidden bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80"
                      alt="Docente y educadora en aula"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-3 left-4">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-pink-500 text-white">
                        Educación & Pedagogía
                      </span>
                      <h4 className="text-white font-bold text-base mt-1">Colegios, SENA & Universidades</h4>
                    </div>
                  </div>
                  <div className="p-5 text-xs text-gray-700 dark:text-slate-300 space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-white">Código: Formal Accesible</p>
                    <p className="leading-relaxed">
                      Pantalón de vestir, blusa o camisa de cuello, blazer opcional. Proyecta empatía, respeto pedagógico y autoridad académica sin parecer distante.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Mis Aplicaciones ({userApplications.length})
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Historial de postulaciones registradas en tiempo real en la base de datos PostgreSQL
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveTab("jobs")}
                  className="bg-[#0066CC] hover:bg-[#004999] text-white text-xs cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                  Ver Más Vacantes
                </Button>
              </div>

              <div className="space-y-4">
                {userApplications.length === 0 ? (
                  <div className="p-10 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl space-y-3">
                    <Briefcase className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto" />
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-slate-200 text-base">
                        No tienes postulaciones activas registradas en la base de datos
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                        Carga tu Hoja de Vida, revisa las vacantes disponibles de las empresas y postúlate para iniciar tu proceso.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("jobs")}
                      className="bg-[#0066CC] hover:bg-[#004999] text-white text-xs cursor-pointer mt-2"
                    >
                      Explorar Vacantes Disponibles
                    </Button>
                  </div>
                ) : (
                  userApplications.map((app) => (
                    <div key={app.id} className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start flex-wrap gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-[#0066CC] dark:text-blue-300">
                            {app.company}
                          </span>
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white mt-1.5">{app.position}</h4>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Postulación registrada: {app.date}</p>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="flex items-center gap-2 justify-end">
                            <Badge className="bg-emerald-500 text-white font-semibold">
                              {app.status || "En revisión"}
                            </Badge>
                          </div>
                          {app.match && (
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              Match CV: <strong className="text-[#0066CC] dark:text-blue-400">{app.match}%</strong>
                            </p>
                          )}
                          <div>
                            <button
                              type="button"
                              onClick={() => handleWithdrawApp(app.id)}
                              className="text-[11px] text-red-500 hover:underline cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <Trash2 className="w-3 h-3" />
                              Retirar postulación
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Jobs Tab (Búsqueda estilo CompuTrabajo conectada a PostgreSQL) */}
          <TabsContent value="jobs">
            <JobSearchExplorer
              vacancies={vacancies}
              userApplications={userApplications}
              hasCv={Boolean(metrics?.checklist?.cv_subido)}
              selectedVacancy={selectedVacancy}
              onSelectVacancy={(vac) => {
                setSelectedVacancy(vac);
                setApplyFeedback(null);
              }}
              evaluation={vacancyEvalResult}
              isEvaluating={isEvaluatingVacancy}
              onEvaluateVacancy={handleEvaluateForVacancy}
              isApplying={isApplying}
              onApplyToVacancy={handleApplyToVacancy}
              applyFeedback={applyFeedback}
              onGoToUploadCv={() => setActiveTab("overview")}
              iaConsentAccepted={iaConsentAccepted}
              isTogglingConsent={isTogglingConsent}
              onToggleAIConsent={handleToggleAIConsent}
            />
          </TabsContent>

          {/* Notifications Tab - Conectado a PostgreSQL (click para desplegar y postularse) */}
          <TabsContent value="notifications">
            <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Notificaciones ({notifications.length})
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Haz clic en una notificación para desplegar los detalles de la empresa interesada y postularte.
                  </p>
                </div>
              </div>

              {applyFeedback && (
                <div className={`mb-4 p-3.5 rounded-xl flex items-center gap-2.5 text-sm border ${
                  applyFeedback.type === 'success'
                    ? 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300'
                    : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                }`}>
                  {applyFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{applyFeedback.message}</span>
                </div>
              )}

              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">
                    No tienes notificaciones por ahora
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Cuando una empresa muestre interés en tu perfil profesional o te invite a una vacante, la verás aquí para desplegarla y postularte.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => {
                    const isExpanded = expandedNotifId === notif.id;
                    const vacantesRelacionadas: CandidateNotificationVacancy[] = notif.vacante
                      ? [notif.vacante]
                      : notif.empresa_vacantes || [];

                    const handleNotifClick = async () => {
                      const nextExpanded = isExpanded ? null : notif.id;
                      setExpandedNotifId(nextExpanded);
                      if (!notif.leida) {
                        setNotifications((prev) =>
                          prev.map((item) => (item.id === notif.id ? { ...item, leida: true } : item))
                        );
                        await apiMarkNotificationRead(notif.id, candidateEmail);
                      }
                    };

                    return (
                      <div
                        key={notif.id}
                        className={`border-l-4 rounded-xl border transition-all ${
                          notif.leida
                            ? 'border-gray-200 dark:border-slate-800 border-l-gray-300 dark:border-l-slate-700 bg-gray-50 dark:bg-slate-900/60'
                            : 'border-blue-200 dark:border-blue-900 border-l-[#0066CC] bg-blue-50/70 dark:bg-blue-950/30'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={handleNotifClick}
                          className="w-full p-4 text-left flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Bell
                              className={`w-5 h-5 mt-0.5 shrink-0 ${
                                notif.leida ? 'text-gray-400 dark:text-slate-500' : 'text-[#0066CC] dark:text-blue-400'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm ${notif.leida ? 'text-gray-700 dark:text-slate-300' : 'text-gray-900 dark:text-white font-semibold'}`}>
                                  {notif.titulo}
                                </p>
                                {!notif.leida && (
                                  <Badge className="bg-[#0066CC] text-white text-[10px] px-1.5 py-0">Nueva</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                {notif.created_at ? notif.created_at.slice(0, 10) : 'Reciente'}
                                {notif.empresa ? ` · ${notif.empresa.nombre}` : ''}
                              </p>
                            </div>
                          </div>

                          <ChevronDown
                            className={`w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-gray-200/70 dark:border-slate-800 space-y-4">
                            {notif.empresa && (
                              <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-gray-600 dark:text-slate-300">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-[#0066CC] dark:text-blue-400">
                                  <Building2 className="w-4 h-4" />
                                  {notif.empresa.nombre} · {notif.empresa.sector}
                                </span>
                              </div>
                            )}

                            {notif.mensaje && (
                              <p className="text-sm text-gray-700 dark:text-slate-200 bg-white dark:bg-[#141d33] p-3.5 rounded-xl border border-gray-200 dark:border-slate-800">
                                {notif.mensaje}
                              </p>
                            )}

                            {vacantesRelacionadas.length > 0 ? (
                              <div className="space-y-3">
                                {vacantesRelacionadas.map((vac) => {
                                  const alreadyApplied =
                                    vac.ya_postulado || userApplications.some((a) => a.vacante_id === vac.id);

                                  return (
                                    <div
                                      key={vac.id}
                                      className="p-4 rounded-xl bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-3"
                                    >
                                      <div className="flex items-start justify-between flex-wrap gap-2">
                                        <div>
                                          <h5 className="font-bold text-base text-gray-900 dark:text-white">
                                            {vac.titulo}
                                          </h5>
                                          <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-400 mt-1">
                                            <span className="inline-flex items-center gap-1">
                                              <MapPin className="w-3.5 h-3.5" />
                                              {vac.ciudad} ({vac.modalidad})
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                              <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                                              {vac.salario}
                                            </span>
                                            <span>{vac.experiencia} · {vac.tipo_contrato}</span>
                                          </div>
                                        </div>

                                        {alreadyApplied ? (
                                          <Badge className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Postulado
                                          </Badge>
                                        ) : vac.estado === 'abierta' ? (
                                          <Button
                                            size="sm"
                                            disabled={isApplying}
                                            onClick={() => {
                                              if (vac.preguntas_filtro && vac.preguntas_filtro.length > 0) {
                                                const matchVac = vacancies.find((item) => item.id === vac.id);
                                                if (matchVac) setSelectedVacancy(matchVac);
                                                window.history.replaceState(null, "", `#vacante-${vac.id}`);
                                                setActiveTab("jobs");
                                                setApplyFeedback({
                                                  type: "error",
                                                  message: "Esta vacante incluye preguntas filtro. Responde las preguntas al hacer clic en Postularme.",
                                                });
                                              } else {
                                                handleApplyToVacancy(vac.id);
                                              }
                                            }}
                                            className="bg-[#0066CC] hover:bg-[#004999] text-white text-xs cursor-pointer"
                                          >
                                            <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                                            {isApplying ? 'Postulando...' : 'Postularme'}
                                          </Button>
                                        ) : (
                                          <Badge variant="outline" className="text-xs">
                                            Vacante {vac.estado}
                                          </Badge>
                                        )}
                                      </div>

                                      {vac.descripcion && (
                                        <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                                          {vac.descripcion}
                                        </p>
                                      )}

                                      {vac.requisitos.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                          {vac.requisitos.map((req, rIdx) => (
                                            <span
                                              key={rIdx}
                                              className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                                            >
                                              • {req}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                  Esta empresa aún no tiene vacantes aprobadas vinculadas a esta notificación.
                                </p>
                                <Button size="sm" variant="outline" onClick={() => setActiveTab('jobs')}>
                                  Explorar Empleos
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Resources Tab Content - Conectado a PostgreSQL */}
          <TabsContent value="resources" className="space-y-8">
            <div className="bg-gradient-to-r from-[#0066CC] to-[#004999] rounded-2xl p-6 text-white shadow-lg">
              <h2 className="text-2xl font-bold mb-2">Recursos de Preparación para Candidatos</h2>
              <p className="text-blue-100 text-sm max-w-2xl">
                Materiales reales publicados en PrepIA: guías de estudio, videos y plantillas disponibles para ver y descargar.
              </p>
            </div>

            {prepResources.length === 0 ? (
              <Card className="p-10 text-center bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Aún no hay material publicado
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-5 max-w-lg mx-auto">
                  Todavía no se han cargado guías, videos ni plantillas en la base de datos. Mientras tanto, puedes usar el Análisis IA de CV o el Simulador de Entrevistas.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={() => setActiveTab("cv-analysis")} className="bg-[#0066CC] hover:bg-[#004999] text-white">
                    Ir a Análisis IA
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("interview-simulator")} className="dark:border-slate-700">
                    Ir a Simulador
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-8">
                {(
                  [
                    {
                      category: "Guías de Estudio",
                      icon: BookOpen,
                      color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60",
                    },
                    {
                      category: "Videos Tutoriales",
                      icon: Video,
                      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60",
                    },
                    {
                      category: "Plantillas Profesionales",
                      icon: FileText,
                      color: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60",
                    },
                  ] as const
                ).map((cat) => {
                  const items = prepResources.filter((r) => r.categoria === cat.category);
                  if (items.length === 0) return null;
                  const IconComponent = cat.icon;
                  return (
                    <div key={cat.category} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${cat.color}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {cat.category}
                        </h3>
                      </div>

                      <div className="grid md:grid-cols-3 gap-5">
                        {items.map((item) => {
                          const viewUrl = item.archivo_url || item.url_externa || "#";
                          const downloadUrl = item.archivo_url ? `${item.archivo_url}?download=true` : null;
                          return (
                            <Card
                              key={item.id}
                              className="p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-[#0066CC] dark:text-blue-300">
                                    {item.tipo}
                                  </span>
                                </div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-base leading-snug mb-2">
                                  {item.titulo}
                                </h4>
                                {item.descripcion && (
                                  <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mb-4">
                                    {item.descripcion}
                                  </p>
                                )}
                              </div>

                              <div className="pt-3 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                {downloadUrl ? (
                                  <a href={downloadUrl} download={item.nombre_archivo || undefined}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-8 gap-1.5 dark:border-slate-700 dark:text-slate-200 hover:text-[#0066CC] dark:hover:text-blue-400"
                                    >
                                      <Download className="w-3.5 h-3.5" /> Descargar
                                    </Button>
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-gray-400">Enlace externo</span>
                                )}
                                <a
                                  href={viewUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-gray-500 dark:text-slate-400 hover:text-[#0066CC] dark:hover:text-blue-400 flex items-center gap-1"
                                >
                                  <span>Ver</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Vista Ampliada de la Portada del CV */}
      {isCoverZoomOpen && metrics?.cv_portada_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          onClick={() => setIsCoverZoomOpen(false)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[92vh] rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col"
            style={{ backgroundColor: "#ffffff" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <span className="text-sm font-bold text-gray-900 truncate">
                {metrics.cv_nombre}
              </span>
              <div className="flex items-center gap-3">
                {metrics.cv_archivo_url && (
                  <a
                    href={`${metrics.cv_archivo_url}&download=true`}
                    download={metrics.cv_nombre || undefined}
                    className="text-xs font-semibold text-[#0066CC] hover:underline inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar original
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsCoverZoomOpen(false)}
                  className="p-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-3 flex justify-center" style={{ backgroundColor: "#f3f4f6" }}>
              <img
                src={metrics.cv_portada_url}
                alt="Portada completa de la Hoja de Vida"
                className="max-w-full h-auto shadow-md rounded"
                style={{ backgroundColor: "#ffffff" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Integral para Editar TODOS los Datos del Perfil */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Editar Datos del Perfil
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Actualiza tu información personal, área profesional, rol, ubicación y enlaces. Se guarda en tiempo real en PostgreSQL.
              </p>
            </div>

            {/* Pestañas internas del Modal para organizar los datos */}
            <div className="flex border-b border-gray-200 dark:border-slate-800 mb-6 gap-6 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setEditSectionTab("personal")}
                className={`pb-3 cursor-pointer transition-colors border-b-2 ${
                  editSectionTab === "personal"
                    ? "border-[#0066CC] text-[#0066CC] dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-300"
                }`}
              >
                1. Información Personal
              </button>
              <button
                type="button"
                onClick={() => setEditSectionTab("profesional")}
                className={`pb-3 cursor-pointer transition-colors border-b-2 ${
                  editSectionTab === "profesional"
                    ? "border-[#0066CC] text-[#0066CC] dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-300"
                }`}
              >
                2. Perfil y Experiencia
              </button>
              <button
                type="button"
                onClick={() => setEditSectionTab("enlaces")}
                className={`pb-3 cursor-pointer transition-colors border-b-2 ${
                  editSectionTab === "enlaces"
                    ? "border-[#0066CC] text-[#0066CC] dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-300"
                }`}
              >
                3. Enlaces y Redes
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Sección 1: Datos Personales y Contacto */}
              {editSectionTab === "personal" && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <Label htmlFor="editName" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Nombre Completo
                    </Label>
                    <Input
                      id="editName"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ej: Juan Sebastian Montes Osorio"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editEmail" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                        Correo Electrónico
                      </Label>
                      <Input
                        id="editEmail"
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Ej: juan.montes@email.com"
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="editPhone" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                        Teléfono de Contacto
                      </Label>
                      <Input
                        id="editPhone"
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Ej: +57 315 442 4357"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="editCity" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Ciudad y País de Residencia
                    </Label>
                    <Input
                      id="editCity"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="Ej: Bogotá, Colombia (o Remoto)"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Sección 2: Perfil Profesional y Rol */}
              {editSectionTab === "profesional" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editCategory" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                        Área o Especialidad Profesional
                      </Label>
                      <select
                        id="editCategory"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full mt-1 h-10 px-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:border-[#0066CC]"
                      >
                        <option value="Desarrollo de Software / Tecnología">Desarrollo de Software / Tecnología</option>
                        <option value="Ingeniería y Sistemas">Ingeniería y Sistemas</option>
                        <option value="Enfermería y Salud">Enfermería y Salud</option>
                        <option value="Mecánica e Industria">Mecánica e Industria</option>
                        <option value="Administración y Finanzas">Administración y Finanzas</option>
                        <option value="Educación y Pedagogía">Educación y Pedagogía</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="editExperience" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                        Nivel de Experiencia
                      </Label>
                      <select
                        id="editExperience"
                        value={editExperience}
                        onChange={(e) => setEditExperience(e.target.value)}
                        className="w-full mt-1 h-10 px-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:border-[#0066CC]"
                      >
                        <option value="Trainee / Estudiante">Trainee / Estudiante</option>
                        <option value="Junior (0-2 años)">Junior (0-2 años)</option>
                        <option value="Semi-Senior (2-5 años)">Semi-Senior (2-5 años)</option>
                        <option value="Senior (+5 años)">Senior (+5 años)</option>
                        <option value="Líder Técnico / Manager">Líder Técnico / Manager</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="editRole" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Rol en la Plataforma
                    </Label>
                    <select
                      id="editRole"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full mt-1 h-10 px-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:border-[#0066CC]"
                    >
                      <option value="usuario">Aspirante / Candidato (Postulación a vacantes)</option>
                      <option value="reclutador">Empresario / Reclutador (Publicar vacantes y evaluar)</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="editBio" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Biografía / Resumen Profesional Breve
                    </Label>
                    <Textarea
                      id="editBio"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Breve presentación de tus fortalezas técnicas y objetivos profesionales..."
                      rows={3}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Sección 3: Enlaces y Redes */}
              {editSectionTab === "enlaces" && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <Label htmlFor="editLinkedIn" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Enlace a Perfil de LinkedIn
                    </Label>
                    <Input
                      id="editLinkedIn"
                      type="url"
                      value={editLinkedIn}
                      onChange={(e) => setEditLinkedIn(e.target.value)}
                      placeholder="https://linkedin.com/in/tu-usuario"
                      className="mt-1 text-xs"
                    />
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                      Los empleadores revisan tu LinkedIn para verificar recomendaciones laborales.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="editGitHub" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Enlace a Perfil de GitHub o Portafolio Web
                    </Label>
                    <Input
                      id="editGitHub"
                      type="url"
                      value={editGitHub}
                      onChange={(e) => setEditGitHub(e.target.value)}
                      placeholder="https://github.com/tu-usuario o https://tu-portafolio.com"
                      className="mt-1 text-xs"
                    />
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                      Indispensable para vacantes tecnológicas: permite demostrar proyectos funcionales en código real.
                    </p>
                  </div>
                </div>
              )}

              {profileSaveError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                  {profileSaveError}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-slate-800">
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  {editSectionTab !== "enlaces" ? (
                    <button
                      type="button"
                      onClick={() => setEditSectionTab(editSectionTab === "personal" ? "profesional" : "enlaces")}
                      className="text-[#0066CC] dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Siguiente sección →
                    </button>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="dark:border-slate-700 dark:text-slate-300 cursor-pointer text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    className="bg-[#0066CC] hover:bg-[#004999] text-white cursor-pointer text-xs font-semibold px-5"
                  >
                    {isSavingProfile ? "Guardando en PostgreSQL..." : "Guardar Todos los Cambios"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
