import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { LinkButton } from "./ui/link-button";
import { Menu, BrainCircuit, X } from "lucide-react";

export function MobileMenu() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  const navLinks = [
    { to: "/", label: "Inicio" },
    { to: "/showcase", label: "Wireframes" },
  ];

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden text-gray-700 hover:text-[#0066CC]"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="w-6 h-6" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={closeMenu}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-[280px] sm:w-[320px] bg-white shadow-2xl p-6 flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-6 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="bg-[#0066CC] p-2 rounded-xl text-white shadow-sm">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-gray-900 tracking-tight">PrepIA</span>
                </div>
                <button 
                  onClick={closeMenu} 
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={closeMenu}
                    className={`px-4 py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-between ${
                      location.pathname === link.to
                        ? "bg-[#0066CC] text-white shadow-sm"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>{link.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {/* Auth Actions */}
            <div className="border-t border-gray-100 pt-5 space-y-2.5">
              <LinkButton 
                variant="outline" 
                className="w-full justify-center h-11 border-gray-200" 
                to="/login" 
                onClick={closeMenu}
              >
                Iniciar Sesión
              </LinkButton>
              <LinkButton 
                className="w-full justify-center h-11 bg-[#0066CC] hover:bg-[#004999] text-white font-semibold" 
                to="/register" 
                onClick={closeMenu}
              >
                Registrarse
              </LinkButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
