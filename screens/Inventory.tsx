
import React, { useState } from 'react';
import { Product, User as UserType } from '../types';
import { db } from '../db';
import SmartScanner from '../components/SmartScanner';
import { Search, Plus, Minus, Check, Package, Layers, X, Lock, Camera, Sparkles, Pencil, Percent, ShieldCheck, ShieldAlert } from 'lucide-react';

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
  
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formInitialStock, setFormInitialStock] = useState('');
  const [formAllowDiscount, setFormAllowDiscount] = useState(true);
  const [formMaxDiscountPercent, setFormMaxDiscountPercent] = useState('10');

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

  const openEditModal = (p: Product) => {
    if (!isAdmin) return;
    setProductToEdit(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormPrice(p.price.toString());
    setFormCostPrice(p.costPrice?.toString() || '');
    setFormInitialStock(p.stockQuantity.toString());
    setFormAllowDiscount(p.allowDiscount !== false);
    setFormMaxDiscountPercent(p.maxDiscountPercent?.toString() || '10');
    setIsEditModalOpen(true);
  };

  const handleScannerDetected = (data: { name: string; category?: string }) => {
    setFormName(data.name);
    if (data.category) setFormCategory(data.category);
    setIsAddModalOpen(true);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    await db.addProduct({
      name: formName,
      category: formCategory,
      price: parseFloat(formPrice),
      costPrice: formCostPrice ? parseFloat(formCostPrice) : undefined,
      stockQuantity: parseFloat(formInitialStock),
      allowDiscount: formAllowDiscount,
      maxDiscountPercent: formAllowDiscount ? parseFloat(formMaxDiscountPercent) : 0
    });
    closeModals();
    onUpdate();
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !productToEdit) return;
    await db.updateProduct(productToEdit.id, {
      name: formName,
      category: formCategory,
      price: parseFloat(formPrice),
      costPrice: formCostPrice ? parseFloat(formCostPrice) : undefined,
      stockQuantity: parseFloat(formInitialStock),
      allowDiscount: formAllowDiscount,
      maxDiscountPercent: formAllowDiscount ? parseFloat(formMaxDiscountPercent) : 0
    });
    closeModals();
    onUpdate();
  };

  const closeModals = () => {
    setFormName('');
    setFormCategory('');
    setFormPrice('');
    setFormCostPrice('');
    setFormInitialStock('');
    setFormAllowDiscount(true);
    setFormMaxDiscountPercent('10');
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setProductToEdit(null);
  };

  return (
    <div className="p-4 space-y-4 bg-brand-bg">
      {isScannerOpen && (
        <SmartScanner 
          mode="inventory" 
          onClose={() => setIsScannerOpen(false)} 
          onDetected={handleScannerDetected} 
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-brand-primary tracking-tight">Estoque</h2>
        {isAdmin ? (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="bg-white text-brand-primary p-3 rounded-2xl border border-brand-primary/10 shadow-sm active:scale-95 transition-all"
            >
              <Camera size={20} />
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-brand-action text-brand-black p-3 rounded-2xl shadow-xl shadow-brand-action/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              <span className="text-xs font-black uppercase tracking-wider pr-1">Novo Item</span>
            </button>
          </div>
        ) : (
          <div className="bg-white text-gray-400 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-gray-100">
            <Lock size={14} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Consulta</span>
          </div>
        )}
      </div>
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text"
          placeholder="Buscar produto ou categoria..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all font-medium text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3 pb-8">
        {filteredProducts.map(product => (
          <div key={product.id} className={`bg-white p-5 rounded-[2rem] border transition-all ${editingId === product.id ? 'border-brand-primary ring-4 ring-brand-primary/5' : 'border-gray-100 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${product.stockQuantity < 5 ? 'bg-red-50 text-red-500' : 'bg-brand-primary/5 text-brand-primary'}`}>
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">
                      {product.category}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-brand-primary font-black text-sm">R$ {product.price.toFixed(2)}</div>
                {isAdmin && (
                  <button onClick={() => openEditModal(product)} className="mt-1 p-2 text-brand-primary/60 hover:text-brand-primary bg-brand-primary/5 rounded-xl active:scale-90 transition-all">
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="text-[10px] font-black text-gray-400 uppercase">Estoque Disponível</div>
              <div className="flex items-center gap-3">
                <span className={`text-base font-black ${product.stockQuantity < 5 ? 'text-red-500' : 'text-gray-800'}`}>
                  {product.stockQuantity.toLocaleString('pt-BR')}
                </span>
                {isAdmin && (
                  <button onClick={() => startQuickAdjust(product)} className="text-[10px] font-black text-brand-primary bg-brand-primary/5 px-4 py-2 rounded-xl active:scale-95 transition-all uppercase">Ajustar</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-brand-primary/20 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 bg-brand-primary text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest">{isEditModalOpen ? 'Editar Item' : 'Novo Item'}</h3>
              <button onClick={closeModals} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={isEditModalOpen ? handleUpdateProduct : handleAddProduct} className="p-6 space-y-4">
              <input type="text" placeholder="Nome do Produto" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              <input type="number" step="0.01" placeholder="Preço" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} required />
              <input type="number" step="0.01" placeholder="Estoque Inicial" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary" value={formInitialStock} onChange={(e) => setFormInitialStock(e.target.value)} required />
              
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={closeModals} className="flex-1 py-4 text-xs font-black text-gray-400 bg-gray-100 rounded-2xl uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="flex-1 py-4 text-xs font-black text-brand-black bg-brand-action rounded-2xl uppercase tracking-widest shadow-lg shadow-brand-action/20">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
