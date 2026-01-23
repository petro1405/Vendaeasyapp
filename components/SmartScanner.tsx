
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, RefreshCw, Sparkles, X } from 'lucide-react';

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
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Não foi possível acessar a câmera. Verifique as permissões de vídeo no navegador.");
      console.error(err);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Captura o frame atual do vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Desenha a imagem centralizada para melhor foco
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = mode === 'sale' 
          ? "Identify exactly what construction product is in this image. Focus on the brand and specifications (e.g., 'Tijolo 8 furos', 'Argamassa Votoran AC-I 20kg'). Return a structured JSON."
          : "Analyze this item for store inventory. Provide the full product name and the most appropriate construction category. Return JSON.";

        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-latest',
          contents: [{
            parts: [
              { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
              { text: prompt }
            ]
          }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { 
                  type: Type.STRING,
                  description: "Full name and specifications of the identified product."
                },
                category: { 
                  type: Type.STRING,
                  description: "Construction category (e.g., Hidráulica, Elétrica, Tintas, Básico)."
                },
                confidence: { 
                  type: Type.NUMBER,
                  description: "A value between 0 and 1 indicating identification certainty."
                }
              },
              required: ["name"]
            }
          }
        });

        const responseText = response.text;
        
        if (!responseText) {
          throw new Error("Modelo não retornou texto.");
        }

        const result = JSON.parse(responseText.trim());
        
        if (result.name) {
          onDetected({
            name: result.name,
            category: result.category || 'Geral',
            confidence: result.confidence || 0.85
          });
          onClose();
        } else {
          setError("Produto não reconhecido claramente. Tente focar na etiqueta ou embalagem.");
        }
      } catch (err) {
        console.error("Scanner Error:", err);
        setError("Erro na análise de IA. Verifique sua conexão e tente novamente.");
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
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Overlay do Scanner */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center">
                <div className="w-full h-1 bg-indigo-500 absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
                <Sparkles className="text-white animate-pulse" size={32} />
              </div>
            )}
          </div>
          <p className="mt-8 text-white/70 text-xs font-black uppercase tracking-[0.2em] text-center px-8">
            {isAnalyzing ? "Processando Imagem..." : "Aponte para a embalagem ou rótulo"}
          </p>
        </div>

        {/* Botão de Fechar */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-3 bg-black/40 text-white rounded-full backdrop-blur-md active:scale-90 transition-all"
        >
          <X size={24} />
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-600/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <AlertCircle size={20} />
          <span className="text-sm font-bold">{error}</span>
          <button onClick={startCamera} className="ml-2 underline text-[10px] uppercase font-black">Tentar Novamente</button>
        </div>
      )}

      <div className="mt-8 flex gap-4 w-full max-w-md">
        <button 
          onClick={captureAndAnalyze}
          disabled={isAnalyzing}
          className="flex-1 bg-white text-indigo-600 font-black py-5 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-sm disabled:opacity-50"
        >
          {isAnalyzing ? <RefreshCw className="animate-spin" size={20} /> : <Camera size={20} />}
          Identificar Produto
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          50% { top: 100%; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SmartScanner;
