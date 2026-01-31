
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, RefreshCw, Sparkles, X, FileText, CheckCircle2 } from 'lucide-react';

interface SmartScannerProps {
  onDetected: (data: any) => void;
  onClose: () => void;
  mode: 'sale' | 'inventory' | 'invoice';
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
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
      console.error(err);
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
      const base64Image = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let systemPrompt = "";
        let responseSchema: any = {};

        if (mode === 'invoice') {
          systemPrompt = "Você é um assistente contábil. Extraia a lista de produtos desta Nota Fiscal (DANFE). Para cada item, identifique: nome completo, quantidade e preço unitário de custo. Retorne uma lista.";
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    costPrice: { type: Type.NUMBER },
                    category: { type: Type.STRING }
                  },
                  required: ["name", "quantity", "costPrice"]
                }
              },
              confidence: { type: Type.NUMBER }
            },
            required: ["items"]
          };
        } else {
          systemPrompt = mode === 'sale' 
            ? "Identifique o produto de construção na imagem. Retorne Nome e Categoria."
            : "Analise este item de estoque para cadastro. Informe Nome, Categoria sugerida e Nível de Confiança.";
          
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ["name", "category", "confidence"]
          };
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
              { text: systemPrompt + " Retorne obrigatoriamente um JSON puro." }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        });

        const result = JSON.parse(response.text.trim());
        
        if (result) {
          onDetected(result);
          if (mode !== 'invoice') onClose();
        } else {
          setError("Não foi possível processar a imagem. Tente uma iluminação melhor.");
        }
      } catch (err) {
        console.error("AI Analysis Error:", err);
        setError("Erro na leitura da IA. Certifique-se que o documento está legível.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md aspect-[3/4] bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/10">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`w-72 h-72 border-2 border-white/10 rounded-3xl relative transition-all duration-500 ${mode === 'invoice' ? 'w-[85%] h-[60%]' : ''}`}>
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-brand-action rounded-tl-2xl"></div>
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-brand-action rounded-tr-2xl"></div>
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-brand-action rounded-bl-2xl"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-brand-action rounded-br-2xl"></div>
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-brand-action/5 flex items-center justify-center">
                <div className="w-full h-1 bg-brand-action shadow-[0_0_15px_#FFD600] absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
                <Sparkles className="text-brand-action/40 animate-pulse" size={40} />
              </div>
            )}
          </div>
          <p className="mt-8 text-white/50 text-[10px] font-black uppercase tracking-[0.3em] text-center px-10 leading-relaxed">
            {isAnalyzing ? "Processando Documento..." : mode === 'invoice' ? "Enquadre toda a Nota Fiscal" : "Posicione o item no centro"}
          </p>
        </div>

        <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-black/40 text-white rounded-full backdrop-blur-md border border-white/10">
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-600/90 backdrop-blur-lg text-white px-6 py-4 rounded-3xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 shadow-xl border border-red-400/20">
          <AlertCircle size={20} />
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider">Falha na Leitura</span>
            <span className="text-[10px] opacity-80">{error}</span>
          </div>
          <button onClick={startCamera} className="ml-4 bg-white/10 p-2 rounded-xl"><RefreshCw size={16} /></button>
        </div>
      )}

      <div className="mt-8 flex gap-4 w-full max-w-md">
        <button 
          onClick={captureAndAnalyze}
          disabled={isAnalyzing}
          className="flex-1 bg-brand-action text-brand-black font-black py-5 rounded-[2rem] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-xs"
        >
          {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : mode === 'invoice' ? <FileText size={18} /> : <Camera size={18} />}
          {mode === 'invoice' ? "Ler Nota Fiscal" : "Identificar Item"}
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
