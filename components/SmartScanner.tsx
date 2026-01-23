
import React, { useRef, useState, useEffect } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Camera, X, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface SmartScannerProps {
  onDetected: (data: { name: string; category?: string; confidence: number }) => void;
  onClose: () => void;
  mode: 'sale' | 'inventory';
}

const SmartScanner: React.FC<SmartScannerProps> = ({ onDetected, onClose, mode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      try {
        // Always initialize GoogleGenAI within the scope to ensure environment variables are fresh
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = mode === 'sale' 
          ? "Identify the construction material or tool in this image. Look for brand names, labels, or the product type. Return JSON with 'name' (be specific, e.g., 'Cimento CP-II Itaú 50kg') and 'category'."
          : "Analyze this product for inventory registration. Suggest a precise 'name' and 'category' based on visual features or labels. Return JSON.";

        // Use correct model and structured response generation
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
              { text: prompt }
            ]
          },
          config: {
            responseMimeType: "application/json",
            // Thinking budget set to 0 as per guidelines for latency sensitive identification
            thinkingConfig: { thinkingBudget: 0 },
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ["name"]
            }
          }
        });

        // Extract text directly from the text property as per guidelines
        const responseText = response.text || '{}';
        const result = JSON.parse(responseText.trim());
        
        if (result.name) {
          onDetected({
            name: result.name,
            category: result.category,
            confidence: result.confidence || 0.9
          });
          onClose();
        } else {
          setError("Não consegui identificar o produto. Tente aproximar mais.");
        }
      } catch (err) {
        setError("Erro ao analisar imagem. Tente novamente.");
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md aspect-[3/4] bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/10">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Overlay do Scanner */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-indigo-500/20 animate-pulse flex items-center justify-center">
                <Sparkles className="text-white animate-spin" size={32} />
              </div>
            )}
          </div>
          <p className="mt-8 text-white/70 text-xs font-bold uppercase tracking-widest text-center px-8">
            {isAnalyzing ? "Analisando com IA..." : "Posicione o produto ou etiqueta no quadro"}
          </p>
        </div>

        {/* Botão de Fechar */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-3 bg-black/50 text-white rounded-full backdrop-blur-md"
        >
          <X size={24} />
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-500 text-white px-6 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle size={20} />
          <span className="text-sm font-bold">{error}</span>
          <button onClick={startCamera} className="ml-2 underline text-xs uppercase font-black">Reiniciar</button>
        </div>
      )}

      <div className="mt-8 flex gap-4 w-full max-w-md">
        <button 
          onClick={captureAndAnalyze}
          disabled={isAnalyzing}
          className="flex-1 bg-white text-indigo-600 font-black py-5 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-sm disabled:opacity-50"
        >
          {isAnalyzing ? <RefreshCw className="animate-spin" /> : <Camera />}
          Identificar Produto
        </button>
      </div>
    </div>
  );
};

export default SmartScanner;
