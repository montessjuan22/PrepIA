import { useState, useRef, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { MessageSquare, Play, Send, Sparkles, StopCircle } from "lucide-react";
import { motion } from "motion/react";

interface Message {
  id: string;
  role: "ai" | "user";
  content: string;
  timestamp: Date;
}

const sampleQuestions = [
  "Cuéntame sobre ti y tu experiencia profesional.",
  "¿Por qué estás interesado en este puesto?",
  "Describe una situación difícil que hayas enfrentado en el trabajo y cómo la resolviste.",
  "¿Cuáles son tus principales fortalezas y debilidades?",
  "¿Dónde te ves en 5 años?",
];

export function InterviewSimulator() {
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startInterview = () => {
    setIsActive(true);
    setMessages([
      {
        id: "welcome",
        role: "ai",
        content:
          "¡Hola! Soy tu entrevistador virtual. Hoy realizaremos una simulación de entrevista profesional. Responde con naturalidad y tómate el tiempo que necesites. ¿Estás listo para comenzar?",
        timestamp: new Date(),
      },
    ]);
  };

  const endInterview = () => {
    setIsActive(false);
    const feedbackMessage: Message = {
      id: "feedback-" + Date.now(),
      role: "ai",
      content:
        "¡Excelente trabajo! Has completado la entrevista. Aquí está tu retroalimentación:\n\n✓ Comunicación clara y estructurada\n✓ Buenos ejemplos específicos\n✓ Actitud profesional positiva\n\n💡 Áreas de mejora: Intenta ser más conciso en algunas respuesas.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, feedbackMessage]);
  };

  const sendMessage = () => {
    if (!currentInput.trim()) return;

    const userMessage: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: currentInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentInput("");
    setIsTyping(true);

    // Simular respuesta de IA
    setTimeout(() => {
      const randomQuestion =
        sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
      const aiMessage: Message = {
        id: "ai-" + Date.now(),
        role: "ai",
        content: `Excelente respuesta. ${randomQuestion}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <Card className="p-4 md:p-6 border-gray-200 h-[500px] md:h-[600px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-[#0066CC]" />
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">Simulador de Entrevista IA</h3>
        </div>
        {isActive && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs md:text-sm text-gray-600 hidden sm:inline">En vivo</span>
          </div>
        )}
      </div>

      {!isActive && messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="bg-[#0066CC]/10 p-4 md:p-6 rounded-full mb-4">
            <Play className="w-10 h-10 md:w-12 md:h-12 text-[#0066CC]" />
          </div>
          <h4 className="text-lg md:text-xl font-semibold mb-2 text-gray-900">
            Comienza tu Entrevista Virtual
          </h4>
          <p className="text-sm md:text-base text-gray-600 mb-6 max-w-md">
            Practica con nuestro entrevistador IA y recibe retroalimentación en tiempo real
          </p>
          <Button
            onClick={startInterview}
            size="lg"
            className="bg-[#0066CC] hover:bg-[#004999] w-full sm:w-auto"
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar Entrevista
          </Button>
        </div>
      ) : (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 mb-4 pr-2">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-lg ${
                    message.role === "user"
                      ? "bg-[#0066CC] text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {message.role === "ai" && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="text-xs font-medium">Entrevistador IA</span>
                    </div>
                  )}
                  <p className="whitespace-pre-line text-sm md:text-base">{message.content}</p>
                  <span className="text-xs opacity-70 mt-2 block">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 md:p-4 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {isActive ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Textarea
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Escribe tu respuesta aquí..."
                  className="resize-none text-sm md:text-base"
                  rows={3}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={sendMessage}
                  className="flex-1 bg-[#0066CC] hover:bg-[#004999] text-sm md:text-base"
                >
                  <Send className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  Enviar Respuesta
                </Button>
                <Button
                  onClick={endInterview}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 text-sm md:text-base"
                >
                  <StopCircle className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  Finalizar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={startInterview}
              className="w-full bg-[#0066CC] hover:bg-[#004999]"
            >
              <Play className="w-4 h-4 mr-2" />
              Nueva Entrevista
            </Button>
          )}
        </>
      )}
    </Card>
  );
}