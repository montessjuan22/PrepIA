import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { ForgotPasswordModal } from "../components/ForgotPasswordModal";
import { GoogleAuthModal } from "../components/GoogleAuthModal";
import { RegisterFormCard } from "../components/RegisterFormCard";
import { apiLogin, apiGoogleLogin, getDashboardRouteForRole } from "../../services/api";
import { BrainCircuit, AlertCircle, ArrowRight, Eye, EyeOff, X } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Submit estándar por email y password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Por favor completa tu correo y contraseña.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiLogin(email, password);
      setIsLoading(false);
      if (res.success && res.user) {
        const targetRoute = getDashboardRouteForRole(res.user.rol);
        navigate(targetRoute);
      } else {
        setErrorMsg(res.error || "Credenciales incorrectas. Verifica tu email y contraseña.");
      }
    } catch {
      setIsLoading(false);
      setErrorMsg("Error de conexión al iniciar sesión. Inténtalo de nuevo.");
    }
  };

  // Autenticación real con Google
  const handleGoogleSuccess = async (googlePayload: { credential?: string; access_token?: string }) => {
    setIsGoogleModalOpen(false);
    setErrorMsg("");
    setIsLoading(true);
    try {
      const res = await apiGoogleLogin(googlePayload);
      setIsLoading(false);
      if (res.success && res.user) {
        const targetRoute = getDashboardRouteForRole(res.user.rol);
        navigate(targetRoute);
      } else {
        setErrorMsg(res.error || "No se pudo iniciar sesión con Google.");
      }
    } catch {
      setIsLoading(false);
      setErrorMsg("Error de comunicación con el servicio de autenticación de Google.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-slate-50 to-gray-100 dark:from-[#0b0f19] dark:via-[#111827] dark:to-[#0b0f19] flex flex-col transition-colors duration-200">
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          {/* Brand header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center bg-[#0066CC] p-3 rounded-2xl shadow-lg shadow-blue-500/20 mb-4 text-white">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Bienvenido a <span className="text-[#0066CC] dark:text-blue-400">PrepIA</span>
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              Plataforma de Evaluación y Entrenamiento con Inteligencia Artificial
            </p>
          </div>

          <Card className="p-6 sm:p-8 bg-white dark:bg-[#141d33] shadow-2xl rounded-2xl border border-gray-200/80 dark:border-slate-800 transition-colors duration-200">
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botón de Autenticación con Google */}
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(true)}
              disabled={isLoading}
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
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#141d33] px-3 text-gray-500 dark:text-slate-400 font-medium">
                  o con correo
                </span>
              </div>
            </div>

            {/* Formulario estándar */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                  Contraseña
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#0066CC] rounded border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-[#0066CC]"
                  />
                  <span className="text-gray-600 dark:text-slate-300 text-xs sm:text-sm">Recordarme</span>
                </label>

                {/* Enlace RF02: ¿Olvidaste tu contraseña? */}
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs sm:text-sm font-semibold text-[#0066CC] dark:text-blue-400 hover:text-[#004999] dark:hover:text-blue-300 hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0066CC] hover:bg-[#004999] text-white font-semibold py-3 h-11 rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 text-base transition-all"
              >
                {isLoading ? "Validando credenciales..." : (
                  <>
                    Iniciar Sesión <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center mt-6 text-sm text-gray-600 dark:text-slate-400">
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="font-semibold text-[#0066CC] dark:text-blue-400 hover:underline cursor-pointer"
              >
                Regístrate aquí
              </button>
            </p>
          </Card>
        </div>
      </div>

      {/* Modal flotante de Registro (sin selector de roles) */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 sm:p-7 bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800 shadow-2xl rounded-2xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Crear cuenta en PrepIA
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Regístrate con Google o con tu correo electrónico
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                aria-label="Cerrar registro"
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <RegisterFormCard
              compact
              onSwitchToLogin={() => setIsRegisterModalOpen(false)}
            />
          </Card>
        </div>
      )}

      {/* Modal interactivo de recuperación de contraseña (RF02) */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialEmail={email}
        onSuccessLogin={(newEmail) => {
          setEmail(newEmail);
          setPassword("");
        }}
      />

      {/* Modal de autenticación con Google */}
      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSelectAccount={handleGoogleSuccess}
      />
    </div>
  );
}
