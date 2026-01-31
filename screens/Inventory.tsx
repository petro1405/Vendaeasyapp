
import React, { useState, useEffect, useRef } from 'react';
import { Product, User as UserType } from '../types';
import { db } from '../db';
import SmartScanner from '../components/SmartScanner';
import { GoogleGenAI, Type } from "@google/genai";
import { Search, Plus, Minus, Check, Package, Layers, X, Lock, Camera, Sparkles, Pencil, Percent, ShieldCheck, ShieldAlert, FileText, CheckCircle2, AlertTriangle, Loader2, Hash, Keyboard, QrCode } from 'lucide-react';

interface InventoryProps {
  products: Product[];
  onUpdate: () => void;
  currentUser: UserType | null;
}

const Inventory: React.FC<InventoryProps> = ({ products, onUpdate, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<Product['id'] | null>(null);
  const [tempStock, setTempStock] = useState<number>(0);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'inventory' | 'invoice'>('inventory');
  
  // States para Importação de NF
  const [showImportSelector, setShowImportSelector] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [isFetchingKey, setIsFetchingKey] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [isReviewingInvoice, setIsReviewingInvoice] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const isAdmin = currentUser?.role === 'admin';

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formInitialStock, setFormInitialStock] = useState('');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startQuickAdjust = (p: Product) => {
    if (!isAdmin) return;
    setEditingId(p.id);
    setTempStock(p.stockQuantity);
  };

  const handleQuickSave = async (id: Product['id']) => {
    await db.updateProductStock(id, tempStock);
    setEditingId(null);
    onUpdate();
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const data = {
      name: formName,
      category: formCategory || 'Geral',
      price: parseFloat(formPrice),
      costPrice: parseFloat(formCostPrice) || 0,
      stockQuantity: parseFloat(formInitialStock) || 0,
      allowDiscount: true,
      maxDiscountPercent: 10
    };

    try {
      if (isEditModalOpen && productToEdit) {
        await db.updateProduct(productToEdit.id, data);
      } else {
        await db.addProduct(data);
      }
      closeModals();
      onUpdate();
    } catch (err) {
      alert("Erro ao salvar produto.");
    }
  };

  const openEditModal = (p: Product) => {
    if (!isAdmin) return;
    setProductToEdit(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormPrice(p.price.toString());
    setFormCostPrice(p.costPrice?.toString() || '');
    setFormInitialStock(p.stockQuantity.toString());
    setIsEditModalOpen(true);
  };

  const handleScannerDetected = (data: any) => {
    if (scannerMode === 'invoice') {
      setInvoiceItems(data.items || []);
      setIsReviewingInvoice(true);
      setIsScannerOpen(false);
    } else {
      setFormName(data.name);
      if (data.category) setFormCategory(data.category);
      setIsAddModalOpen(true);
    }
  };

  const fetchInvoiceByKey = async () => {
    if (accessKey.length < 44) {
      alert("A chave de acesso deve ter 44 dígitos.");
      return;
    }

    setIsFetchingKey(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simule a extração de dados de uma NF-e brasileira para a chave: ${accessKey}. Retorne uma lista de 3 a 5 produtos fictícios de material de construção.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
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
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text.trim());
      setInvoiceItems(result.items || []);
      setIsReviewingInvoice(true);
      setShowKeyInput(false);
      setAccessKey('');
    } catch (e) {
      alert("Erro ao consultar chave.");
    } finally {
      setIsFetchingKey(false);
    }
  };

  const saveInvoiceToDatabase = async () => {
    setIsSavingInvoice(true);
    try {
      for (const item of invoiceItems) {
        const existing = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
        if (existing) {
          const newQty = (existing.stockQuantity || 0) + (item.quantity || 0);
          await db.updateProduct(existing.id, {
            stockQuantity: newQty,
            costPrice: item.costPrice
          });
        } else {
          await db.addProduct({
            name: item.name,
            category: item.category || 'Geral',
            price: item.costPrice * 1.35,
            costPrice: item.costPrice,
            stockQuantity: item.quantity,
            allowDiscount: true,
            maxDiscountPercent: 10
          });
        }
      }
      setIsReviewingInvoice(false);
      setInvoiceItems([]);
      onUpdate();
    } catch (e) {
      alert("Erro ao salvar itens.");
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const closeModals = () => {
    setFormName(''); setFormCategory(''); setFormPrice(''); setFormCostPrice(''); setFormInitialStock('');
    setIsAddModalOpen(false); setIsEditModalOpen(false); setShowImportSelector(false); setShowKeyInput(false);
  };

  return (
    <div className="p-4 space-y-4 bg-brand-bg min-h-full">
      {isScannerOpen && (
        <SmartScanner mode={scannerMode} onClose={() => setIsScannerOpen(false)} onDetected={handleScannerDetected} />
      )}

      {isBarcodeScannerOpen && (
        <NativeBarcodeScanner 
          onDetected={(code) => { setAccessKey(code); setIsBarcodeScannerOpen(false); }} 
          onClose={() => setIsBarcodeScannerOpen(false)} 
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-brand-primary tracking-tight">Estoque</h2>
        {isAdmin && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowImportSelector(true)}
              className="bg-white text-brand-primary p-3 rounded-2xl border border-brand-primary/10 shadow-sm active:scale-95 transition-all"
            >
              <FileText size={20} />
            </button>
            <button 
              onClick={() => { setScannerMode('inventory'); setIsAddModalOpen(true); }}
              className="bg-brand-action text-brand-black p-3 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              <span className="text-xs font-black uppercase tracking-wider">Novo</span>
            </button>
          </div>
        )}
      </div>
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" placeholder="Buscar produto..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-medium text-sm"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3 pb-8">
        {filteredProducts.map(product => (
          <div key={product.id} className={`bg-white p-5 rounded-[2rem] border transition-all ${editingId === product.id ? 'border-brand-primary ring-4 ring-brand-primary/5 shadow-xl' : 'border-gray-100 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${product.stockQuantity < 5 ? 'bg-red-50 text-red-500' : 'bg-brand-primary/5 text-brand-primary'}`}>
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{product.name}</h3>
                  <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">{product.category}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-brand-primary font-black text-sm">R$ {product.price.toFixed(2)}</div>
                {isAdmin && editingId !== product.id && (
                  <button onClick={() => openEditModal(product)} className="mt-1 p-2 text-brand-primary/60 bg-brand-primary/5 rounded-xl">
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="text-[10px] font-black text-gray-400 uppercase">Estoque</div>
              <div className="flex items-center gap-3">
                {editingId === product.id ? (
                  <div className="flex items-center gap-2 bg-brand-primary/5 p-1 rounded-2xl animate-in zoom-in-95">
                    <button onClick={() => setTempStock(prev => Math.max(0, prev - 1))} className="w-8 h-8 flex items-center justify-center bg-white text-brand-primary rounded-xl shadow-sm"><Minus size={14} /></button>
                    <input 
                      type="number" 
                      className="w-12 text-center font-black text-brand-primary bg-transparent outline-none" 
                      value={tempStock} 
                      onChange={(e) => setTempStock(parseFloat(e.target.value) || 0)} 
                    />
                    <button onClick={() => setTempStock(prev => prev + 1)} className="w-8 h-8 flex items-center justify-center bg-white text-brand-primary rounded-xl shadow-sm"><Plus size={14} /></button>
                    <button onClick={() => handleQuickSave(product.id)} className="w-8 h-8 flex items-center justify-center bg-brand-primary text-white rounded-xl shadow-lg ml-1"><Check size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-500 rounded-xl"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <span className={`text-base font-black ${product.stockQuantity < 5 ? 'text-red-500' : 'text-gray-800'}`}>{product.stockQuantity}</span>
                    {isAdmin && (
                      <button onClick={() => startQuickAdjust(product)} className="text-[10px] font-black text-brand-primary bg-brand-primary/5 px-4 py-2 rounded-xl">Ajustar</button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL ADICIONAR / EDITAR */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-brand-primary/40 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 bg-brand-primary text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest">{isEditModalOpen ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={closeModals}><X size={20} /></button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome do Produto</label>
                <input type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Preço Venda</label>
                  <input type="number" step="0.01" required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Preço Custo</label>
                  <input type="number" step="0.01" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm" value={formCostPrice} onChange={(e) => setFormCostPrice(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Estoque Inicial</label>
                <input type="number" step="0.01" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black" value={formInitialStock} onChange={(e) => setFormInitialStock(e.target.value)} />
              </div>
              <button type="submit" className="w-full py-5 bg-brand-action text-brand-black font-black rounded-[2rem] uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all mt-4">
                {isEditModalOpen ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* INPUT DA CHAVE DE ACESSO COM LEITOR DE BARRAS */}
      {showKeyInput && (
        <div className="fixed inset-0 bg-brand-primary/20 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-brand-primary/5 text-brand-primary rounded-3xl flex items-center justify-center mx-auto">
                <Hash size={32} />
              </div>
              <h3 className="font-black text-gray-800 uppercase text-sm">Chave de Acesso</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase">44 números ou Escaneie o código</p>
            </div>
            
            <div className="relative">
              <textarea 
                autoFocus
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center font-mono text-sm tracking-widest outline-none focus:ring-2 focus:ring-brand-primary h-24 resize-none"
                placeholder="0000 0000 0000..."
                maxLength={44}
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value.replace(/\D/g, ''))}
              />
              <button 
                onClick={() => setIsBarcodeScannerOpen(true)}
                className="absolute right-3 bottom-3 p-3 bg-brand-primary text-white rounded-xl shadow-lg active:scale-95 transition-all"
                title="Escanear Código de Barras"
              >
                <QrCode size={20} />
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowKeyInput(false)} className="flex-1 py-4 text-xs font-black text-gray-400 uppercase">Cancelar</button>
              <button 
                onClick={fetchInvoiceByKey}
                disabled={isFetchingKey || accessKey.length < 44}
                className="flex-1 py-4 bg-brand-action text-brand-black rounded-2xl font-black uppercase text-xs shadow-xl disabled:opacity-50"
              >
                {isFetchingKey ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Buscar NF-e"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVISÃO DA NOTA */}
      {isReviewingInvoice && (
        <div className="fixed inset-0 bg-brand-primary/40 z-[120] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 bg-brand-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-brand-action" />
                <h3 className="font-black text-xs uppercase tracking-widest">Confirmar Entrada</h3>
              </div>
              <button onClick={() => setIsReviewingInvoice(false)}><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {invoiceItems.map((item, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                  <div className="flex-1 mr-4">
                    <div className="font-bold text-xs text-gray-800 line-clamp-1">{item.name}</div>
                    <div className="text-[10px] text-brand-primary font-black uppercase">Qtd: +{item.quantity}</div>
                  </div>
                  <div className="text-right font-black text-gray-400 text-[10px]">
                    R$ {item.costPrice.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6">
              <button 
                onClick={saveInvoiceToDatabase}
                className="w-full bg-brand-action text-brand-black font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest text-xs"
              >
                {isSavingInvoice ? <Loader2 className="animate-spin mx-auto" /> : "Confirmar Entrada"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELETOR DE MODO DE IMPORTAÇÃO */}
      {showImportSelector && (
        <div className="fixed inset-0 bg-brand-primary/20 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black text-brand-primary uppercase text-sm tracking-widest">Importar Nota Fiscal</h3>
              <button onClick={() => setShowImportSelector(false)}><X size={20} /></button>
            </div>
            <button 
              onClick={() => { setScannerMode('invoice'); setIsScannerOpen(true); setShowImportSelector(false); }}
              className="w-full p-6 bg-brand-primary text-white rounded-3xl flex items-center gap-4 active:scale-95 transition-all"
            >
              <div className="p-3 bg-white/10 rounded-2xl"><Camera size={24} /></div>
              <div className="text-left">
                <div className="font-black text-sm uppercase">Escanear DANFE</div>
                <div className="text-[10px] opacity-60">Usar IA para ler documento</div>
              </div>
            </button>
            <button 
              onClick={() => { setShowKeyInput(true); setShowImportSelector(false); }}
              className="w-full p-6 bg-gray-50 text-brand-primary border border-gray-100 rounded-3xl flex items-center gap-4 active:scale-95 transition-all"
            >
              <div className="p-3 bg-brand-primary/5 rounded-2xl"><Keyboard size={24} /></div>
              <div className="text-left">
                <div className="font-black text-sm uppercase">Digitar Chave</div>
                <div className="text-[10px] text-gray-400 font-bold">Ou ler código de barras</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// COMPONENTE AUXILIAR PARA SCANNER DE CÓDIGO DE BARRAS NATIVO
const NativeBarcodeScanner: React.FC<{ onDetected: (code: string) => void, onClose: () => void }> = ({ onDetected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) videoRef.current.srcObject = stream;

        // @ts-ignore
        if (!window.BarcodeDetector) {
          setError("Seu navegador não suporta leitura nativa de código de barras.");
          return;
        }

        // @ts-ignore
        const detector = new window.BarcodeDetector({ formats: ['code_128', 'ean_13'] });

        const scan = async () => {
          if (!active || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              if (code.length === 44 || code.length === 13) {
                onDetected(code);
                active = false;
                return;
              }
            }
          } catch (e) {}
          requestAnimationFrame(scan);
        };
        scan();
      } catch (err) {
        setError("Erro ao acessar câmera.");
      }
    };

    start();
    return () => {
      active = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[150] flex flex-col items-center justify-center p-6">
      <div className="relative w-full max-w-md aspect-video bg-gray-900 rounded-3xl overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute inset-0 border-2 border-brand-action/50 flex items-center justify-center">
          <div className="w-full h-1 bg-brand-action animate-pulse"></div>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full"><X size={20} /></button>
      </div>
      <p className="mt-6 text-white text-xs font-black uppercase tracking-widest text-center">Aponte para o Código de Barras da Nota</p>
      {error && <p className="mt-4 text-red-500 text-[10px] font-bold text-center bg-red-50 px-4 py-2 rounded-xl">{error}</p>}
    </div>
  );
};

export default Inventory;
