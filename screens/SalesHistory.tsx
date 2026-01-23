
import React, { useState } from 'react';
import { Sale, ReceiptType } from '../types';
import { db } from '../db';
import Receipt from '../components/Receipt';
import { X, Calendar, User, ChevronRight, Filter, Search, RotateCcw, TrendingUp, Printer, CreditCard } from 'lucide-react';

interface SalesHistoryProps {
  sales: Sale[];
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales }) => {
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [initialType, setInitialType] = useState<ReceiptType>('fiscal');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  const clearFilters = () => {
    setFilterCustomer('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
  };

  const handleOpenReceipt = (saleId: string, type: ReceiptType = 'fiscal') => {
    setInitialType(type);
    setSelectedSaleId(saleId);
  };

  const filteredSales = sales.filter(sale => {
    const matchesCustomer = sale.customerName.toLowerCase().includes(filterCustomer.toLowerCase());
    
    const saleDate = new Date(sale.date);
    const matchesStartDate = filterStartDate ? saleDate >= new Date(filterStartDate) : true;
    const matchesEndDate = filterEndDate ? saleDate <= new Date(filterEndDate + 'T23:59:59') : true;
    
    const matchesMinPrice = filterMinPrice ? sale.total >= parseFloat(filterMinPrice) : true;
    const matchesMaxPrice = filterMaxPrice ? sale.total <= parseFloat(filterMaxPrice) : true;
    
    return matchesCustomer && matchesStartDate && matchesEndDate && matchesMinPrice && matchesMaxPrice;
  });

  const filteredTotal = filteredSales.reduce((sum, s) => sum + s.total, 0);

  const activeFiltersCount = [
    filterCustomer, 
    filterStartDate, 
    filterEndDate, 
    filterMinPrice, 
    filterMaxPrice
  ].filter(Boolean).length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800">Histórico</h2>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-2xl border transition-all flex items-center gap-2 ${
            showFilters || activeFiltersCount > 0 
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
            : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          <Filter size={20} />
          {activeFiltersCount > 0 && (
            <span className="bg-white text-indigo-600 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Summary & Total */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-3xl flex justify-between items-center">
        <div>
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Soma Filtrada</div>
          <div className="text-2xl font-black text-indigo-700">R$ {filteredTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white p-2 rounded-2xl shadow-sm text-indigo-600">
          <TrendingUp size={24} />
        </div>
      </div>

      {/* Filter Pane */}
      {showFilters && (
        <div className="bg-white p-5 rounded-[2rem] border border-indigo-100 shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Cliente</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Buscar por nome..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">De</label>
                <input 
                  type="date"
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Até</label>
                <input 
                  type="date"
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Valor Mín</label>
                <input 
                  type="number"
                  placeholder="0,00"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none"
                  value={filterMinPrice}
                  onChange={(e) => setFilterMinPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Valor Máx</label>
                <input 
                  type="number"
                  placeholder="9999,00"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none"
                  value={filterMaxPrice}
                  onChange={(e) => setFilterMaxPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button 
              onClick={clearFilters}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-gray-400 bg-gray-100 rounded-2xl active:scale-95 transition-all"
            >
              <RotateCcw size={16} /> Limpar
            </button>
            <button 
              onClick={() => setShowFilters(false)}
              className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}
      
      {/* Sales List */}
      <div className="space-y-3 pb-8">
        {filteredSales.map(sale => (
          <div 
            key={sale.id}
            className="w-full bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between text-left group transition-all"
          >
            <div className="flex items-center gap-4 flex-1" onClick={() => handleOpenReceipt(sale.id, 'fiscal')}>
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center text-indigo-600">
                <span className="text-[9px] font-black uppercase">
                  {new Date(sale.date).toLocaleString('pt-BR', { month: 'short' })}
                </span>
                <span className="text-base font-black leading-none">
                  {new Date(sale.date).getDate()}
                </span>
              </div>
              <div>
                <div className="font-bold text-gray-800 text-sm truncate w-32">{sale.customerName}</div>
                <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1 uppercase">
                   {new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-black text-gray-900 text-sm">R$ {sale.total.toFixed(2)}</div>
                <div className="text-[8px] text-gray-300 font-black uppercase">#{sale.id.split('-').pop()}</div>
              </div>
              
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                <button 
                  onClick={() => handleOpenReceipt(sale.id, 'fiscal')}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                  title="Cupom Venda"
                >
                  <Printer size={18} />
                </button>
                <button 
                  onClick={() => handleOpenReceipt(sale.id, 'payment')}
                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-white rounded-lg transition-all"
                  title="Cupom Pagamento"
                >
                  <CreditCard size={18} />
                </button>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>
        ))}

        {filteredSales.length === 0 && (
          <div className="text-center py-20 text-gray-400 italic flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Search size={32} className="opacity-30" />
            </div>
            <p className="text-sm font-medium">Nada encontrado com esses critérios.</p>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="text-indigo-600 font-black text-xs bg-indigo-50 px-4 py-2 rounded-full uppercase">
                Resetar Filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal Overlay */}
      {selectedSaleId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-5 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest">Detalhes da Venda</h3>
              <button onClick={() => setSelectedSaleId(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto no-scrollbar bg-gray-50/50">
              <Receipt saleId={selectedSaleId} initialType={initialType} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
