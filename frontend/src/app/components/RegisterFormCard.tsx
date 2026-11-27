import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiGoogleLogin,
  apiRegister,
  getDashboardRouteForRole,
  validatePasswordStrength,
} from "../../services/api";
import { GoogleAuthModal } from "./GoogleAuthModal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";

interface RegisterFormCardProps {
  onSwitchToLogin?: () => void;
  compact?: boolean;
}

export function RegisterFormCard({ onSwitchToLogin, compact = false }: RegisterFormCardProps) {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!nombre.trim()) {
      setErrorMsg("Ingresa tu nombre completo.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }
    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      setErrorMsg(pwdCheck.message || "La contraseña no cumple los requisitos mínimos.");
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg("Debes aceptar los términos y la autorización de datos personales.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRegister({
        nombre: nombre.trim(),
        email: email.trim(),
        password,
        telefono: telefono.trim() || undefined,
      });
      if (res.success && res.user) {
        navigate(getDashboardRouteForRole(res.user.rol));
      } else {
        setErrorMsg(res.error || "No se pudo completar el registro.");
      }
    } catch {
      setErrorMsg("Error de conexión al crear la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (googlePayload: { credential?: string; access_token?: string }) => {
    setIsGoogleModalOpen(false);
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const res = await apiGoogleLogin(googlePayload);
      if (res.success && res.user) {
        navigate(getDashboardRouteForRole(res.user.rol));
      } else {
        setErrorMsg(res.error || "No se pudo registrar con Google.");
      }
    } catch {
      setErrorMsg("Error de conexión al validar la cuenta con Google.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Botón de Registro con Google (OAuth) */}
      <button
        type="button"
        onClick={() => setIsGoogleModalOpen(true)}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/80 text-gray-800 dark:text-white font-semibold text-sm transition-all shadow-xs cursor-pointer hover:shadow-md"
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Continuar con Google</span>
      </button>

      {/* Separador */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-[#141d33] px-3 text-gray-500 dark:text-slate-400 font-medium">
            o regístrate con correo
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <Label htmlFor={compact ? "reg-modal-name" : "reg-name"} className="text-xs font-semibold flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400" />
            Nombre completo *
          </Label>
          <Input
            id={compact ? "reg-modal-name" : "reg-name"}
            required
            placeholder="Ej: Juan Sebastián Montes"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 h-10"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor={compact ? "reg-modal-email" : "reg-email"} className="text-xs font-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              Correo electrónico *
            </Label>
            <Input
              id={compact ? "reg-modal-email" : "reg-email"}
              type="email"
              required
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-10"
            />
          </div>

          <div>
            <Label htmlFor={compact ? "reg-modal-phone" : "reg-phone"} className="text-xs font-semibold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              Teléfono / WhatsApp
            </Label>
            <Input
              id={compact ? "reg-modal-phone" : "reg-phone"}
              type="tel"
              placeholder="Ej: 3150000000"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="mt-1 h-10"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor={compact ? "reg-modal-pass" : "reg-pass"} className="text-xs font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              Contraseña *
            </Label>
            <div className="relative mt-1">
              <Input
                id={compact ? "reg-modal-pass" : "reg-pass"}
                type={showPassword ? "text" : "password"}
                required
                placeholder="Mín. 8 caracteres y un número"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor={compact ? "reg-modal-pass2" : "reg-pass2"} className="text-xs font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              Confirmar contraseña *
            </Label>
            <Input
              id={compact ? "reg-modal-pass2" : "reg-pass2"}
              type={showPassword ? "text" : "password"}
              required
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 h-10"
            />
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0066CC] shrink-0 mt-0.5" />
          <span>
            Todas las cuentas se crean con acceso estándar. Los roles especiales (Empresa o Administrador) son asignados únicamente por el Administrador Principal.
          </span>
        </div>

        <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0066CC]"
            required
          />
          <span>
            Acepto los términos y condiciones, la política de privacidad y el tratamiento de datos personales (Ley 1581 de 2012).
          </span>
        </label>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#0066CC] hover:bg-[#004999] text-white font-semibold h-11 rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? "Creando cuenta..." : (
            <>
              Crear Cuenta <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      {onSwitchToLogin && (
        <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-slate-400 pt-1">
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-[#0066CC] dark:text-blue-400 hover:underline cursor-pointer"
          >
            Inicia sesión aquí
          </button>
        </p>
      )}

      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSelectAccount={handleGoogleSuccess}
      />
    </div>
  );
}
