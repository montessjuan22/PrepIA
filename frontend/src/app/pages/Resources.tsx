import { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { apiGetPreparationResources, PreparationResource } from "../../services/api";
import { BookOpen, Video, FileText, Download, ExternalLink, FolderOpen } from "lucide-react";

const CATEGORIES: Array<{ name: PreparationResource["categoria"]; icon: typeof BookOpen }> = [
  { name: "Guías de Estudio", icon: BookOpen },
  { name: "Videos Tutoriales", icon: Video },
  { name: "Plantillas Profesionales", icon: FileText },
];

export function Resources() {
  const [resources, setResources] = useState<PreparationResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiGetPreparationResources()
      .then(setResources)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Recursos de Preparación
          </h1>
          <p className="text-base md:text-lg text-gray-600 dark:text-slate-300">
            Materiales reales publicados en la plataforma para tu preparación profesional
          </p>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
            Cargando materiales desde la base de datos...
          </Card>
        ) : resources.length === 0 ? (
          <Card className="p-10 text-center bg-white dark:bg-[#141d33] border border-gray-200 dark:border-slate-800">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Aún no hay material publicado
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Cuando los administradores suban guías, videos o plantillas reales a PostgreSQL, aparecerán aquí disponibles para ver y descargar.
            </p>
          </Card>
        ) : (
          <div className="space-y-6 md:space-y-8">
            {CATEGORIES.map(({ name, icon: Icon }) => {
              const items = resources.filter((r) => r.categoria === name);
              if (items.length === 0) return null;
              return (
                <Card key={name} className="p-4 md:p-6 bg-white dark:bg-[#141d33] border-gray-200 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <div className="bg-[#0066CC]/10 dark:bg-blue-900/40 p-2 md:p-3 rounded-lg">
                      <Icon className="w-5 h-5 md:w-6 md:h-6 text-[#0066CC] dark:text-blue-400" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{name}</h2>
                  </div>

                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {items.map((item) => {
                      const viewUrl = item.archivo_url || item.url_externa || "#";
                      const downloadUrl = item.archivo_url ? `${item.archivo_url}?download=true` : null;
                      return (
                        <Card
                          key={item.id}
                          className="p-4 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 flex flex-col justify-between gap-3"
                        >
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-[#0066CC] dark:text-blue-300">
                              {item.tipo}
                            </span>
                            <h3 className="font-semibold text-gray-900 dark:text-white mt-2 mb-1 text-base">
                              {item.titulo}
                            </h3>
                            {item.descripcion && (
                              <p className="text-xs text-gray-600 dark:text-slate-300">{item.descripcion}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                            {downloadUrl ? (
                              <a href={downloadUrl} download={item.nombre_archivo || undefined}>
                                <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5">
                                  <Download className="w-3.5 h-3.5" /> Descargar
                                </Button>
                              </a>
                            ) : (
                              <span />
                            )}
                            <a
                              href={viewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#0066CC] dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <span>Abrir</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
