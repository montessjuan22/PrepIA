import { useState } from "react";
import { X, UserPlus, ArrowRight, Shield } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: { email: string; nombre: string; foto?: string }) => void;
}

export function GoogleAuthModal({ isOpen, onClose, onSelectAccount }: GoogleAuthModalProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");

  if (!isOpen) return null;

  const defaultAccounts = [
    {
      nombre: "Juan Sebastian Montes",
      email: "juanse.montes@gmail.com",
      avatar: "J",
      bg: "bg-blue-600",
    },
    {
      nombre: "María González",
      email: "maria.gonzalez@gmail.com",
      avatar: "M",
      bg: "bg-emerald-600",
    },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes("@")) return;
    onSelectAccount({
      email: customEmail,
      nombre: customName || customEmail.split("@")[0],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-white dark:bg-[#141d33] shadow-2xl rounded-3xl border border-gray-200 dark:border-slate-800 overflow-hidden relative transition-colors duration-200 p-0">
        {/* Google Header */}
        <div className="p-6 pb-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Google colored G */}
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
                para continuar en <strong className="text-gray-700 dark:text-slate-200">PrepIA</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar ventana de Google"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-600 dark:text-slate-400">
            PrepIA obtendrá tu nombre, dirección de correo electrónico y foto de perfil según las políticas de privacidad de Google.
          </p>

          {!showCustomInput ? (
            <div className="space-y-2">
              {defaultAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => onSelectAccount(acc)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-gray-200 dark:border-slate-800 hover:border-[#0066CC] dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${acc.bg} text-white font-bold flex items-center justify-center text-sm shadow-xs`}>
                      {acc.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-[#0066CC] dark:group-hover:text-blue-400 transition-colors">
                        {acc.nombre}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {acc.email}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#0066CC] dark:group-hover:text-blue-400 transition-transform group-hover:translate-x-1" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left text-gray-700 dark:text-slate-300 text-sm font-medium"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span>Usar otra cuenta de Google</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <Label htmlFor="google-email" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Tu correo de Google
                </Label>
                <Input
                  id="google-email"
                  type="email"
                  required
                  placeholder="ejemplo@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="google-name" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Nombre completo (opcional)
                </Label>
                <Input
                  id="google-name"
                  type="text"
                  placeholder="Tu Nombre"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomInput(false)}
                  className="flex-1 text-xs"
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-semibold"
                >
                  Continuar
                </Button>
              </div>
            </form>
          )}

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 dark:text-slate-500">
            <Shield className="w-3.5 h-3.5 text-green-500" /> Conexión segura y cifrada vía Google OAuth 2.0
          </div>
        </div>
      </Card>
    </div>
  );
}
