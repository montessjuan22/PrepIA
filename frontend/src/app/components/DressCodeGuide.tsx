import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Shirt, Briefcase, Palette } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function DressCodeGuide() {
  return (
    <Card className="p-4 md:p-6 border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Shirt className="w-4 h-4 md:w-5 md:h-5 text-[#0066CC]" />
        <h3 className="text-lg md:text-xl font-semibold text-gray-900">Guía de Vestimenta Profesional</h3>
      </div>

      <Tabs defaultValue="business-casual" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="business-casual" className="text-xs sm:text-sm px-2">Business Casual</TabsTrigger>
          <TabsTrigger value="formal" className="text-xs sm:text-sm px-2">Formal</TabsTrigger>
          <TabsTrigger value="creative" className="text-xs sm:text-sm px-2">Creativo</TabsTrigger>
        </TabsList>

        <TabsContent value="business-casual" className="space-y-4">
          <div className="rounded-lg overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1770364019396-36ae51854520?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGNhc3VhbCUyMHByb2Zlc3Npb25hbCUyMGF0dGlyZXxlbnwxfHx8fDE3NzQ0NTA5NzF8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Business Casual"
              className="w-full h-48 md:h-64 object-cover"
            />
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 text-sm md:text-base">Ideal para:</h4>
            <p className="text-sm md:text-base text-gray-600">
              Startups, empresas tecnológicas, entrevistas en oficinas modernas
            </p>
            <ul className="list-disc list-inside text-sm md:text-base text-gray-600 space-y-1">
              <li>Camisa o blusa sin corbata</li>
              <li>Pantalones de vestir o khakis</li>
              <li>Zapatos cerrados elegantes</li>
              <li>Colores neutros o sutiles</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="formal" className="space-y-4">
          <div className="rounded-lg overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1515736076039-a3ca66043b27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb3JtYWwlMjBidXNpbmVzcyUyMHN1aXQlMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzc0NDUwOTcxfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Formal Business"
              className="w-full h-48 md:h-64 object-cover"
            />
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 text-sm md:text-base">Ideal para:</h4>
            <p className="text-sm md:text-base text-gray-600">
              Corporaciones, bancos, firmas legales, consultorías
            </p>
            <ul className="list-disc list-inside text-sm md:text-base text-gray-600 space-y-1">
              <li>Traje completo (saco y pantalón)</li>
              <li>Camisa blanca o de color sólido</li>
              <li>Corbata conservadora</li>
              <li>Zapatos de vestir lustrados</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="creative" className="space-y-4">
          <div className="rounded-lg overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1758873268663-5a362616b5a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMGNhc3VhbCUyMHdvcmtwbGFjZSUyMGF0dGlyZXxlbnwxfHx8fDE3NzQ0NTA5NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Creative Casual"
              className="w-full h-48 md:h-64 object-cover"
            />
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 text-sm md:text-base">Ideal para:</h4>
            <p className="text-sm md:text-base text-gray-600">
              Agencias de diseño, publicidad, industrias creativas
            </p>
            <ul className="list-disc list-inside text-sm md:text-base text-gray-600 space-y-1">
              <li>Estilo personal pero pulido</li>
              <li>Colores y patrones expresivos</li>
              <li>Accesorios con personalidad</li>
              <li>Calzado elegante pero cómodo</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 md:mt-6 p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs md:text-sm text-gray-700">
          <strong>Consejo:</strong> Cuando tengas dudas, es mejor vestir más formal que casual.
          Investiga la cultura de la empresa antes de tu entrevista.
        </p>
      </div>
    </Card>
  );
}