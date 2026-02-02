
import React, { useState, useRef } from 'react';
import { Product, User as UserType } from '../types';
import { db } from '../db';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Search, Plus, Minus, Check, Package, X, Pencil, FileText, 
  CheckCircle2, Loader2, Upload, ArrowRightLeft, TrendingUp, 
  AlertCircle, Info, Trash2, Camera, Percent, ToggleLeft, ToggleRight
} from 'lucide-react';

// Configuração do Worker do PDF.js para ambiente web
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

interface InventoryProps {
  products: Product[];
  onUpdate: () => void;
  currentUser: UserType | null;
}

interface ExtractedItem {
  id_temp: string;
  name: string;
  quantity: number;
  costPrice: number;
  category: string;
  matchId?: string | number;
  matchType: 'new' | 'exact' | 'similar';
}

const Inventory: React.FC<InventoryProps> = ({ products, onUpdate, currentUser }) => {
  // Estado básico
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<Product['id'] | null>(null);
  const [tempStock, setTempStock] = useState<number>(0);
  
  // Modais e UI
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showImportSelector, setShowImportSelector] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados do Formulário Manual
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formInitialStock, setFormInitialStock] = useState('');
  const [formAllowDiscount, setFormAllowDiscount] = useState(true);
  const [formMaxDiscount, setFormMaxDiscount] = useState('10');

  // Importação e Review
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [globalProfitMargin, setGlobalProfitMargin] = useState<number>(35);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser?.role === 'admin';

  // --- LÓGICA DE EXTRAÇÃO LOCAL ---

  const calculateSimilarity = (s1: string, s2: string) => {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    const editDistance = (a: string, b: string) => {
      const costs = [];
      for (let i = 0; i <= a.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= b.length; j++) {
          if (i === 0) costs[j] = j;
          else if (j > 0) {
            let newValue = costs[j - 1];
            if (a.charAt(i - 1) !== b.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[b.length] = lastValue;
      }
      return costs[b.length];
    };
    return (longer.length - editDistance(longer.toLowerCase(), shorter.toLowerCase())) / longer.length;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFetching(true);
    setShowImportSelector(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
      }

      const currencyRegex = /\d{1,3}(?:\.\d{3})*,\d{2}/g;
      const lines = fullText.split('\n');
      const items: any[] = [];

      lines.forEach(line => {
        const matches = line.match(currencyRegex);
        if (line.length > 15 && matches && matches.length >= 1) {
          let description = line
            .replace(currencyRegex, '')
            .replace(/\d{8,}/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          if (description.length > 5) {
            items.push({
              name: description.toUpperCase(),
              quantity: 1,
              costPrice: parseFloat(matches[0].replace('.', '').replace(',', '.')),
              category: 'Importado'
            });
          }
        }
      });

      if (items.length === 0) {
        alert("Não foi possível identificar itens de forma automática.");
        setIsFetching(false);
        return;
      }

      const processed = items.map(item => {
        let matchType: 'new' | 'exact' | 'similar' = 'new';
        let matchId: string | number | undefined = undefined;

        const exact = products.find(p => p.name.toUpperCase() === item.name.toUpperCase());
        if (exact) {
          matchType = 'exact';
          matchId = exact.id;
        } else {
          const similar = products.find(p => calculateSimilarity(p.name, item.name) > 0.7);
          if (similar) {
            matchType = 'similar';
            matchId = similar.id;
          }
        }

        return {
          ...item,
          id_temp: Math.random().toString(36).substr(2, 9),
          matchType,
          matchId
        };
      });

      setExtractedItems(processed);
      setIsReviewing(true);
    } catch (err) {
      alert("Erro ao processar PDF: " + err);
    } finally {
      setIsFetching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- AÇÕES DE ESTOQUE ---

  const handleQuickSave = async (id: Product['id']) => {
    try {
      await db.updateProductStock(id, tempStock);
      setEditingId(null);
      onUpdate();
    } catch (err) {
      alert("Erro ao atualizar estoque.");
    }
  };

  const startQuickAdjust = (p: Product) => {
    if (!isAdmin) return;
    setEditingId(p.id);
    setTempStock(p.stockQuantity);
  };

  const handleConfirmImport = async () => {
    setIsSaving(true);
    try {
      for (const item of extractedItems) {
        const sellPrice = item.costPrice * (1 + globalProfitMargin / 100);
        
        if (item.matchId) {
          const existing = products.find(p => p.id === item.matchId);
          if (existing) {
            await db.updateProduct(item.matchId, {
              stockQuantity: Number((existing.stockQuantity + item.quantity).toFixed(2)),
              costPrice: item.costPrice,
              price: sellPrice
            });
          }
        } else {
          await db.addProduct({
            name: item.name,
            category: item.category,
            price: sellPrice,
            costPrice: item.costPrice,
            stockQuantity: item.quantity,
            allowDiscount: true,
            maxDiscountPercent: 10
          });
        }
      }
      setIsReviewing(false);
      onUpdate();
    } catch (err) {
      alert("Erro ao salvar produtos.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- LÓGICA DO FORMULÁRIO MANUAL ---

  const openAddModal = () => {
    setProductToEdit(null);
    setFormName('');
    setFormCategory('');
    setFormPrice('');
    setFormCostPrice('');
    setFormInitialStock('');
    setFormAllowDiscount(true);
    setFormMaxDiscount('10');
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    if (!isAdmin) return;
    setProductToEdit(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormPrice(p.price.toString());
    setFormCostPrice(p.costPrice?.toString() || '');
    setFormInitialStock(p.stockQuantity.toString());
    setFormAllowDiscount(p.allowDiscount ?? true);
    setFormMaxDiscount((p.maxDiscountPercent ?? 10).toString());
    setIsEditModalOpen(true);
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
      allowDiscount: formAllowDiscount,
      maxDiscountPercent: parseFloat(formMaxDiscount) || 0
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

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setShowImportSelector(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4 bg-brand-bg min-h-full">
      {/* LOADING OVERLAY */}
      {isFetching && (
        <div className="fixed inset-0 bg-brand-primary/60 z-[200] flex flex-col items-center justify-center p-8 backdrop-blur-md">
          <div className="w-20 h-20 bg-brand-action rounded-[2.5rem] flex items-center justify-center shadow-2xl animate-bounce mb-6">
            <Loader2 className="animate-spin text-brand-black" size={40} />
          </div>
          <h3 className="text-white font-black text-xl uppercase tracking-tighter text-center">Processando PDF...</h3>
          <p className="text-blue-100/60 text-[10px] font-bold uppercase mt-2">Extraindo descrição e preços localmente</p>
        </div>
      )}

      {/* REVISÃO DA IMPORTAÇÃO */}
      {isReviewing && (
        <div className="fixed inset-0 bg-brand-bg z-[150] flex flex-col animate-in slide-in-from-bottom-full duration-500">
          <header className="p-6 bg-brand-primary text-white flex justify-between items-center sticky top-0 shadow-xl">
            <div>
              <h2 className="font-black text-lg uppercase tracking-widest">Revisão de Entrada</h2>
              <p className="text-[10px] opacity-60 font-bold uppercase">{extractedItems.length} Itens Extraídos</p>
            </div>
            <button onClick={() => setIsReviewing(false)} className="p-2 bg-white/10 rounded-full"><X size={24} /></button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            <div className="bg-white p-6 rounded-[2.5rem] border-2 border-brand-action shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <TrendingUp className="text-brand-primary" size={24} />
                <div>
                  <div className="text-[10px] text-gray-400 font-black uppercase">Margem de Lucro</div>
                  <div className="text-xl font-black text-gray-800">Precificação</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl">
                <input 
                  type="number" 
                  className="w-16 bg-transparent text-center font-black text-brand-primary outline-none text-xl"
                  value={globalProfitMargin}
                  onChange={(e) => setGlobalProfitMargin(parseFloat(e.target.value) || 0)}
                />
                <span className="font-black text-gray-400">%</span>
              </div>
            </div>

            <div className="space-y-3">
              {extractedItems.map((item) => {
                const existing = products.find(p => p.id === item.matchId);
                const sellPrice = item.costPrice * (1 + globalProfitMargin / 100);

                return (
                  <div key={item.id_temp} className={`p-5 rounded-[2.5rem] bg-white border-2 shadow-sm ${item.matchType === 'similar' ? 'border-amber-400' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 text-sm leading-tight uppercase">{item.name}</div>
                        <div className={`mt-2 inline-block px-2 py-1 rounded-full text-[8px] font-black uppercase ${
                          item.matchType === 'exact' ? 'bg-green-100 text-green-700' : 
                          item.matchType === 'similar' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.matchType === 'exact' ? 'Vínculo Exato' : item.matchType === 'similar' ? 'Vínculo Sugerido' : 'Novo Produto'}
                        </div>
                      </div>
                    </div>

                    {existing && (
                      <div className="bg-gray-50 p-3 rounded-2xl mb-4 border border-gray-100 flex items-center gap-2">
                        <ArrowRightLeft className="text-gray-400" size={14} />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Sistema: {existing.name}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 p-3 rounded-2xl">
                        <div className="text-[8px] font-black text-gray-400 uppercase mb-1">Qtd.</div>
                        <input 
                          type="number" 
                          className="w-full bg-transparent font-black text-gray-800 text-xs outline-none" 
                          value={item.quantity} 
                          onChange={(e) => setExtractedItems(prev => prev.map(i => i.id_temp === item.id_temp ? { ...i, quantity: parseFloat(e.target.value) || 0 } : i))}
                        />
                      </div>
                      <div className="bg-gray-50 p-3 rounded-2xl">
                        <div className="text-[8px] font-black text-gray-400 uppercase mb-1">Custo</div>
                        <div className="text-xs font-black text-gray-800">R${item.costPrice.toFixed(2)}</div>
                      </div>
                      <div className="bg-brand-primary/5 p-3 rounded-2xl">
                        <div className="text-[8px] font-black text-brand-primary uppercase mb-1">Venda</div>
                        <div className="text-xs font-black text-brand-primary">R${sellPrice.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button 
                        onClick={() => setExtractedItems(prev => prev.filter(i => i.id_temp !== item.id_temp))}
                        className="flex-1 py-3 text-[9px] font-black text-red-400 uppercase bg-red-50 rounded-2xl"
                      >
                        <Trash2 size={12} className="inline mr-1" /> Remover
                      </button>
                      {item.matchType === 'similar' && (
                        <button 
                          onClick={() => setExtractedItems(prev => prev.map(i => i.id_temp === item.id_temp ? { ...i, matchType: 'new', matchId: undefined } : i))}
                          className="flex-1 py-3 text-[9px] font-black text-blue-400 uppercase bg-blue-50 rounded-2xl"
                        >
                          <Plus size={12} className="inline mr-1" /> Criar Novo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <footer className="p-6 bg-white border-t border-gray-100 shadow-xl">
            <button 
              onClick={handleConfirmImport}
              disabled={isSaving || extractedItems.length === 0}
              className="w-full bg-brand-action text-brand-black font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest text-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> Atualizar Estoque</>}
            </button>
          </footer>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-brand-primary tracking-tight">Estoque</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <button 
              onClick={() => setShowImportSelector(true)}
              className="bg-white text-brand-primary p-3 rounded-2xl border border-brand-primary/10 shadow-sm active:scale-95 transition-all"
            >
              <Upload size={20} />
            </button>
          )}
          <button 
            onClick={openAddModal}
            className="bg-brand-action text-brand-black p-3 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            <span className="text-xs font-black uppercase tracking-wider pr-1">Novo</span>
          </button>
        </div>
      </div>
      
      {/* BUSCA */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" placeholder="Buscar produto..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-medium text-sm"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LISTAGEM */}
      <div className="space-y-3 pb-8">
        {filteredProducts.map(product => (
          <div key={product.id} className={`bg-white p-5 rounded-[2rem] border transition-all ${editingId === product.id ? 'border-brand-primary ring-4 ring-brand-primary/5 shadow-xl' : 'border-gray-100 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${product.stockQuantity < 5 ? 'bg-red-50 text-red-500' : 'bg-brand-primary/5 text-brand-primary'}`}>
                  <Package size={20} />
                </div>
                <div onClick={() => openEditModal(product)} className="cursor-pointer">
                  <h3 className="font-bold text-gray-800 text-sm uppercase">{product.name}</h3>
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
              <div className="text-[10px] font-black text-gray-400 uppercase">Estoque Atual</div>
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

      {/* IMPORT SELECTOR */}
      {showImportSelector && (
        <div className="fixed inset-0 bg-brand-primary/20 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black text-brand-primary uppercase text-sm tracking-widest">Importar Nota</h3>
              <button onClick={() => setShowImportSelector(false)}><X size={20} /></button>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 bg-brand-primary text-white rounded-3xl flex items-center gap-4 shadow-lg active:scale-95 transition-all"
            >
              <div className="p-3 bg-white/10 rounded-2xl"><FileText size={24} /></div>
              <div className="text-left">
                <div className="font-black text-sm uppercase">PDF Local</div>
                <div className="text-[10px] opacity-60">Extração de Descrição e Preço</div>
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 text-blue-700">
              <Info size={18} className="shrink-0" />
              <p className="text-[9px] font-medium leading-tight uppercase">
                A leitura local funciona em PDFs com camada de texto. O sistema tentará identificar descrições e o valor unitário de custo automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR / EDITAR (MANUAL) */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-brand-primary/40 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 bg-brand-primary text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest">{isEditModalOpen ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={closeModals}><X size={20} /></button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome do Produto</label>
                <input 
                  type="text" 
                  required 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Categoria</label>
                <input 
                  type="text" 
                  placeholder="Ex: Alvenaria, Elétrica"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary" 
                  value={formCategory} 
                  onChange={(e) => setFormCategory(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Preço Venda</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary" 
                      value={formPrice} 
                      onChange={(e) => setFormPrice(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Preço Custo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary" 
                      value={formCostPrice} 
                      onChange={(e) => setFormCostPrice(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Estoque</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-brand-primary" 
                    value={formInitialStock} 
                    onChange={(e) => setFormInitialStock(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Desc. Máx (%)</label>
                  <div className="relative">
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                      type="number" 
                      className="w-full pr-8 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary" 
                      value={formMaxDiscount} 
                      onChange={(e) => setFormMaxDiscount(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-800 uppercase">Permitir Desconto</span>
                  <span className="text-[8px] text-gray-400 font-bold uppercase">Habilita negociação no PDV</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormAllowDiscount(!formAllowDiscount)}
                  className={`p-1 rounded-full transition-colors ${formAllowDiscount ? 'text-brand-primary' : 'text-gray-300'}`}
                >
                  {formAllowDiscount ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>

              <button 
                type="submit" 
                className="w-full py-5 bg-brand-action text-brand-black font-black rounded-[2rem] uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all mt-4"
              >
                {isEditModalOpen ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
