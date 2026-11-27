import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Code, Users, Briefcase, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

type InterviewType = "technical" | "behavioral" | "leadership" | null;

export function InterviewTypeSelector() {
  const [selectedType, setSelectedType] = useState<InterviewType>(null);

  const types = [
    {
      id: "technical" as InterviewType,
      title: "Entrevista Técnica",
      description: "Preguntas de resolución de problemas, código y conocimientos técnicos",
      icon: Code,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      examples: [
        "Algoritmos y estructuras de datos",
        "Diseño de sistemas",
        "Debugging de código",
      ],
    },
    {
      id: "behavioral" as InterviewType,
      title: "Entrevista Comportamental",
      description: "Evaluación de habilidades blandas, experiencias pasadas y valores",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      examples: [
        "Trabajo en equipo",
        "Resolución de conflictos",
        "Adaptación al cambio",
      ],
    },
    {
      id: "leadership" as InterviewType,
      title: "Entrevista de Liderazgo",
      description: "Capacidad de gestión, toma de decisiones y visión estratégica",
      icon: Briefcase,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      examples: [
        "Gestión de equipos",
        "Decisiones estratégicas",
        "Delegación efectiva",
      ],
    },
  ];

  return (
    <Card className="p-4 md:p-6 border-gray-200">
      <div className="mb-4 md:mb-6">
        <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-900">Tipo de Entrevista</h3>
        <p className="text-sm md:text-base text-gray-600">
          Selecciona el tipo de entrevista que deseas practicar
        </p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {types.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;

          return (
            <motion.div
              key={type.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                onClick={() => setSelectedType(type.id)}
                className={`p-4 md:p-6 cursor-pointer transition-all ${
                  isSelected
                    ? `${type.bgColor} ${type.borderColor} border-2 shadow-md`
                    : "border-gray-200 hover:border-gray-300 hover:shadow"
                }`}
              >
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className={`p-2 md:p-3 rounded-lg ${type.bgColor}`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${type.color}`} />
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <CheckCircle className={`w-5 h-5 md:w-6 md:h-6 ${type.color}`} />
                    </motion.div>
                  )}
                </div>

                <h4 className="font-semibold mb-2 text-gray-900 text-sm md:text-base">{type.title}</h4>
                <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">{type.description}</p>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Incluye:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {type.examples.map((example, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></div>
                        <span className="line-clamp-1">{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {selectedType && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 md:mt-6 flex justify-center"
        >
          <Button size="lg" className="bg-[#0066CC] hover:bg-[#004999] w-full sm:w-auto text-sm md:text-base">
            Comenzar Práctica de{" "}
            {types.find((t) => t.id === selectedType)?.title}
          </Button>
        </motion.div>
      )}
    </Card>
  );
}