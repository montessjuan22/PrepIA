import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LinkButton } from "./ui/link-button";
import { Button } from "./ui/button";
import { BrainCircuit, LogOut, User, Building2, Shield, LayoutDashboard } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";
import { getCurrentUser, logoutUser, getDashboardRouteForRole, UserSession } from "../services/api";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getCurrentUser());
    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("user-session-update", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("user-session-update", syncUser);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    navigate("/login");
  };

  const getRoleBadge = (rol: string) => {
    if (rol === "reclutador" || rol === "company") {
      return {
        label: "Empresa",
        bg: "bg-green-100 dark:bg-green-950/70 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
        icon: Building2,
      };
    }
    if (rol === "admin") {
      return {
        label: "Admin",
        bg: "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        icon: Shield,
      };
    }
    return {
      label: "Candidato",
      bg: "bg-blue-100 dark:bg-blue-950/70 text-[#0066CC] dark:text-blue-300 border-blue-200 dark:border-blue-800",
      icon: User,
    };
  };

  return (
    <nav className="bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile Menu & Theme Toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <MobileMenu />
            <ThemeToggle className="h-9 w-9 p-0" />
          </div>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="bg-[#0066CC] group-hover:bg-[#004999] transition-colors p-2.5 rounded-xl shadow-sm text-white">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Prep<span className="text-[#0066CC] dark:text-blue-400">IA</span>
            </span>
          </Link>

          {/* Navigation Links - Desktop Only */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/' 
                  ? 'text-[#0066CC] dark:text-blue-400 font-semibold' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-[#0066CC] dark:hover:text-blue-400'
              }`}
            >
              Inicio
            </Link>
            <Link 
              to="/showcase" 
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/showcase' 
                  ? 'text-[#0066CC] dark:text-blue-400 font-semibold' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-[#0066CC] dark:hover:text-blue-400'
              }`}
            >
              Wireframes
            </Link>
          </div>

          {/* Desktop Right Action Bar: Theme Toggle + Auth */}
          <div className="hidden md:flex items-center gap-3">
            {/* Dark Mode Switcher */}
            <ThemeToggle />

            {currentUser ? (
              <div className="flex items-center gap-2.5">
                {(() => {
                  const badge = getRoleBadge(currentUser.rol);
                  const Icon = badge.icon;
                  return (
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700">
                      <div className={`p-1 rounded-md border text-xs flex items-center gap-1 font-semibold ${badge.bg}`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{badge.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 max-w-[130px] truncate">
                        {currentUser.nombre}
                      </span>
                    </div>
                  );
                })()}

                <LinkButton 
                  to={getDashboardRouteForRole(currentUser.rol)}
                  className="bg-[#0066CC] hover:bg-[#004999] text-white text-xs h-9 px-3 gap-1.5 rounded-lg flex items-center"
                >
                  <LayoutDashboard className="w-4 h-4" /> Mi Panel
                </LinkButton>

                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-gray-200 dark:border-slate-700 text-xs h-9 px-3 gap-1 rounded-lg flex items-center"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" /> Salir
                </Button>
              </div>
            ) : (
              <>
                <LinkButton 
                  variant="ghost" 
                  className="text-gray-700 dark:text-gray-200 hover:text-[#0066CC] dark:hover:text-blue-400 font-semibold text-sm" 
                  to="/login"
                >
                  Iniciar Sesión
                </LinkButton>
                <LinkButton 
                  className="bg-[#0066CC] hover:bg-[#004999] text-white font-semibold text-sm rounded-xl px-4 shadow-sm" 
                  to="/register"
                >
                  Registrarse
                </LinkButton>
              </>
            )}
          </div>

          {/* Mobile Right Action */}
          <div className="md:hidden flex items-center gap-2">
            {currentUser ? (
              <Button size="sm" variant="outline" onClick={handleLogout} className="text-xs text-red-600 dark:text-red-400 dark:border-slate-700">
                Salir
              </Button>
            ) : (
              <LinkButton size="sm" className="bg-[#0066CC] hover:bg-[#004999] text-white text-xs" to="/login">
                Entrar
              </LinkButton>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
