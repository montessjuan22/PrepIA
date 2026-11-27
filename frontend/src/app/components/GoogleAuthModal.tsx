import { useEffect, useRef, useState } from "react";
import { X, Shield, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { apiGetGoogleConfig } from "../../services/api";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (payload: { credential?: string; access_token?: string }) => void;
}

export function GoogleAuthModal({ isOpen, onClose, onSelectAccount }: GoogleAuthModalProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unconfigured" | "error">("loading");
  const [errorDetail, setErrorDetail] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let pollTimer: number | undefined;

    const initGoogleButton = async () => {
      setStatus("loading");
      setErrorDetail("");
      try {
        const config = await apiGetGoogleConfig();
        if (cancelled) return;

        if (!config.configured || !config.client_id) {
          setStatus("unconfigured");
          return;
        }

        const renderGsi = () => {
          const gsi = window.google?.accounts?.id;
          if (!gsi || !buttonRef.current) return false;
          buttonRef.current.innerHTML = "";
          gsi.initialize({
            client_id: config.client_id!,
            callback: (response) => {
              if (response.credential) {
                onSelectAccount({ credential: response.credential });
              } else {
                setStatus("error");
                setErrorDetail("Google no devolvió una credencial válida.");
              }
            },
          });
          gsi.renderButton(buttonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
            logo_alignment: "left",
            width: 340,
            locale: "es",
          });
          setStatus("ready");
          return true;
        };

        if (!renderGsi()) {
          let attempts = 0;
          pollTimer = window.setInterval(() => {
            attempts += 1;
            if (cancelled) {
              window.clearInterval(pollTimer);
              return;
            }
            if (renderGsi()) {
              window.clearInterval(pollTimer);
            } else if (attempts >= 25) {
              window.clearInterval(pollTimer);
              setStatus("error");
              setErrorDetail("No se pudo cargar el script oficial de Google Identity Services. Verifica tu conexión a internet.");
            }
          }, 150);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorDetail(err instanceof Error ? err.message : "No se pudo conectar con el backend.");
        }
      }
    };

    initGoogleButton();

    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [isOpen, onSelectAccount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-white dark:bg-[#141d33] shadow-2xl rounded-3xl border border-gray-200 dark:border-slate-800 overflow-hidden relative transition-colors duration-200 p-0">
        <div className="p-6 pb-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-tight">
                Acceder con Google
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Autenticación real OAuth 2.0 para <strong className="text-gray-700 dark:text-slate-200">PrepIA</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar ventana de Google"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-600 dark:text-slate-400">
            Inicia sesión con tu cuenta real de Google. PrepIA verificará tu token directamente con Google y registrará tu sesión en PostgreSQL.
          </p>

          {status === "loading" && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-[#0066CC]" />
              Conectando con Google Identity Services...
            </div>
          )}

          <div
            ref={buttonRef}
            className={`flex justify-center ${status === "ready" ? "py-2" : "hidden"}`}
          />

          {status === "unconfigured" && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                Falta configurar GOOGLE_CLIENT_ID
              </div>
              <p className="leading-relaxed">
                Para autenticar cuentas reales de Google, crea un <strong>ID de cliente de OAuth 2.0 (Aplicación web)</strong> en Google Cloud Console con origen autorizado <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60">http://localhost:3000</code> y agrégalo en <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60">backend/.env</code>:
              </p>
              <pre className="p-2 rounded-lg bg-slate-900 text-slate-100 text-[11px] overflow-x-auto">
                GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
              </pre>
            </div>
          )}

          {status === "error" && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorDetail}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 dark:text-slate-500">
            <Shield className="w-3.5 h-3.5 text-green-500" /> Verificación criptográfica oficial vía Google OAuth 2.0
          </div>
        </div>
      </Card>
    </div>
  );
}
