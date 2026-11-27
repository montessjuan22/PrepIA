import { useRef, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  AdminCVAnalysisResult,
  AdminUserItem,
  AdminVacancyItem,
  apiAdminAnalyzeCVFile,
  apiAdminAnalyzeCVText,
  apiAdminAuditCandidateCV,
  apiAdminChat,
} from "../../services/api";
import {
  AlertCircle,
  Bot,
  Briefcase,
  CheckCircle,
  FileText,
  Send,
  Sparkles,
  Upload,
  UserCheck,
} from "lucide-react";

interface AdminAIChatAndCVTabProps {
  users: AdminUserItem[];
  vacancies: AdminVacancyItem[];
  onDataMutated: () => Promise<void>;
}

interface ChatMsg {
  sender: "bot" | "user";
  text: string;
  time: string;
}

export function AdminAIChatAndCVTab({
  users,
  vacancies,
  onDataMutated,
}: AdminAIChatAndCVTabProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      sender: "bot",
      text:
        "Hola Superadmin. Estoy conectado en vivo a PostgreSQL con permisos abiertos de administración.\n\n" +
        "Puedes pedirme consultas generales, aprobar vacantes ('aprobar vacante 4' o 'aprobar todas las pendientes'), " +
        "asignar roles ('dar soporte a correo@ejemplo.com'), revisar tickets o auditar la Hoja de Vida de cualquier candidato ('analiza el cv de ...').",
      time: "Ahora",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Analizador de CV Admin
  const [selectedVacancyId, setSelectedVacancyId] = useState<string>("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [cvText, setCvText] = useState("");
  const [cvResult, setCvResult] = useState<AdminCVAnalysisResult | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const usersWithCV = users.filter((u) => u.cv_count > 0);

  const sendChat = async (customText?: string) => {
    const text = (customText ?? chatInput).trim();
    if (!text || chatLoading) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { sender: "user", text, time: now }]);
    if (!customText) setChatInput("");
    setChatLoading(true);

    try {
      const res = await apiAdminChat({
        mensaje: text,
        historial: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
        candidato_id: selectedCandidateId ? Number(selectedCandidateId) : null,
      });
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: res.respuesta,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      if (res.accion_ejecutada && res.accion_ejecutada !== "error" && res.accion_ejecutada !== "ninguna") {
        await onDataMutated();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: err?.message || "No pude procesar esa consulta de administración.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAnalyzeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCvLoading(true);
    setCvError("");
    try {
      const res = await apiAdminAnalyzeCVFile(file, selectedVacancyId ? Number(selectedVacancyId) : null);
      setCvResult(res);
    } catch (err: any) {
      setCvError(err?.message || "No se pudo analizar el archivo de Hoja de Vida.");
    } finally {
      setCvLoading(false);
    }
  };

  const handleAnalyzeText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cvText.trim().length < 20) {
      setCvError("Ingresa al menos 20 caracteres de texto de Hoja de Vida.");
      return;
    }
    setCvLoading(true);
    setCvError("");
    try {
      const res = await apiAdminAnalyzeCVText(cvText.trim(), selectedVacancyId ? Number(selectedVacancyId) : null);
      setCvResult(res);
    } catch (err: any) {
      setCvError(err?.message || "No se pudo analizar el texto.");
    } finally {
      setCvLoading(false);
    }
  };

  const handleAuditCandidate = async () => {
    if (!selectedCandidateId) return;
    setCvLoading(true);
    setCvError("");
    try {
      const res = await apiAdminAuditCandidateCV(
        Number(selectedCandidateId),
        selectedVacancyId ? Number(selectedVacancyId) : null
      );
      setCvResult(res);
    } catch (err: any) {
      setCvError(err?.message || "No se pudo auditar el CV del candidato.");
    } finally {
      setCvLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      {/* Chatbot Abierto con Controles Admin */}
      <Card className="lg:col-span-7 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col h-[690px]">
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gradient-to-r from-purple-50/70 via-blue-50/50 to-white dark:from-slate-900 dark:via-[#141d33] dark:to-slate-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-[#0066CC] text-white flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                Copiloto IA Abierto (Superadmin)
                <Badge className="bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-[10px]">
                  Control BD
                </Badge>
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Consultas globales, aprobación de vacantes, roles, soporte y auditoría de CVs
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { label: "📊 Resumen BD", prompt: "Dame un resumen completo del estado actual del sistema" },
            { label: "⏳ Vacantes pendientes", prompt: "¿Qué vacantes están pendientes de aprobación?" },
            { label: "✅ Aprobar pendientes", prompt: "aprobar todas las pendientes" },
            { label: "🎫 Tickets soporte", prompt: "¿Cómo están los tickets de soporte?" },
            { label: "📄 CVs en BD", prompt: "Muéstrame los candidatos con hoja de vida cargada" },
          ].map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => sendChat(q.prompt)}
              className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-purple-500 shrink-0 cursor-pointer"
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-line ${
                  m.sender === "user"
                    ? "bg-purple-600 text-white rounded-tr-xs"
                    : "bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-800 dark:text-slate-100 rounded-tl-xs"
                }`}
              >
                <p>{m.text}</p>
                <span className={`block text-[10px] mt-1.5 ${m.sender === "user" ? "text-purple-100" : "text-gray-400"}`}>
                  {m.time}
                </span>
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="text-xs text-gray-500 dark:text-slate-400 italic">
              Consultando PostgreSQL y ejecutando asistente...
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendChat();
          }}
          className="p-3 border-t border-gray-200 dark:border-slate-800 flex gap-2"
        >
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={chatLoading}
            placeholder="Pregunta lo que quieras o ejecuta un control (ej: aprobar vacante 3, dar soporte a correo@x.com)..."
            className="flex-1 text-xs h-10 dark:bg-slate-900 dark:border-slate-700"
          />
          <Button type="submit" disabled={chatLoading || !chatInput.trim()} className="bg-purple-600 hover:bg-purple-700 text-white h-10 px-4">
            <Send className="w-4 h-4 mr-1.5" />
            Enviar
          </Button>
        </form>
      </Card>

      {/* Analizador Universal de Hojas de Vida (Admin / Superadmin) */}
      <Card className="lg:col-span-5 p-5 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-[#0066CC] dark:text-blue-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Analizador Global de Hojas de Vida</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Sube cualquier CV, pega texto o audita el CV de un usuario registrado
            </p>
          </div>
        </div>

        {cvError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{cvError}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">
            Vacante de referencia para medir compatibilidad (opcional)
          </label>
          <select
            value={selectedVacancyId}
            onChange={(e) => setSelectedVacancyId(e.target.value)}
            className="w-full h-9 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
          >
            <option value="">Todas las vacantes abiertas (ranking automático)</option>
            {vacancies.map((v) => (
              <option key={v.id} value={String(v.id)}>
                #{v.id} {v.titulo} — {v.empresa_nombre} ({v.estado})
              </option>
            ))}
          </select>
        </div>

        {/* Auditar candidato ya registrado */}
        <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 space-y-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">
            1. Auditar candidato registrado en BD ({usersWithCV.length} con CV)
          </label>
          <div className="flex gap-2">
            <select
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
              className="flex-1 h-9 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
            >
              <option value="">Selecciona un usuario con CV...</option>
              {usersWithCV.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.nombre} ({u.email}) — {u.cv_score ?? "?"}/100
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={cvLoading || !selectedCandidateId}
              onClick={handleAuditCandidate}
              className="bg-[#0066CC] hover:bg-[#004999] text-white text-xs h-9"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              Auditar
            </Button>
          </div>
        </div>

        {/* Subir archivo libre */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleAnalyzeFile}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            disabled={cvLoading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-dashed border-2 h-11 text-xs border-gray-300 dark:border-slate-700"
          >
            <Upload className="w-4 h-4 mr-2 text-[#0066CC]" />
            {cvLoading ? "Analizando documento..." : "2. Subir archivo PDF, DOCX o TXT para analizar"}
          </Button>
        </div>

        {/* Pegar texto */}
        <form onSubmit={handleAnalyzeText} className="space-y-2">
          <Textarea
            rows={3}
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="3. O pega aquí el texto de cualquier Hoja de Vida para evaluarla..."
            className="text-xs dark:bg-slate-900 dark:border-slate-700"
          />
          <Button type="submit" size="sm" disabled={cvLoading || cvText.trim().length < 20} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Analizar Texto de CV
          </Button>
        </form>

        {/* Resultado */}
        {cvResult && (
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  {cvResult.candidato ? cvResult.candidato.nombre : cvResult.analisis.nombre_archivo}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  {cvResult.analisis.nivel_aptitud} · {cvResult.analisis.total_palabras} palabras
                </p>
              </div>
              <Badge className="bg-[#0066CC] text-white text-sm px-3 py-1">
                {cvResult.analisis.score}/100
              </Badge>
            </div>

            {cvResult.analisis.habilidades_detectadas.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 dark:text-slate-200 mb-1">Habilidades detectadas:</p>
                <div className="flex flex-wrap gap-1">
                  {cvResult.analisis.habilidades_detectadas.slice(0, 12).map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {cvResult.analisis.elementos_faltantes.length > 0 && (
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">Brechas / Mejoras:</p>
                <ul className="space-y-0.5 text-gray-700 dark:text-slate-300">
                  {cvResult.analisis.elementos_faltantes.slice(0, 3).map((g, i) => (
                    <li key={i}>• {g}</li>
                  ))}
                </ul>
              </div>
            )}

            {cvResult.vacantes_match.length > 0 && (
              <div className="pt-2 border-t border-blue-200 dark:border-blue-900/60 space-y-1.5">
                <p className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-[#0066CC]" />
                  Compatibilidad con vacantes en BD:
                </p>
                {cvResult.vacantes_match.slice(0, 3).map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-800">
                    <span className="truncate font-medium">
                      {m.titulo} <span className="text-gray-400">({m.empresa})</span>
                    </span>
                    <Badge className={m.match >= m.puntaje_minimo ? "bg-emerald-600 text-white text-[10px]" : "bg-amber-600 text-white text-[10px]"}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {m.match}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
