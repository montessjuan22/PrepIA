import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import {
  apiUpdateCompanyProfile,
  apiUploadCompanyLogo,
  CompanyPersonType,
  CompanyProfile,
  CompanySizeCO,
} from "../../services/api";
import {
  calcularDvNitColombia,
  DEPARTAMENTOS_COLOMBIA,
  SECTORES_CIIU_COLOMBIA,
  TAMANOS_EMPRESA_CO,
} from "../../data/colombia";
import {
  Building2, CheckCircle2, AlertCircle, Upload, ShieldCheck, Globe, MapPin, Phone, UserCheck
} from "lucide-react";

interface CompanyProfileTabProps {
  empresa: CompanyProfile | null;
  defaultEmail?: string;
  onProfileSaved: (updated: CompanyProfile, message: string) => void;
}

export function CompanyProfileTab({
  empresa,
  defaultEmail = "",
  onProfileSaved,
}: CompanyProfileTabProps) {
  const [tipoPersona, setTipoPersona] = useState<CompanyPersonType>("juridica");
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [nit, setNit] = useState("");
  const [dv, setDv] = useState("");
  const [rutNumero, setRutNumero] = useState("");
  const [codigoCiiu, setCodigoCiiu] = useState("");
  const [sector, setSector] = useState("");
  const [tamanoEmpresa, setTamanoEmpresa] = useState<CompanySizeCO>("Pequeña");
  const [departamento, setDepartamento] = useState("Bogotá D.C.");
  const [ciudad, setCiudad] = useState("Bogotá");
  const [direccion, setDireccion] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoCargo, setContactoCargo] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [contactoEmail, setContactoEmail] = useState(defaultEmail);
  const [aceptaLey1581, setAceptaLey1581] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!empresa) return;
    setTipoPersona((empresa.tipo_persona as CompanyPersonType) || "juridica");
    setRazonSocial(empresa.razon_social || empresa.nombre || "");
    setNombreComercial(empresa.nombre_comercial || empresa.nombre || "");
    setNit(empresa.nit || "");
    setDv(empresa.digito_verificacion || (empresa.nit ? calcularDvNitColombia(empresa.nit) : ""));
    setRutNumero(empresa.rut_numero || "");
    setCodigoCiiu(empresa.codigo_ciiu || "");
    setSector(empresa.sector || "");
    setTamanoEmpresa((empresa.tamano_empresa as CompanySizeCO) || "Pequeña");
    setDepartamento(empresa.departamento || "Bogotá D.C.");
    setCiudad(empresa.ciudad || "Bogotá");
    setDireccion(empresa.direccion || "");
    setSitioWeb(empresa.sitio_web || "");
    setLinkedinUrl(empresa.linkedin_url || "");
    setDescripcion(empresa.descripcion || "");
    setContactoNombre(empresa.contacto_nombre || "");
    setContactoCargo(empresa.contacto_cargo || "");
    setContactoTelefono(empresa.contacto_telefono || "");
    setContactoEmail(empresa.contacto_email || defaultEmail);
    setAceptaLey1581(Boolean(empresa.acepta_ley_1581));
  }, [empresa, defaultEmail]);

  const handleNitChange = (raw: string) => {
    const clean = raw.replace(/\D/g, "").slice(0, 15);
    setNit(clean);
    setDv(clean ? calcularDvNitColombia(clean) : "");
  };

  const handleSelectCiiu = (ciiuCode: string) => {
    setCodigoCiiu(ciiuCode);
    const found = SECTORES_CIIU_COLOMBIA.find((s) => s.ciiu === ciiuCode);
    if (found) {
      setSector(found.sector);
    }
  };

  const selectedDeptObj = DEPARTAMENTOS_COLOMBIA.find((d) => d.nombre === departamento);
  const availableCities = selectedDeptObj?.ciudades || [];

  const handleDepartmentChange = (newDept: string) => {
    setDepartamento(newDept);
    const found = DEPARTAMENTOS_COLOMBIA.find((d) => d.nombre === newDept);
    if (found && found.ciudades.length > 0 && !found.ciudades.includes(ciudad)) {
      setCiudad(found.ciudades[0]);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploadingLogo(true);
    setErrorMsg("");
    try {
      const res = await apiUploadCompanyLogo(file);
      onProfileSaved(res.empresa, res.mensaje);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo subir el logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!aceptaLey1581) {
      setErrorMsg("Debes aceptar la autorización de tratamiento de datos personales (Ley 1581 de 2012).");
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiUpdateCompanyProfile({
        tipo_persona: tipoPersona,
        razon_social: razonSocial.trim(),
        nombre_comercial: nombreComercial.trim() || undefined,
        nit: nit.trim() || undefined,
        digito_verificacion: dv.trim() || undefined,
        rut_numero: rutNumero.trim() || undefined,
        codigo_ciiu: codigoCiiu.trim() || undefined,
        sector: sector.trim(),
        tamano_empresa: tamanoEmpresa,
        departamento: departamento.trim(),
        ciudad: ciudad.trim(),
        direccion: direccion.trim() || undefined,
        sitio_web: sitioWeb.trim() || undefined,
        linkedin_url: linkedinUrl.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        contacto_nombre: contactoNombre.trim(),
        contacto_cargo: contactoCargo.trim() || undefined,
        contacto_telefono: contactoTelefono.trim(),
        contacto_email: contactoEmail.trim(),
        acepta_ley_1581: aceptaLey1581,
      });
      onProfileSaved(res.empresa, res.mensaje);
    } catch (err: any) {
      setErrorMsg(err?.message || "Error al guardar el perfil de la empresa.");
    } finally {
      setIsSaving(false);
    }
  };

  const completitud = empresa?.completitud ?? 0;
  const faltantes = empresa?.campos_faltantes ?? [];

  return (
    <div className="space-y-6">
      {/* Indicador de completitud + Logo */}
      <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl bg-green-600/10 border border-green-500/30 flex items-center justify-center overflow-hidden shrink-0">
              {empresa?.logo_url ? (
                <img src={empresa.logo_url} alt="Logo empresa" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Completitud del Perfil Empresarial
                </h3>
                <Badge className={completitud >= 100 ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}>
                  {completitud}%
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {completitud >= 100
                  ? "Perfil empresarial completo conforme a normativa colombiana."
                  : `Pendiente: ${faltantes.join(" · ")}`}
              </p>
              <div className="mt-2.5 max-w-md">
                <Progress value={completitud} className="h-2" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploadingLogo}
              onClick={() => logoInputRef.current?.click()}
              className="dark:border-slate-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploadingLogo ? "Subiendo..." : empresa?.logo_url ? "Cambiar Logo" : "Subir Logo"}
            </Button>
          </div>
        </div>
      </Card>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificación Tributaria Colombia */}
        <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              Identificación Legal y Tributaria (Colombia)
            </h4>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 p-0.5 bg-gray-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setTipoPersona("juridica")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tipoPersona === "juridica"
                    ? "bg-green-600 text-white"
                    : "text-gray-600 dark:text-slate-300"
                }`}
              >
                Persona Jurídica (NIT)
              </button>
              <button
                type="button"
                onClick={() => setTipoPersona("natural_rut")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tipoPersona === "natural_rut"
                    ? "bg-green-600 text-white"
                    : "text-gray-600 dark:text-slate-300"
                }`}
              >
                Persona Natural con RUT
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {tipoPersona === "juridica" ? "Razón Social *" : "Nombre Completo / Razón Comercial *"}
              </label>
              <Input
                required
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                placeholder={tipoPersona === "juridica" ? "Ej: Soluciones Caribe S.A.S." : "Ej: Juan Sebastián Montes"}
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Nombre Comercial (visible en ofertas)</label>
              <Input
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                placeholder="Ej: CaribeTech"
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                NIT {tipoPersona === "juridica" ? "*" : "(opcional si usa RUT)"} + DV (DIAN)
              </label>
              <div className="flex gap-2">
                <Input
                  required={tipoPersona === "juridica"}
                  value={nit}
                  onChange={(e) => handleNitChange(e.target.value)}
                  placeholder="Ej: 890903938"
                  className="flex-1 dark:bg-slate-900 dark:border-slate-700"
                />
                <div className="w-20">
                  <Input
                    value={dv}
                    onChange={(e) => setDv(e.target.value.replace(/\D/g, "").slice(0, 1))}
                    placeholder="DV"
                    title="Dígito de Verificación calculado con algoritmo DIAN"
                    className="text-center font-bold dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
              </div>
              {nit && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  DV DIAN calculado automáticamente: <strong>{calcularDvNitColombia(nit)}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Número de RUT {tipoPersona === "natural_rut" ? "*" : "(opcional)"}
              </label>
              <Input
                required={tipoPersona === "natural_rut" && !nit}
                value={rutNumero}
                onChange={(e) => setRutNumero(e.target.value)}
                placeholder="Ej: 1140889101-2"
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Código CIIU (catálogo rápido)</label>
              <div className="flex gap-2">
                <select
                  value={SECTORES_CIIU_COLOMBIA.some((s) => s.ciiu === codigoCiiu) ? codigoCiiu : ""}
                  onChange={(e) => handleSelectCiiu(e.target.value)}
                  className="flex-1 h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                >
                  <option value="">Selecciona actividad CIIU...</option>
                  {SECTORES_CIIU_COLOMBIA.map((item) => (
                    <option key={item.ciiu} value={item.ciiu}>
                      {item.ciiu} — {item.sector}
                    </option>
                  ))}
                </select>
                <Input
                  value={codigoCiiu}
                  onChange={(e) => setCodigoCiiu(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="CIIU"
                  className="w-24 dark:bg-slate-900 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Sector Económico *</label>
                <Input
                  required
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="Ej: Retail / Salud / TI"
                  className="dark:bg-slate-900 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tamaño de Empresa *</label>
                <select
                  value={tamanoEmpresa}
                  onChange={(e) => setTamanoEmpresa(e.target.value as CompanySizeCO)}
                  className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                >
                  {TAMANOS_EMPRESA_CO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Ubicación e Identidad Digital */}
        <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-4">
          <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
            Ubicación en Colombia y Presencia Corporativa
          </h4>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Departamento *</label>
              <select
                value={departamento}
                onChange={(e) => handleDepartmentChange(e.target.value)}
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
              <label className="block text-xs font-semibold mb-1">Ciudad / Municipio *</label>
              <Input
                required
                list="ciudades-colombia-empresa"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Ej: Barranquilla"
                className="dark:bg-slate-900 dark:border-slate-700"
              />
              <datalist id="ciudades-colombia-empresa">
                {availableCities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Dirección sede principal</label>
              <Input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Cra 52 # 76-167 Local 4"
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Sitio Web</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={sitioWeb}
                  onChange={(e) => setSitioWeb(e.target.value)}
                  placeholder="https://tuempresa.com.co"
                  className="pl-9 dark:bg-slate-900 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">LinkedIn Corporativo</label>
              <Input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/company/tuempresa"
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">Descripción de la Empresa</label>
              <Textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Cuéntales a los candidatos quiénes son, su propósito, cultura y propuesta de valor..."
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
          </div>
        </Card>

        {/* Contacto / Reclutador */}
        <Card className="p-6 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 space-y-4">
          <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            Contacto del Reclutador / Responsable
          </h4>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Nombre del Responsable *</label>
              <Input
                required
                value={contactoNombre}
                onChange={(e) => setContactoNombre(e.target.value)}
                placeholder="Ej: Laura Martínez"
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Cargo</label>
              <Input
                value={contactoCargo}
                onChange={(e) => setContactoCargo(e.target.value)}
                placeholder="Ej: Líder de Talento Humano"
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Teléfono / WhatsApp *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  required
                  value={contactoTelefono}
                  onChange={(e) => setContactoTelefono(e.target.value)}
                  placeholder="Ej: +57 315 000 0000"
                  className="pl-9 dark:bg-slate-900 dark:border-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Correo Corporativo *</label>
              <Input
                required
                type="email"
                value={contactoEmail}
                onChange={(e) => setContactoEmail(e.target.value)}
                placeholder="talento@tuempresa.com.co"
                className="dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
          </div>
        </Card>

        {/* Ley 1581 de 2012 */}
        <Card className="p-5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={aceptaLey1581}
              onChange={(e) => setAceptaLey1581(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed">
              <strong>Autorización de Tratamiento de Datos Personales (Ley 1581 de 2012 — Colombia):</strong>{" "}
              En calidad de empleador/reclutador autorizo el tratamiento de los datos corporativos y de contacto registrados en PrepIA, y me comprometo a tratar la información personal y hojas de vida de los candidatos únicamente con fines de selección laboral conforme al Decreto 1377 de 2013 y la Ley 1581 de 2012.
            </span>
          </label>
          {empresa?.fecha_ley_1581 && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 pl-7">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Autorización registrada el {empresa.fecha_ley_1581.slice(0, 10)}.
            </p>
          )}
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white px-6 font-semibold shadow-md shadow-green-500/20 cursor-pointer"
          >
            {isSaving ? "Guardando perfil..." : "Guardar Perfil de Empresa"}
          </Button>
        </div>
      </form>
    </div>
  );
}
