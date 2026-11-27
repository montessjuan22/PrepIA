import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  apiUpdateStructuredCV,
  CandidateMetricsResponse,
  StructuredCVProfile,
} from "../../services/api";
import {
  Edit, Mail, Phone, MapPin, Plus, X, FileText, Upload, Trash2, Eye, Camera
} from "lucide-react";

interface StructuredResumeCardProps {
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateCity: string;
  candidateCategory: string;
  candidateExperience: string;
  candidateBio: string;
  initials: string;
  fotoPerfilUrl?: string | null;
  isUploadingAvatar?: boolean;
  onUploadAvatar?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteAvatar?: () => void;
  metrics: CandidateMetricsResponse | null;
  detectedSkills: string[];
  isAnalyzingCv: boolean;
  onOpenEditModal: (tab: "personal" | "profesional" | "enlaces") => void;
  onUploadCv: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteCv: () => void;
  onViewCover: () => void;
  onSaved: () => Promise<void> | void;
}

const DEFAULT_CV: StructuredCVProfile = {
  experiencias: [],
  estudios: [],
  idiomas: [],
  habilidades: [],
  movilidad: {
    viajar: false,
    cambio_residencia: false,
    vehiculo_propio: false,
  },
};

export function StructuredResumeCard({
  candidateName,
  candidateEmail,
  candidatePhone,
  candidateCity,
  candidateCategory,
  candidateExperience,
  candidateBio,
  initials,
  fotoPerfilUrl,
  isUploadingAvatar,
  onUploadAvatar,
  onDeleteAvatar,
  metrics,
  detectedSkills,
  isAnalyzingCv,
  onOpenEditModal,
  onUploadCv,
  onDeleteCv,
  onViewCover,
  onSaved,
}: StructuredResumeCardProps) {
  const [profileCv, setProfileCv] = useState<StructuredCVProfile>(DEFAULT_CV);
  const [isSaving, setIsSaving] = useState(false);

  // Forms toggles
  const [showExpForm, setShowExpForm] = useState(false);
  const [expCargo, setExpCargo] = useState("");
  const [expEmpresa, setExpEmpresa] = useState("");
  const [expPeriodo, setExpPeriodo] = useState("");
  const [expDesc, setExpDesc] = useState("");

  const [showStudyForm, setShowStudyForm] = useState(false);
  const [studyTitulo, setStudyTitulo] = useState("");
  const [studyInst, setStudyInst] = useState("");
  const [studyPeriodo, setStudyPeriodo] = useState("");

  const [showLangForm, setShowLangForm] = useState(false);
  const [langName, setLangName] = useState("");
  const [langLevel, setLangLevel] = useState("Intermedio");

  const [showSkillForm, setShowSkillForm] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  const [editingMobility, setEditingMobility] = useState(false);

  useEffect(() => {
    const serverCv = metrics?.perfil_cv;
    const savedSkills = serverCv?.habilidades ?? [];
    setProfileCv({
      experiencias: serverCv?.experiencias ?? [],
      estudios: serverCv?.estudios ?? [],
      idiomas: serverCv?.idiomas ?? [],
      habilidades: savedSkills.length > 0 ? savedSkills : detectedSkills,
      movilidad: serverCv?.movilidad ?? {
        viajar: false,
        cambio_residencia: false,
        vehiculo_propio: false,
      },
    });
  }, [metrics?.perfil_cv, detectedSkills]);

  const persist = async (patch: Partial<StructuredCVProfile>) => {
    if (!candidateEmail) return;
    const next: StructuredCVProfile = { ...profileCv, ...patch };
    setProfileCv(next);
    setIsSaving(true);
    try {
      await apiUpdateStructuredCV({ email: candidateEmail, ...patch });
      await onSaved();
    } catch (err) {
      console.warn("Error guardando hoja de vida estructurada:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expCargo.trim() || !expEmpresa.trim()) return;
    const updated = [
      ...profileCv.experiencias,
      {
        cargo: expCargo.trim(),
        empresa: expEmpresa.trim(),
        periodo: expPeriodo.trim() || "Actualidad",
        descripcion: expDesc.trim(),
      },
    ];
    setExpCargo("");
    setExpEmpresa("");
    setExpPeriodo("");
    setExpDesc("");
    setShowExpForm(false);
    await persist({ experiencias: updated });
  };

  const handleAddStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyTitulo.trim() || !studyInst.trim()) return;
    const updated = [
      ...profileCv.estudios,
      {
        titulo: studyTitulo.trim(),
        institucion: studyInst.trim(),
        periodo: studyPeriodo.trim() || "En curso",
      },
    ];
    setStudyTitulo("");
    setStudyInst("");
    setStudyPeriodo("");
    setShowStudyForm(false);
    await persist({ estudios: updated });
  };

  const handleAddLang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!langName.trim()) return;
    const updated = [...profileCv.idiomas, { idioma: langName.trim(), nivel: langLevel }];
    setLangName("");
    setShowLangForm(false);
    await persist({ idiomas: updated });
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newSkill.trim();
    if (!cleaned) return;
    if (profileCv.habilidades.some((s) => s.toLowerCase() === cleaned.toLowerCase())) {
      setNewSkill("");
      return;
    }
    const updated = [...profileCv.habilidades, cleaned];
    setNewSkill("");
    setShowSkillForm(false);
    await persist({ habilidades: updated });
  };

  return (
    <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-sm divide-y divide-gray-200 dark:divide-slate-800">
      {/* 1. Cabecera del candidato */}
      <div className="pb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <div className="relative shrink-0">
            <label
              title="Subir o cambiar foto de perfil"
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center overflow-hidden cursor-pointer relative group ${
                fotoPerfilUrl
                  ? "bg-transparent"
                  : "bg-[#0066CC] text-white font-bold text-2xl sm:text-3xl shadow-lg ring-4 ring-blue-500/15"
              }`}
            >
              {fotoPerfilUrl ? (
                <img src={fotoPerfilUrl} alt={candidateName} className="w-full h-full object-contain" />
              ) : (
                initials
              )}
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </span>
              {onUploadAvatar && (
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={onUploadAvatar}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              )}
            </label>
            {onUploadAvatar && (
              <label
                title="Cambiar foto de perfil"
                className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#0066CC] border-2 border-white dark:border-[#141d33] text-white flex items-center justify-center shadow cursor-pointer hover:bg-[#004999]"
              >
                <Plus className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={onUploadAvatar}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">{candidateName}</h3>
            {fotoPerfilUrl && onDeleteAvatar && (
              <button
                type="button"
                onClick={onDeleteAvatar}
                disabled={isUploadingAvatar}
                className="text-[11px] text-red-500 hover:underline cursor-pointer"
              >
                Quitar foto
              </button>
            )}
            <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>{candidateCity}</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-slate-300 pt-0.5">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                {candidateEmail}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                {candidatePhone || "Sin teléfono"}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenEditModal("personal")}
          className="p-2 rounded-lg text-gray-400 hover:text-[#0066CC] hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          title="Editar datos personales"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Perfil profesional / Cargo objetivo */}
      <div className="py-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-base font-bold text-gray-900 dark:text-white">
            {candidateCategory}
          </h4>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Nivel: <span className="font-medium text-gray-700 dark:text-slate-200">{candidateExperience}</span>
          </p>
          {candidateBio && (
            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed pt-1">
              {candidateBio}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onOpenEditModal("profesional")}
          className="p-2 rounded-lg text-gray-400 hover:text-[#0066CC] hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          title="Editar perfil profesional"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Mis experiencias profesionales */}
      <div className="py-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-gray-900 dark:text-white">Mis experiencias profesionales</h4>
          {isSaving && <span className="text-[11px] text-gray-400">Guardando...</span>}
        </div>

        {profileCv.experiencias.length > 0 && (
          <div className="border-l-2 border-[#0066CC]/40 pl-4 space-y-3">
            {profileCv.experiencias.map((exp, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2 group">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{exp.cargo}</p>
                  <p className="text-xs text-gray-600 dark:text-slate-300">{exp.empresa}</p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">{exp.periodo}</p>
                  {exp.descripcion && (
                    <p className="text-xs text-gray-600 dark:text-slate-400 pt-0.5">{exp.descripcion}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    persist({ experiencias: profileCv.experiencias.filter((_, i) => i !== idx) })
                  }
                  className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                  title="Eliminar experiencia"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {!showExpForm ? (
          <button
            type="button"
            onClick={() => setShowExpForm(true)}
            className="text-xs font-semibold text-[#0066CC] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir nueva experiencia
          </button>
        ) : (
          <form onSubmit={handleAddExp} className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 space-y-2.5">
            <div className="grid sm:grid-cols-3 gap-2">
              <Input
                required
                placeholder="Cargo *"
                value={expCargo}
                onChange={(e) => setExpCargo(e.target.value)}
                className="h-9 text-xs dark:bg-slate-950 dark:border-slate-700"
              />
              <Input
                required
                placeholder="Empresa *"
                value={expEmpresa}
                onChange={(e) => setExpEmpresa(e.target.value)}
                className="h-9 text-xs dark:bg-slate-950 dark:border-slate-700"
              />
              <Input
                placeholder="Periodo (ej. 2023 - 2025)"
                value={expPeriodo}
                onChange={(e) => setExpPeriodo(e.target.value)}
                className="h-9 text-xs dark:bg-slate-950 dark:border-slate-700"
              />
            </div>
            <Textarea
              rows={2}
              placeholder="Funciones principales (opcional)"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              className="text-xs dark:bg-slate-950 dark:border-slate-700"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowExpForm(false)} className="h-8 text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs bg-[#0066CC] text-white">
                Guardar
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* 4. Mis estudios */}
      <div className="py-5 space-y-3">
        <h4 className="text-base font-bold text-gray-900 dark:text-white">Mis estudios</h4>

        {profileCv.estudios.length > 0 && (
          <div className="border-l-2 border-[#0066CC]/40 pl-4 space-y-3">
            {profileCv.estudios.map((st, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{st.titulo}</p>
                  <p className="text-xs text-gray-600 dark:text-slate-300">{st.institucion}</p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">{st.periodo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => persist({ estudios: profileCv.estudios.filter((_, i) => i !== idx) })}
                  className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                  title="Eliminar estudio"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {!showStudyForm ? (
          <button
            type="button"
            onClick={() => setShowStudyForm(true)}
            className="text-xs font-semibold text-[#0066CC] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir más estudios
          </button>
        ) : (
          <form onSubmit={handleAddStudy} className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 space-y-2.5">
            <div className="grid sm:grid-cols-3 gap-2">
              <Input
                required
                placeholder="Título / Carrera *"
                value={studyTitulo}
                onChange={(e) => setStudyTitulo(e.target.value)}
                className="h-9 text-xs dark:bg-slate-950 dark:border-slate-700"
              />
              <Input
                required
                placeholder="Institución (ej. SENA) *"
                value={studyInst}
                onChange={(e) => setStudyInst(e.target.value)}
                className="h-9 text-xs dark:bg-slate-950 dark:border-slate-700"
              />
              <Input
                placeholder="Periodo (ej. 2024 - En curso)"
                value={studyPeriodo}
                onChange={(e) => setStudyPeriodo(e.target.value)}
                className="h-9 text-xs dark:bg-slate-950 dark:border-slate-700"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowStudyForm(false)} className="h-8 text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs bg-[#0066CC] text-white">
                Guardar
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* 5. Idiomas */}
      <div className="py-5 space-y-3">
        <h4 className="text-base font-bold text-gray-900 dark:text-white">Idiomas</h4>
        <div className="flex flex-wrap items-center gap-2">
          {profileCv.idiomas.map((item, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="rounded-full px-3 py-1 text-xs gap-1.5 dark:border-slate-700"
            >
              <span>{item.idioma} - {item.nivel}</span>
              <button
                type="button"
                onClick={() => persist({ idiomas: profileCv.idiomas.filter((_, i) => i !== idx) })}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {!showLangForm && (
            <button
              type="button"
              onClick={() => setShowLangForm(true)}
              className="text-xs font-semibold text-[#0066CC] dark:text-blue-400 hover:underline cursor-pointer"
            >
              + Añadir idioma
            </button>
          )}
        </div>

        {showLangForm && (
          <form onSubmit={handleAddLang} className="flex flex-wrap items-center gap-2">
            <Input
              required
              placeholder="Idioma (ej. Inglés)"
              value={langName}
              onChange={(e) => setLangName(e.target.value)}
              className="h-8 w-40 text-xs dark:bg-slate-950 dark:border-slate-700"
            />
            <select
              value={langLevel}
              onChange={(e) => setLangLevel(e.target.value)}
              className="h-8 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs"
            >
              <option value="Nativo">Nativo</option>
              <option value="Avanzado">Avanzado</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Básico">Básico</option>
            </select>
            <Button type="submit" size="sm" className="h-8 text-xs bg-[#0066CC] text-white">
              Añadir
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowLangForm(false)} className="h-8 text-xs">
              Cancelar
            </Button>
          </form>
        )}
      </div>

      {/* 6. Conocimientos y habilidades */}
      <div className="py-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-base font-bold text-gray-900 dark:text-white">Conocimientos y habilidades</h4>
          {!showSkillForm && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowSkillForm(true)}
              className="h-7 rounded-full text-xs px-3 dark:border-slate-700"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
            </Button>
          )}
        </div>

        {showSkillForm && (
          <form onSubmit={handleAddSkill} className="flex items-center gap-2">
            <Input
              required
              placeholder="Ej: Python, Soporte técnico, SQL..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              className="h-8 max-w-xs text-xs dark:bg-slate-950 dark:border-slate-700"
            />
            <Button type="submit" size="sm" className="h-8 text-xs bg-[#0066CC] text-white">
              Guardar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowSkillForm(false)} className="h-8 text-xs">
              Cancelar
            </Button>
          </form>
        )}

        {profileCv.habilidades.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Añade tus habilidades o sube tu Hoja de Vida para detectarlas automáticamente.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profileCv.habilidades.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() =>
                    persist({ habilidades: profileCv.habilidades.filter((_, i) => i !== idx) })
                  }
                  className="text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 7. Desplazamiento y movilidad */}
      <div className="py-5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-gray-900 dark:text-white">Desplazamiento y movilidad</h4>
          <button
            type="button"
            onClick={() => setEditingMobility((v) => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#0066CC] hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Editar movilidad"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        {editingMobility ? (
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profileCv.movilidad.viajar}
                onChange={(e) =>
                  persist({ movilidad: { ...profileCv.movilidad, viajar: e.target.checked } })
                }
              />
              <span>Disponibilidad para viajar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profileCv.movilidad.cambio_residencia}
                onChange={(e) =>
                  persist({ movilidad: { ...profileCv.movilidad, cambio_residencia: e.target.checked } })
                }
              />
              <span>Disponibilidad para cambiar de residencia</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profileCv.movilidad.vehiculo_propio}
                onChange={(e) =>
                  persist({ movilidad: { ...profileCv.movilidad, vehiculo_propio: e.target.checked } })
                }
              />
              <span>Tengo vehículo propio</span>
            </label>
          </div>
        ) : (
          <ul className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
            <li>• {profileCv.movilidad.viajar ? "Disponibilidad para viajar" : "Sin disponibilidad para viajar"}</li>
            <li>• {profileCv.movilidad.cambio_residencia ? "Disponibilidad para cambiar de residencia" : "Sin cambio de residencia"}</li>
            <li>• {profileCv.movilidad.vehiculo_propio ? "Vehículo propio disponible" : "No tengo vehículo propio"}</li>
          </ul>
        )}
      </div>

      {/* 8. Documentos adjuntos */}
      <div className="pt-5 space-y-3">
        <h4 className="text-base font-bold text-gray-900 dark:text-white">Documentos adjuntos</h4>
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200 min-w-0">
            <FileText className="w-4 h-4 text-[#0066CC] shrink-0" />
            <span className="truncate font-medium">
              {metrics?.checklist?.cv_subido
                ? metrics.cv_nombre || "Hoja de Vida en base de datos"
                : "Sin documento adjunto aún"}
            </span>
          </div>
          {metrics?.checklist?.cv_subido && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onViewCover}
                className="text-[#0066CC] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Eye className="w-3.5 h-3.5" /> Ver portada
              </button>
              <button
                type="button"
                onClick={onDeleteCv}
                className="text-red-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          )}
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#0066CC] text-[#0066CC] dark:text-blue-400 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" />
          {isAnalyzingCv ? "Procesando documento..." : "Subir o modificar documento"}
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={onUploadCv}
            disabled={isAnalyzingCv}
            className="hidden"
          />
        </label>
      </div>
    </Card>
  );
}
