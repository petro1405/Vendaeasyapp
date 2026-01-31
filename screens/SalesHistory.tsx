
import React, { useState } from 'react';
import { Sale, ReceiptType, ShopInfo } from '../types';
import { db } from '../db';
import Receipt from '../components/Receipt';
import { 
  X, 
  Calendar, 
  User, 
  ChevronRight, 
  Filter, 
  Search, 
  RotateCcw, 
  TrendingUp, 
  Printer, 
  CreditCard,
  FileDown,
  ChevronDown
} from 'lucide-react';

interface SalesHistoryProps {
  sales: Sale[];
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales }) => {
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [initialType, setInitialType] = useState<ReceiptType>('fiscal');
  const [showFilters, setShowFilters] = useState(false);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  
  // Filter states
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  React.useEffect(() => {
    db.getShopInfo().then(setShopInfo);
  }, []);

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
  const activeFiltersCount = [filterCustomer, filterStartDate, filterEndDate, filterMinPrice, filterMaxPrice].filter(Boolean).length;

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800">Histórico</h2>
        <div className="flex gap-2">
          {filteredSales.length > 0 && (
            <button 
              onClick={handlePrintReport}
              className="p-3 bg-white text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm active:scale-95 transition-all flex items-center gap-2"
            >
              <FileDown size={20} />
            </button>
          )}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-2xl border transition-all flex items-center gap-2 ${
              showFilters || activeFiltersCount > 0 
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
              : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            <Filter size={20} />
            {activeFiltersCount > 0 && (
              <span className="bg-white text-indigo-600 w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO DO RELATÓRIO (PDF/A4) */}
      <div id="printable-area" className="hidden print:block p-8 bg-white text-black font-sans min-h-screen">
        <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">{shopInfo?.name}</h1>
            <p className="text-sm font-bold opacity-70">CNPJ: {shopInfo?.cnpj}</p>
            <p className="text-sm">{shopInfo?.address}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black uppercase">Relatório de Vendas</h2>
            <p className="text-sm font-medium">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
            <p className="text-sm font-bold">Período: {filterStartDate || 'Início'} até {filterEndDate || 'Hoje'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="p-6 border-2 border-black rounded-2xl">
            <p className="text-xs font-black uppercase opacity-60">Total Bruto</p>
            <p className="text-3xl font-black">R$ {filteredTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-6 border-2 border-black rounded-2xl">
            <p className="text-xs font-black uppercase opacity-60">Qtd. Vendas</p>
            <p className="text-3xl font-black">{filteredSales.length}</p>
          </div>
          <div className="p-6 border-2 border-black rounded-2xl">
            <p className="text-xs font-black uppercase opacity-60">Ticket Médio</p>
            <p className="text-3xl font-black">R$ {(filteredSales.length ? filteredTotal / filteredSales.length : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-4 text-xs font-black uppercase">Data/Hora</th>
              <th className="py-4 text-xs font-black uppercase">Cliente</th>
              <th className="py-4 text-xs font-black uppercase">Vendedor</th>
              <th className="py-4 text-xs font-black uppercase">Pagamento</th>
              <th className="py-4 text-xs font-black uppercase text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale, idx) => (
              <tr key={sale.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-gray-50' : ''}`}>
                <td className="py-4 text-xs font-medium">{new Date(sale.date).toLocaleString('pt-BR')}</td>
                <td className="py-4 text-xs font-bold uppercase">{sale.customerName}</td>
                <td className="py-4 text-xs font-medium capitalize">{sale.sellerUsername}</td>
                <td className="py-4 text-xs font-medium uppercase">{sale.paymentMethod}</td>
                <td className="py-4 text-xs font-black text-right">R$ {sale.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-20 pt-10 border-t-2 border-dashed border-gray-300 text-center">
          <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Fim do Relatório • VendaEasy Gestor</p>
        </div>
      </div>

      {/* Resumo Dinâmico (UI) */}
      <div className="bg-indigo-600 p-5 rounded-[2.5rem] flex justify-between items-center text-white shadow-xl">
        <div className="space-y-1">
          <div className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em]">Total Selecionado</div>
          <div className="text-3xl font-black">R$ {filteredTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="text-[9px] font-bold uppercase opacity-80">{filteredSales.length} registros encontrados</div>
        </div>
        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
          <TrendingUp size={24} />
        </div>
      </div>

      {/* Filter Pane */}
      {showFilters && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-indigo-100 shadow-2xl space-y-4 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Cliente</label>
              <input 
                type="text"
                placeholder="Nome do cliente..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Início</label>
                <input type="date" className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Fim</label>
                <input type="date" className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={clearFilters} className="flex-1 py-3 text-xs font-black text-gray-400 bg-gray-50 rounded-2xl uppercase">Limpar</button>
            <button onClick={() => setShowFilters(false)} className="flex-2 py-3 text-xs font-black text-white bg-indigo-600 rounded-2xl shadow-lg uppercase">Ver Resultados</button>
          </div>
        </div>
      )}
      
      {/* Sales List */}
      <div className="space-y-3 pb-8">
        {filteredSales.map(sale => (
          <div 
            key={sale.id}
            className="w-full bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between text-left transition-all active:scale-[0.98]"
            onClick={() => handleOpenReceipt(sale.id, 'fiscal')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center text-indigo-600">
                <span className="text-[9px] font-black uppercase">{new Date(sale.date).toLocaleString('pt-BR', { month: 'short' })}</span>
                <span className="text-base font-black leading-none">{new Date(sale.date).getDate()}</span>
              </div>
              <div>
                <div className="font-black text-gray-800 text-sm truncate w-32">{sale.customerName}</div>
                <div className="text-[9px] text-gray-400 font-bold uppercase">{new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {sale.sellerUsername}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-black text-indigo-600 text-sm">R$ {sale.total.toFixed(2)}</div>
                <div className="text-[8px] text-gray-300 font-black uppercase">#{sale.id.split('-').pop()}</div>
              </div>
              <ChevronRight size={16} className="text-gray-200" />
            </div>
          </div>
        ))}

        {filteredSales.length === 0 && (
          <div className="text-center py-20 text-gray-400 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
              <Search size={32} className="opacity-20" />
            </div>
            <p className="text-sm font-black uppercase tracking-widest opacity-40">Nada por aqui.</p>
          </div>
        )}
      </div>

      {selectedSaleId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-5 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest">Documento de Venda</h3>
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
