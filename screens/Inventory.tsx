
import React, { useState } from 'react';
import { Product, User as UserType } from '../types';
import { db } from '../db';
import SmartScanner from '../components/SmartScanner';
import { Search, Plus, Minus, Check, Package, Layers, X, DollarSign, Percent, TrendingUp, Lock, Camera, Sparkles } from 'lucide-react';

interface InventoryProps {
  products: Product[];
  onUpdate: () => void;
  currentUser: UserType | null;
}

const Inventory: React.FC<InventoryProps> = ({ products, onUpdate, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempStock, setTempStock] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin';

  // Form state for new product
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newInitialStock, setNewInitialStock] = useState('');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (p: Product) => {
    if (!isAdmin) return;
    setEditingId(p.id);
    setTempStock(p.stockQuantity);
  };

  const handleSave = (id: number) => {
    db.updateProductStock(id, tempStock);
    setEditingId(null);
    onUpdate();
  };

  const handleScannerDetected = (data: { name: string; category?: string }) => {
    setNewName(data.name);
    if (data.category) setNewCategory(data.category);
    setIsAddModalOpen(true);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!newName || !newPrice || !newCategory || !newInitialStock) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    db.addProduct({
      name: newName,
      category: newCategory,
      price: parseFloat(newPrice),
      costPrice: newCostPrice ? parseFloat(newCostPrice) : undefined,
      stockQuantity: parseInt(newInitialStock)
    });

    // Reset and close
    setNewName('');
    setNewCategory('');
    setNewPrice('');
    setNewCostPrice('');
    setNewInitialStock('');
    setIsAddModalOpen(false);
    onUpdate();
  };

  // Calculate Margin and Profit
  const priceVal = parseFloat(newPrice) || 0;
  const costVal = parseFloat(newCostPrice) || 0;
  const profit = priceVal - costVal;
  const margin = priceVal > 0 ? (profit / priceVal) * 100 : 0;
  const markup = costVal > 0 ? (profit / costVal) * 100 : 0;

  return (
    <div className="p-4 space-y-4">
      {isScannerOpen && (
        <SmartScanner 
          mode="inventory" 
          onClose={() => setIsScannerOpen(false)} 
          onDetected={handleScannerDetected} 
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800">Estoque</h2>
        {isAdmin ? (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="bg-white text-indigo-600 p-3 rounded-2xl border border-indigo-100 shadow-sm active:scale-95 transition-all"
            >
              <Camera size={20} />
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              <span className="text-xs font-black uppercase tracking-wider pr-1">Novo Item</span>
            </button>
          </div>
        ) : (
          <div className="bg-gray-100 text-gray-400 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Lock size={14} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Somente Consulta</span>
          </div>
        )}
      </div>
      
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text"
          placeholder="Buscar produto ou categoria..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Product List */}
      <div className="space-y-3 pb-8">
        {filteredProducts.map(product => (
          <div key={product.id} className={`bg-white p-5 rounded-[2rem] border transition-all ${editingId === product.id ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-gray-100 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${product.stockQuantity < 5 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Layers size={10} className="text-gray-400" />
                    <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">
                      {product.category}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-indigo-600 font-black text-sm">
                  R$ {product.price.toFixed(2)}
                </div>
                {isAdmin && product.costPrice && (
                  <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                    Custo: R$ {product.costPrice.toFixed(2)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="text-[10px] font-black text-gray-400 uppercase">Quantidade</div>
              
              {editingId === product.id ? (
                <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-2xl">
                  <button 
                    onClick={() => setTempStock(Math.max(0, tempStock - 1))}
                    className="w-8 h-8 flex items-center justify-center bg-white text-gray-600 rounded-xl shadow-sm active:scale-90 transition-all"
                  >
                    <Minus size={14} />
                  </button>
                  <input 
                    type="number" 
                    className="w-12 text-center font-black text-lg bg-transparent text-indigo-700 outline-none"
                    value={tempStock}
                    onChange={(e) => setTempStock(parseInt(e.target.value) || 0)}
                  />
                  <button 
                    onClick={() => setTempStock(tempStock + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white text-gray-600 rounded-xl shadow-sm active:scale-90 transition-all"
                  >
                    <Plus size={14} />
                  </button>
                  <button 
                    onClick={() => handleSave(product.id)}
                    className="ml-2 w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl shadow-lg active:scale-90 transition-all"
                  >
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`text-base font-black ${product.stockQuantity < 5 ? 'text-red-500' : 'text-gray-800'}`}>
                    {product.stockQuantity} un
                  </span>
                  {isAdmin && (
                    <button 
                      onClick={() => startEdit(product)}
                      className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 active:scale-95 transition-all uppercase"
                    >
                      Ajustar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="text-center py-20 text-gray-400 italic flex flex-col items-center gap-4">
            <Package size={48} className="opacity-10" />
            <p className="text-sm font-medium">Nenhum produto em estoque.</p>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {isAdmin && isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col my-auto">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Plus size={20} />
                </div>
                <h3 className="font-black text-sm uppercase tracking-widest">Novo Produto</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome do Produto</label>
                  <button 
                    type="button"
                    onClick={() => { setIsAddModalOpen(false); setIsScannerOpen(true); }}
                    className="flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-widest"
                  >
                    <Sparkles size={10} /> Scanner IA
                  </button>
                </div>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Cimento CP-III"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Categoria</label>
                <select 
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="Basicos">Básicos</option>
                  <option value="Alvenaria">Alvenaria</option>
                  <option value="Hidraulica">Hidráulica</option>
                  <option value="Eletrica">Elétrica</option>
                  <option value="Ferragens">Ferragens</option>
                  <option value="Acabamento">Acabamento</option>
                  <option value="Ferramentas">Ferramentas</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Preço Custo (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Preço Venda (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Estoque Inicial</label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input 
                    type="number"
                    required
                    placeholder="Ex: 50"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newInitialStock}
                    onChange={(e) => setNewInitialStock(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-4 text-sm font-bold text-gray-400 bg-gray-100 rounded-3xl active:scale-95 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 text-sm font-black text-white bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 active:scale-95 transition-all uppercase tracking-widest"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
