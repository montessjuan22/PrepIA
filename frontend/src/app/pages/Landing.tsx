import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/button";
import { LinkButton } from "../components/ui/link-button";
import { Card } from "../components/ui/card";
import { BrainCircuit, Upload, MessageSquare, TrendingUp, ShieldCheck } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0066CC] to-[#004999] text-white py-12 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6">
                Prepárate para tu próxima entrevista con IA
              </h1>
              <p className="text-lg md:text-xl mb-6 md:mb-8 text-blue-100">
                Practica entrevistas reales, recibe retroalimentación instantánea y mejora tus habilidades con inteligencia artificial.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center md:justify-start">
                <LinkButton size="lg" className="w-full sm:w-auto bg-white text-[#0066CC] hover:bg-gray-100" to="/register">
                  Comenzar Gratis
                </LinkButton>
                <LinkButton size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10" to="/empleos">
                  Buscar Empleos
                </LinkButton>
              </div>
            </div>
            <div className="hidden md:block">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1698047681452-08eba22d0c64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqb2IlMjBpbnRlcnZpZXclMjBwcm9mZXNzaW9uYWwlMjBjb25maWRlbmNlfGVufDF8fHx8MTc3NDQ1MDk3Mnww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Professional interview"
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 md:mb-4 text-gray-900 dark:text-white">
            Todo lo que necesitas para triunfar
          </h2>
          <p className="text-center text-gray-600 dark:text-slate-300 mb-8 md:mb-12 text-base md:text-lg px-4">
            Herramientas profesionales impulsadas por inteligencia artificial
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <Card className="p-5 md:p-6 hover:shadow-lg transition-shadow border-gray-200 dark:border-slate-800 bg-white dark:bg-[#141d33]">
              <div className="bg-[#0066CC]/10 p-3 rounded-lg w-fit mb-4">
                <BrainCircuit className="w-7 h-7 md:w-8 md:h-8 text-[#0066CC]" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-900 dark:text-white">IA Personalizada</h3>
              <p className="text-sm md:text-base text-gray-600">
                Análisis inteligente de tu CV para preguntas personalizadas
              </p>
            </Card>

            <Card className="p-5 md:p-6 hover:shadow-lg transition-shadow border-gray-200 dark:border-slate-800 bg-white dark:bg-[#141d33]">
              <div className="bg-[#0066CC]/10 p-3 rounded-lg w-fit mb-4">
                <Upload className="w-7 h-7 md:w-8 md:h-8 text-[#0066CC]" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-900 dark:text-white">Carga tu CV</h3>
              <p className="text-sm md:text-base text-gray-600">
                Arrastra y suelta tu hoja de vida para análisis instantáneo
              </p>
            </Card>

            <Card className="p-5 md:p-6 hover:shadow-lg transition-shadow border-gray-200 dark:border-slate-800 bg-white dark:bg-[#141d33]">
              <div className="bg-[#0066CC]/10 p-3 rounded-lg w-fit mb-4">
                <MessageSquare className="w-7 h-7 md:w-8 md:h-8 text-[#0066CC]" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-900 dark:text-white">Simulación Real</h3>
              <p className="text-sm md:text-base text-gray-600">
                Entrevistas interactivas que simulan escenarios reales
              </p>
            </Card>

            <Card className="p-5 md:p-6 hover:shadow-lg transition-shadow border-gray-200 dark:border-slate-800 bg-white dark:bg-[#141d33]">
              <div className="bg-[#0066CC]/10 p-3 rounded-lg w-fit mb-4">
                <TrendingUp className="w-7 h-7 md:w-8 md:h-8 text-[#0066CC]" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-900 dark:text-white">Mejora Continua</h3>
              <p className="text-sm md:text-base text-gray-600">
                Retroalimentación detallada para mejorar tus respuestas
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-100 py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ShieldCheck className="w-12 h-12 md:w-16 md:h-16 text-[#0066CC] mx-auto mb-4 md:mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4 text-gray-900 px-4">
            Comienza tu preparación hoy
          </h2>
          <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8 px-4">
            Únete a miles de profesionales que han mejorado sus habilidades de entrevista
          </p>
          <LinkButton size="lg" className="bg-[#0066CC] hover:bg-[#004999] text-white" to="/register">
            Crear Cuenta Gratuita
          </LinkButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p>© 2026 PrepIA. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}