import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { getInitialTheme, toggleTheme, Theme } from "../../services/theme";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const [theme, setLocalTheme] = useState<Theme>("light");

  useEffect(() => {
    const initial = getInitialTheme();
    setLocalTheme(initial);

    const onThemeChange = (e: any) => {
      if (e.detail) {
        setLocalTheme(e.detail);
      }
    };

    window.addEventListener("theme-change", onThemeChange);
    return () => window.removeEventListener("theme-change", onThemeChange);
  }, []);

  const handleToggle = () => {
    const next = toggleTheme();
    setLocalTheme(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer select-none ${
        theme === "dark"
          ? "bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700 shadow-sm"
          : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 hover:text-gray-900"
      } ${className}`}
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label="Alternar modo oscuro y claro"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
}
