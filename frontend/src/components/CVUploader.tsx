import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, X } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

export function CVUploader() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setIsAnalyzed(false);

      // Simular análisis de IA
      const interval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsAnalyzing(false);
            setIsAnalyzed(true);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  });

  const removeFile = () => {
    setUploadedFile(null);
    setIsAnalyzing(false);
    setAnalysisProgress(0);
    setIsAnalyzed(false);
  };

  return (
    <Card className="p-4 md:p-6 border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-4 h-4 md:w-5 md:h-5 text-[#0066CC]" />
        <h3 className="text-lg md:text-xl font-semibold text-gray-900">Carga tu Hoja de Vida</h3>
      </div>

      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 md:p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-[#0066CC] bg-blue-50"
              : "border-gray-300 hover:border-[#0066CC] hover:bg-gray-50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
          {isDragActive ? (
            <p className="text-[#0066CC] text-base md:text-lg">Suelta tu archivo aquí...</p>
          ) : (
            <div>
              <p className="text-gray-700 text-base md:text-lg mb-2">
                Arrastra tu CV aquí o haz clic para seleccionar
              </p>
              <p className="text-gray-500 text-xs md:text-sm">Solo archivos PDF (máx. 10MB)</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <FileText className="w-6 h-6 md:w-8 md:h-8 text-[#0066CC] flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm md:text-base truncate">{uploadedFile.name}</p>
                <p className="text-xs md:text-sm text-gray-500">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-gray-500 hover:text-red-600 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs md:text-sm">
                <span className="text-gray-600">Analizando con IA...</span>
                <span className="text-[#0066CC] font-medium">{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
            </div>
          )}

          {isAnalyzed && (
            <div className="flex items-start gap-2 p-3 md:p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 text-sm md:text-base">¡Análisis completado!</p>
                <p className="text-xs md:text-sm text-green-700 mt-1">
                  Tu CV ha sido analizado. Las preguntas se personalizarán según tu perfil.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}