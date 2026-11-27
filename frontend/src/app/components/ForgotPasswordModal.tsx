import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { apiForgotPassword, apiResetPassword } from "../../services/api";
import { 
  KeyRound, Mail, ShieldCheck, CheckCircle2, 
  AlertCircle, ArrowRight, ArrowLeft, X, Copy, Check 
} from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccessLogin?: (email: string) => void;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = "",
  onSuccessLogin,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  // Paso 1: Solicitar código
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email || !email.includes("@")) {
      setErrorMsg("Por favor ingresa un correo electrónico válido.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiForgotPassword(email);
      setIsLoading(false);
      if (res.success) {
        setDevCode(res.codigoDev || null);
        setStep(2);
      } else {
        setErrorMsg(res.error || "No se pudo enviar el código. Intenta de nuevo.");
      }
    } catch {
      setIsLoading(false);
      setErrorMsg("Error de comunicación con el servicio de autenticación.");
    }
  };

  // Paso 2: Verificar código
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (code.trim().length < 4) {
      setErrorMsg("Ingresa el código de verificación de 6 dígitos.");
      return;
    }
    setStep(3);
  };

  // Paso 3: Restablecer contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setErrorMsg("La contraseña debe incluir al menos una letra y un número.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiResetPassword(email, code, newPassword);
      setIsLoading(false);
      if (res.success) {
        setSuccessMsg(res.message);
        setStep(4);
      } else {
        setErrorMsg(res.error || "Error al restablecer contraseña.");
      }
    } catch {
      setIsLoading(false);
      setErrorMsg("Error de red al actualizar la contraseña.");
    }
  };

  const handleCopyCode = () => {
    if (devCode) {
      navigator.clipboard.writeText(devCode);
      setCode(devCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-lg bg-white dark:bg-[#141d33] shadow-2xl rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden relative transition-colors duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0066CC] to-[#004999] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Recuperación de Contraseña</h2>
              <p className="text-xs text-blue-100">PrepIA - Requisito Funcional RF02</p>
            </div>
          </div>

          {/* Stepper indicator */}
          <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/20 text-xs">
            <span className={`flex items-center gap-1.5 ${step >= 1 ? "font-semibold text-white" : "text-white/60"}`}>
              1. Correo
            </span>
            <div className="h-0.5 flex-1 mx-2 bg-white/20">
              <div className={`h-full bg-white transition-all ${step >= 2 ? "w-full" : "w-0"}`} />
            </div>
            <span className={`flex items-center gap-1.5 ${step >= 2 ? "font-semibold text-white" : "text-white/60"}`}>
              2. Código
            </span>
            <div className="h-0.5 flex-1 mx-2 bg-white/20">
              <div className={`h-full bg-white transition-all ${step >= 3 ? "w-full" : "w-0"}`} />
            </div>
            <span className={`flex items-center gap-1.5 ${step >= 3 ? "font-semibold text-white" : "text-white/60"}`}>
              3. Nueva Clave
            </span>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 md:p-8">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PASO 1: Ingreso de correo */}
          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">¿Olvidaste tu contraseña?</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                  Ingresa tu correo registrado en PrepIA. Te enviaremos un código de seguridad de 6 dígitos para restablecerla.
                </p>
              </div>

              <div>
                <Label htmlFor="recovery-email" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Correo Electrónico
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="w-5 h-5 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="recovery-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="pl-10 h-11"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-gray-300 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-[#0066CC] hover:bg-[#004999] text-white flex items-center justify-center gap-2"
                >
                  {isLoading ? "Enviando..." : (
                    <>
                      Enviar Código <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* PASO 2: Ingreso de código OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Verifica tu Identidad</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                  Hemos enviado un código a <strong>{email}</strong>. Ingresa los 6 dígitos a continuación.
                </p>
              </div>

              {/* Dev Helper Banner para pruebas locales y sustentación SENA */}
              {devCode && (
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 rounded-xl text-blue-900 dark:text-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
                        Código de prueba
                      </span>
                      <span className="font-mono text-base font-bold tracking-widest text-[#0066CC] dark:text-blue-400">
                        {devCode}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyCode}
                      className="text-xs h-7 text-[#0066CC] dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-1"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? "¡Copiado!" : "Usar código"}
                    </Button>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    (Generado automáticamente para evaluación de la ficha SENA Ficha 3233926)
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="verification-code" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Código de 6 Dígitos
                </Label>
                <Input
                  id="verification-code"
                  type="text"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="mt-1.5 text-center text-2xl tracking-[0.4em] font-mono font-bold h-12"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-gray-300 dark:border-slate-700 dark:text-slate-300 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Cambiar Correo
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#0066CC] hover:bg-[#004999] text-white flex items-center justify-center gap-2"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}

          {/* PASO 3: Nueva contraseña */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Crea tu Nueva Contraseña</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                  Define una contraseña segura para tu cuenta de PrepIA.
                </p>
              </div>

              <div>
                <Label htmlFor="new-password" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Nueva Contraseña
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres (letras y números)"
                  className="mt-1.5 h-11"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Confirmar Nueva Contraseña
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
                  className="mt-1.5 h-11"
                />
              </div>

              {/* Requirement Checklist */}
              <div className="bg-gray-50 dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 text-xs space-y-1.5">
                <p className="font-semibold text-gray-700 dark:text-slate-300 mb-1">Requisitos de seguridad (RNF05 / RF02):</p>
                <div className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-slate-400"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mínimo 8 caracteres
                </div>
                <div className={`flex items-center gap-1.5 ${/[a-zA-Z]/.test(newPassword) ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-slate-400"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Al menos una letra
                </div>
                <div className={`flex items-center gap-1.5 ${/[0-9]/.test(newPassword) ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-slate-400"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Al menos un número
                </div>
                <div className={`flex items-center gap-1.5 ${newPassword && newPassword === confirmPassword ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-slate-400"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Las contraseñas coinciden
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 border-gray-300 dark:border-slate-700 dark:text-slate-300 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                >
                  {isLoading ? "Actualizando..." : "Restablecer Contraseña"}
                </Button>
              </div>
            </form>
          )}

          {/* PASO 4: Confirmación exitosa */}
          {step === 4 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">¡Contraseña Actualizada!</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300 max-w-sm mx-auto">
                Tu contraseña ha sido restablecida exitosamente en PrepIA. Ahora puedes iniciar sesión con tus nuevas credenciales.
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => {
                    onClose();
                    if (onSuccessLogin) onSuccessLogin(email);
                  }}
                  className="w-full bg-[#0066CC] hover:bg-[#004999] text-white py-3 text-base font-semibold"
                >
                  Iniciar Sesión Ahora
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
