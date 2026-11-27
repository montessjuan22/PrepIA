import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { 
  Layout, 
  Palette, 
  Component, 
  FileCode,
  Square,
  Circle,
  Type
} from "lucide-react";

export function Showcase() {
  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            PrepIA - Wireframes & Mockups
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Documentación visual y sistema de diseño
          </p>
        </div>

        <Tabs defaultValue="wireframes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6 md:mb-8 h-auto">
            <TabsTrigger value="wireframes" className="text-xs md:text-sm">Wireframes</TabsTrigger>
            <TabsTrigger value="colors" className="text-xs md:text-sm">Colores</TabsTrigger>
            <TabsTrigger value="components" className="text-xs md:text-sm">Componentes</TabsTrigger>
            <TabsTrigger value="architecture" className="text-xs md:text-sm">Arquitectura</TabsTrigger>
          </TabsList>

          {/* WIREFRAMES */}
          <TabsContent value="wireframes" className="space-y-8">
            {/* Landing Page Wireframe */}
            <Card className="p-6 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Layout className="w-5 h-5 text-[#0066CC]" />
                <h2 className="text-2xl font-semibold text-gray-900">Landing Page</h2>
              </div>
              
              <div className="bg-white border-2 border-gray-300 rounded-lg p-8">
                {/* Navbar wireframe */}
                <div className="border-2 border-gray-400 rounded mb-6 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-300 rounded"></div>
                      <div className="h-4 w-32 bg-gray-300 rounded"></div>
                    </div>
                    <div className="flex gap-4">
                      <div className="h-4 w-16 bg-gray-300 rounded"></div>
                      <div className="h-4 w-16 bg-gray-300 rounded"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-24 bg-gray-300 rounded"></div>
                      <div className="h-8 w-24 bg-blue-300 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Hero Section wireframe */}
                <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-8 mb-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <div className="h-8 bg-blue-300 rounded mb-4 w-3/4"></div>
                      <div className="h-4 bg-blue-200 rounded mb-2"></div>
                      <div className="h-4 bg-blue-200 rounded mb-6 w-5/6"></div>
                      <div className="flex gap-2">
                        <div className="h-10 w-32 bg-white rounded"></div>
                        <div className="h-10 w-32 bg-blue-300 rounded"></div>
                      </div>
                    </div>
                    <div className="bg-blue-200 rounded-lg h-48"></div>
                  </div>
                </div>

                {/* Features Section wireframe */}
                <div className="border-2 border-gray-400 rounded-lg p-6">
                  <div className="h-6 bg-gray-300 rounded mb-2 w-1/3 mx-auto"></div>
                  <div className="h-3 bg-gray-200 rounded mb-6 w-1/2 mx-auto"></div>
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="border-2 border-gray-300 rounded-lg p-4">
                        <div className="w-12 h-12 bg-blue-200 rounded mb-3"></div>
                        <div className="h-4 bg-gray-300 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded mt-1"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Estructura:</strong> Navbar sticky → Hero con CTA → Features grid → Footer
                </p>
              </div>
            </Card>

            {/* Dashboard Wireframe */}
            <Card className="p-6 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Layout className="w-5 h-5 text-[#0066CC]" />
                <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
              </div>
              
              <div className="bg-white border-2 border-gray-300 rounded-lg p-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-2 border-gray-300 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-200 rounded"></div>
                        <div className="flex-1">
                          <div className="h-3 bg-gray-200 rounded mb-2 w-2/3"></div>
                          <div className="h-5 bg-gray-300 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CV Uploader */}
                <div className="border-2 border-gray-400 rounded-lg p-6 mb-6">
                  <div className="h-4 bg-gray-300 rounded mb-4 w-1/4"></div>
                  <div className="border-2 border-dashed border-gray-400 rounded-lg p-12 text-center">
                    <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-3"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>

                {/* Interview Type Selector */}
                <div className="border-2 border-gray-400 rounded-lg p-6 mb-6">
                  <div className="h-4 bg-gray-300 rounded mb-4 w-1/4"></div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border-2 border-gray-300 rounded-lg p-4">
                        <div className="w-10 h-10 bg-green-200 rounded mb-3"></div>
                        <div className="h-4 bg-gray-300 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interview Simulator */}
                <div className="border-2 border-gray-400 rounded-lg p-6">
                  <div className="h-4 bg-gray-300 rounded mb-4 w-1/3"></div>
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-start">
                      <div className="bg-gray-200 rounded-lg p-3 w-2/3">
                        <div className="h-3 bg-gray-300 rounded mb-1"></div>
                        <div className="h-3 bg-gray-300 rounded w-4/5"></div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-blue-200 rounded-lg p-3 w-2/3">
                        <div className="h-3 bg-blue-300 rounded mb-1"></div>
                        <div className="h-3 bg-blue-300 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                  <div className="h-20 border-2 border-gray-300 rounded"></div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Estructura:</strong> Stats cards → CV Uploader → Type Selector → Interview Simulator → Dress Guide
                </p>
              </div>
            </Card>

            {/* Auth Pages Wireframe */}
            <Card className="p-6 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Layout className="w-5 h-5 text-[#0066CC]" />
                <h2 className="text-2xl font-semibold text-gray-900">Páginas de Autenticación</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Login */}
                <div className="bg-white border-2 border-gray-300 rounded-lg p-8">
                  <div className="max-w-sm mx-auto">
                    <div className="h-6 bg-gray-300 rounded mb-2 w-2/3 mx-auto"></div>
                    <div className="h-3 bg-gray-200 rounded mb-6 w-3/4 mx-auto"></div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="h-3 bg-gray-300 rounded mb-2 w-1/4"></div>
                        <div className="h-10 border-2 border-gray-300 rounded"></div>
                      </div>
                      <div>
                        <div className="h-3 bg-gray-300 rounded mb-2 w-1/4"></div>
                        <div className="h-10 border-2 border-gray-300 rounded"></div>
                      </div>
                      <div className="h-10 bg-blue-300 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Register */}
                <div className="bg-white border-2 border-gray-300 rounded-lg p-8">
                  <div className="max-w-sm mx-auto">
                    <div className="h-6 bg-gray-300 rounded mb-2 w-2/3 mx-auto"></div>
                    <div className="h-3 bg-gray-200 rounded mb-6 w-3/4 mx-auto"></div>
                    
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i}>
                          <div className="h-3 bg-gray-300 rounded mb-2 w-1/3"></div>
                          <div className="h-10 border-2 border-gray-300 rounded"></div>
                        </div>
                      ))}
                      <div className="h-10 bg-blue-300 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* COLOR SYSTEM */}
          <TabsContent value="colors" className="space-y-6">
            <Card className="p-6 border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <Palette className="w-5 h-5 text-[#0066CC]" />
                <h2 className="text-2xl font-semibold text-gray-900">Sistema de Colores</h2>
              </div>

              {/* Primary Colors */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Colores Primarios</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="h-24 bg-[#0066CC] rounded-lg shadow-md mb-2"></div>
                    <p className="font-mono text-sm text-gray-700">#0066CC</p>
                    <p className="text-xs text-gray-600">Primary Blue</p>
                  </div>
                  <div>
                    <div className="h-24 bg-[#004999] rounded-lg shadow-md mb-2"></div>
                    <p className="font-mono text-sm text-gray-700">#004999</p>
                    <p className="text-xs text-gray-600">Dark Blue</p>
                  </div>
                  <div>
                    <div className="h-24 bg-white border-2 border-gray-300 rounded-lg shadow-md mb-2"></div>
                    <p className="font-mono text-sm text-gray-700">#FFFFFF</p>
                    <p className="text-xs text-gray-600">White</p>
                  </div>
                  <div>
                    <div className="h-24 bg-gray-50 border-2 border-gray-300 rounded-lg shadow-md mb-2"></div>
                    <p className="font-mono text-sm text-gray-700">#F5F7FA</p>
                    <p className="text-xs text-gray-600">Light Gray</p>
                  </div>
                </div>
              </div>

              {/* Secondary Colors */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Colores Secundarios</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="h-24 bg-green-600 rounded-lg shadow-md mb-2"></div>
                    <p className="font-mono text-sm text-gray-700">green-600</p>
                    <p className="text-xs text-gray-600">Success</p>
                  </div>
                  <div>
                    <div className="h-24 bg-red-600 rounded-lg shadow-md mb-2"></div>
                    <p className="font-mono text-sm text-gray-700">red-600</p>
                    <p className="text-xs text-gray-600">Error</p>
                  </div>
                  <div>
                    <div className="h-24 bg-yellow-500 rounded-lg shadow-md mb-2"></div>
                    <p className="font-mono text-sm text-gray-700">yellow-500</p>
                    <p className="text-xs text-gray-600">Warning</p>
                  </div>
                  <div>
                    <div className="h-24 bg-purple-600 rounded-lg shadow-md mb-2"></div>
                    <p className="font-mono text-sm text-gray-700">purple-600</p>
                    <p className="text-xs text-gray-600">Accent</p>
                  </div>
                </div>
              </div>

              {/* Gray Scale */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Escala de Grises</h3>
                <div className="grid grid-cols-5 gap-4">
                  {[50, 100, 200, 400, 600, 700, 900].map((shade) => (
                    <div key={shade}>
                      <div className={`h-20 bg-gray-${shade} rounded-lg shadow-md mb-2`}></div>
                      <p className="font-mono text-xs text-gray-700">gray-{shade}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Usage Examples */}
            <Card className="p-6 border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Ejemplos de Uso</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button className="bg-[#0066CC] hover:bg-[#004999]">
                    Botón Primario
                  </Button>
                  <code className="text-sm bg-gray-100 px-3 py-1 rounded">
                    bg-[#0066CC] hover:bg-[#004999]
                  </code>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="outline" className="border-[#0066CC] text-[#0066CC]">
                    Botón Secundario
                  </Button>
                  <code className="text-sm bg-gray-100 px-3 py-1 rounded">
                    border-[#0066CC] text-[#0066CC]
                  </code>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-blue-900">
                    Mensaje Informativo
                  </div>
                  <code className="text-sm bg-gray-100 px-3 py-1 rounded">
                    bg-blue-50 border-blue-200 text-blue-900
                  </code>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* COMPONENTS */}
          <TabsContent value="components" className="space-y-6">
            <Card className="p-6 border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <Component className="w-5 h-5 text-[#0066CC]" />
                <h2 className="text-2xl font-semibold text-gray-900">Biblioteca de Componentes</h2>
              </div>

              <div className="space-y-8">
                {/* Buttons */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Botones</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button className="bg-[#0066CC] hover:bg-[#004999]">
                      Primario
                    </Button>
                    <Button variant="outline">
                      Secundario
                    </Button>
                    <Button variant="ghost">
                      Ghost
                    </Button>
                    <Button variant="destructive">
                      Destructivo
                    </Button>
                    <Button size="lg" className="bg-[#0066CC] hover:bg-[#004999]">
                      Grande
                    </Button>
                    <Button size="sm">
                      Pequeño
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Cards */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Tarjetas (Cards)</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="p-4 border-gray-200">
                      <h4 className="font-semibold mb-2 text-gray-900">Card Simple</h4>
                      <p className="text-sm text-gray-600">
                        Tarjeta básica con contenido
                      </p>
                    </Card>
                    <Card className="p-4 border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
                      <h4 className="font-semibold mb-2 text-gray-900">Card Interactiva</h4>
                      <p className="text-sm text-gray-600">
                        Con efecto hover
                      </p>
                    </Card>
                    <Card className="p-4 bg-blue-50 border-blue-200">
                      <h4 className="font-semibold mb-2 text-gray-900">Card con Color</h4>
                      <p className="text-sm text-gray-600">
                        Estilo personalizado
                      </p>
                    </Card>
                  </div>
                </div>

                <Separator />

                {/* Icons */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Iconos (Lucide React)</h3>
                  <div className="flex flex-wrap gap-6">
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Layout className="w-6 h-6 text-[#0066CC]" />
                      </div>
                      <span className="text-xs text-gray-600">Layout</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Palette className="w-6 h-6 text-[#0066CC]" />
                      </div>
                      <span className="text-xs text-gray-600">Palette</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Component className="w-6 h-6 text-[#0066CC]" />
                      </div>
                      <span className="text-xs text-gray-600">Component</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <FileCode className="w-6 h-6 text-[#0066CC]" />
                      </div>
                      <span className="text-xs text-gray-600">FileCode</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Typography */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Tipografía</h3>
                  <div className="space-y-3">
                    <h1 className="text-4xl font-bold text-gray-900">Heading 1 - 4xl</h1>
                    <h2 className="text-3xl font-bold text-gray-900">Heading 2 - 3xl</h2>
                    <h3 className="text-2xl font-semibold text-gray-900">Heading 3 - 2xl</h3>
                    <h4 className="text-xl font-semibold text-gray-900">Heading 4 - xl</h4>
                    <p className="text-base text-gray-700">Body text - base</p>
                    <p className="text-sm text-gray-600">Small text - sm</p>
                    <p className="text-xs text-gray-500">Extra small - xs</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ARCHITECTURE */}
          <TabsContent value="architecture" className="space-y-6">
            <Card className="p-6 border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <FileCode className="w-5 h-5 text-[#0066CC]" />
                <h2 className="text-2xl font-semibold text-gray-900">Arquitectura de la Aplicación</h2>
              </div>

              {/* File Structure */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Estructura de Archivos</h3>
                <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm">
                  <pre className="whitespace-pre-wrap">
{`/src
  /app
    /components
      /ui               # Componentes UI base (shadcn)
      Navbar.tsx        # Navegación principal
      CVUploader.tsx    # Carga de CV con drag & drop
      InterviewSimulator.tsx    # Chat de entrevista
      DressCodeGuide.tsx        # Guía de vestimenta
      InterviewTypeSelector.tsx # Selector de tipos
    /pages
      Root.tsx          # Layout raíz
      Landing.tsx       # Página de inicio
      Login.tsx         # Autenticación
      Register.tsx      # Registro
      Dashboard.tsx     # Panel principal
      Resources.tsx     # Recursos
      Showcase.tsx      # Esta página
    App.tsx             # Componente principal
    routes.ts           # Configuración de rutas
  /styles
    index.css
    theme.css
    tailwind.css`}
                  </pre>
                </div>
              </div>

              {/* Tech Stack */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Stack Tecnológico</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-4 border-gray-200">
                    <h4 className="font-semibold mb-3 text-gray-900">Frontend</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center gap-2">
                        <Circle className="w-2 h-2 fill-[#0066CC] text-[#0066CC]" />
                        React 18.3.1
                      </li>
                      <li className="flex items-center gap-2">
                        <Circle className="w-2 h-2 fill-[#0066CC] text-[#0066CC]" />
                        TypeScript
                      </li>
                      <li className="flex items-center gap-2">
                        <Circle className="w-2 h-2 fill-[#0066CC] text-[#0066CC]" />
                        React Router 7.13.0
                      </li>
                      <li className="flex items-center gap-2">
                        <Circle className="w-2 h-2 fill-[#0066CC] text-[#0066CC]" />
                        Tailwind CSS v4
                      </li>
                    </ul>
                  </Card>

                  <Card className="p-4 border-gray-200">
                    <h4 className="font-semibold mb-3 text-gray-900">Librerías</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center gap-2">
                        <Circle className="w-2 h-2 fill-green-600 text-green-600" />
                        Motion (Framer Motion)
                      </li>
                      <li className="flex items-center gap-2">
                        <Circle className="w-2 h-2 fill-green-600 text-green-600" />
                        React Dropzone
                      </li>
                      <li className="flex items-center gap-2">
                        <Circle className="w-2 h-2 fill-green-600 text-green-600" />
                        Lucide React (Icons)
                      </li>
                      <li className="flex items-center gap-2">
                        <Circle className="w-2 h-2 fill-green-600 text-green-600" />
                        Radix UI (Headless)
                      </li>
                    </ul>
                  </Card>
                </div>
              </div>

              {/* Flow Diagram */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Flujo de Navegación</h3>
                <div className="bg-white border-2 border-gray-300 rounded-lg p-8">
                  <div className="flex flex-col items-center space-y-4">
                    {/* Landing */}
                    <div className="bg-[#0066CC] text-white px-6 py-3 rounded-lg font-semibold">
                      Landing Page
                    </div>
                    
                    <div className="text-gray-400">↓</div>
                    
                    {/* Auth */}
                    <div className="flex gap-8">
                      <div className="bg-blue-100 border-2 border-blue-300 px-6 py-3 rounded-lg">
                        Login
                      </div>
                      <div className="bg-blue-100 border-2 border-blue-300 px-6 py-3 rounded-lg">
                        Register
                      </div>
                    </div>
                    
                    <div className="text-gray-400">↓</div>
                    
                    {/* Dashboard */}
                    <div className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold">
                      Dashboard
                    </div>
                    
                    <div className="text-gray-400">↓</div>
                    
                    {/* Features */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-purple-100 border border-purple-300 px-4 py-2 rounded text-sm text-center">
                        CV Upload
                      </div>
                      <div className="bg-purple-100 border border-purple-300 px-4 py-2 rounded text-sm text-center">
                        Type Selector
                      </div>
                      <div className="bg-purple-100 border border-purple-300 px-4 py-2 rounded text-sm text-center">
                        Interview Sim
                      </div>
                      <div className="bg-purple-100 border border-purple-300 px-4 py-2 rounded text-sm text-center">
                        Dress Guide
                      </div>
                    </div>
                    
                    <div className="text-gray-400">↔</div>
                    
                    {/* Resources */}
                    <div className="bg-yellow-500 text-white px-6 py-3 rounded-lg font-semibold">
                      Resources
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Component Details */}
            <Card className="p-6 border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Detalles de Componentes Principales</h3>
              
              <div className="space-y-4">
                <div className="border-l-4 border-[#0066CC] pl-4">
                  <h4 className="font-semibold text-gray-900">CVUploader</h4>
                  <p className="text-sm text-gray-600">Drag & drop con react-dropzone, barra de progreso animada, validación de archivos PDF</p>
                </div>

                <div className="border-l-4 border-green-600 pl-4">
                  <h4 className="font-semibold text-gray-900">InterviewSimulator</h4>
                  <p className="text-sm text-gray-600">Chat en tiempo real, indicador de typing, mensajes animados con Motion, feedback de IA</p>
                </div>

                <div className="border-l-4 border-purple-600 pl-4">
                  <h4 className="font-semibold text-gray-900">DressCodeGuide</h4>
                  <p className="text-sm text-gray-600">Tabs con imágenes de Unsplash, guía por sectores laborales, consejos contextuales</p>
                </div>

                <div className="border-l-4 border-yellow-600 pl-4">
                  <h4 className="font-semibold text-gray-900">InterviewTypeSelector</h4>
                  <p className="text-sm text-gray-600">Tarjetas seleccionables, animaciones con Motion, estado visual de selección</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}