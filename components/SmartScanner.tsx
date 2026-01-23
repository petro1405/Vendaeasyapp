
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
      // Desenha a imagem para análise
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const systemPrompt = mode === 'sale' 
          ? "Você é um especialista em materiais de construção. Identifique o produto na imagem, incluindo marca e medida (ex: 'Cimento CP-II Votoran 50kg')."
          : "Analise este item de estoque. Informe o nome completo do produto e a categoria de construção mais adequada.";

        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
              { text: systemPrompt + " Retorne obrigatoriamente um JSON." }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { 
                  type: Type.STRING,
                  description: "Nome completo do produto e especificações."
                },
                category: { 
                  type: Type.STRING,
                  description: "Categoria de construção (ex: Hidráulica, Elétrica, Tintas)."
                },
                confidence: { 
                  type: Type.NUMBER,
                  description: "Nível de confiança de 0 a 1."
                }
              },
              required: ["name", "category", "confidence"]
            }
          }
        });

        const responseText = response.text;
        
        if (!responseText) {
          throw new Error("Resposta vazia da IA.");
        }

        const result = JSON.parse(responseText.trim());
        
        if (result.name) {
          onDetected({
            name: result.name,
            category: result.category || 'Geral',
            confidence: result.confidence || 0.8
          });
          onClose();
        } else {
          setError("Não consegui ler o rótulo. Tente aproximar mais a câmera.");
        }
      } catch (err) {
        console.error("AI Analysis Error:", err);
        setError("Erro na conexão com a IA. Tente focar melhor no produto.");
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
        
        {/* Scanner overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-72 h-72 border-2 border-white/10 rounded-3xl relative">
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-indigo-500 rounded-tl-2xl"></div>
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-indigo-500 rounded-tr-2xl"></div>
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-indigo-500 rounded-bl-2xl"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-indigo-500 rounded-br-2xl"></div>
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-indigo-500/5 flex items-center justify-center">
                <div className="w-full h-1 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.8)] absolute top-0 animate-[scan_1.5s_ease-in-out_infinite]"></div>
                <Sparkles className="text-white/40 animate-pulse" size={40} />
              </div>
            )}
          </div>
          <p className="mt-8 text-white/50 text-[10px] font-black uppercase tracking-[0.3em] text-center px-10 leading-relaxed">
            {isAnalyzing ? "Analisando com Inteligência Artificial..." : "Posicione o produto ou código de barras no centro"}
          </p>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-3 bg-black/40 text-white rounded-full backdrop-blur-md active:scale-90 transition-all border border-white/10"
        >
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-600/90 backdrop-blur-lg text-white px-6 py-4 rounded-3xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 shadow-xl border border-red-400/20">
          <AlertCircle size={20} />
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider">Falha na Identificação</span>
            <span className="text-[10px] opacity-80">{error}</span>
          </div>
          <button onClick={startCamera} className="ml-4 bg-white/10 p-2 rounded-xl active:scale-90 transition-all"><RefreshCw size={16} /></button>
        </div>
      )}

      <div className="mt-8 flex gap-4 w-full max-w-md">
        <button 
          onClick={captureAndAnalyze}
          disabled={isAnalyzing}
          className="flex-1 bg-white text-indigo-600 font-black py-5 rounded-[2rem] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:scale-100"
        >
          {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Camera size={18} />}
          Identificar Agora
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0.2; }
          50% { top: 100%; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SmartScanner;
