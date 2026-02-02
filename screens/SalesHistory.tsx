
import React, { useState } from 'react';
import { Sale, ReceiptType, ShopInfo } from '../types';
import { db } from '../db';
import Receipt from '../components/Receipt';
import { 
  X, 
  Calendar, 
  User as UserIcon, 
  ChevronRight, 
  Filter, 
  Search, 
  RotateCcw, 
  TrendingUp, 
  Printer, 
  CreditCard,
  FileDown,
  ChevronDown,
  Trash2,
  Lock,
  AlertTriangle,
  Loader2,
  UserCheck,
  ShieldAlert
} from 'lucide-react';

interface SalesHistoryProps {
  sales: Sale[];
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales }) => {
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [initialType, setInitialType] = useState<ReceiptType>('fiscal');
  const [showFilters, setShowFilters] = useState(false);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  
  // Deletion States
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const handleDeleteConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    
    if (!adminUsername || !adminPassword) {
      setDeleteError('Informe o usuário e senha do administrador.');
      return;
    }

    if (!saleToDelete) return;

    setIsDeleting(true);
    try {
      const authResult = await db.authenticateAdmin(adminUsername, adminPassword);
      
      if (authResult.success) {
        await db.deleteSale(saleToDelete);
        setSaleToDelete(null);
        setSelectedSaleId(null); // Fecha o detalhe se estiver aberto
        setAdminUsername('');
        setAdminPassword('');
      } else {
        setDeleteError(authResult.message);
      }
    } catch (err) {
      setDeleteError('Erro na autenticação. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
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
              className="p-3 bg-white text-brand-primary rounded-2xl border border-brand-primary/10 shadow-sm active:scale-95 transition-all flex items-center gap-2"
            >
              <FileDown size={20} />
            </button>
          )}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-2xl border transition-all flex items-center gap-2 ${
              showFilters || activeFiltersCount > 0 
              ? 'bg-brand-primary text-white border-brand-primary shadow-lg' 
              : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            <Filter size={20} />
            {activeFiltersCount > 0 && (
              <span className="bg-brand-action text-brand-black w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Resumo Dinâmico (UI) */}
      <div className="bg-brand-primary p-5 rounded-[2.5rem] flex justify-between items-center text-white shadow-xl">
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
        <div className="bg-white p-6 rounded-[2.5rem] border border-brand-primary/10 shadow-2xl space-y-4 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Cliente</label>
              <input 
                type="text"
                placeholder="Nome do cliente..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-brand-primary outline-none"
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
            <button onClick={() => setShowFilters(false)} className="flex-2 py-3 text-xs font-black text-white bg-brand-primary rounded-2xl shadow-lg uppercase">Ver Resultados</button>
          </div>
        </div>
      )}
      
      {/* Sales List */}
      <div className="space-y-3 pb-8">
        {filteredSales.map(sale => {
          return (
            <div 
              key={sale.id}
              className="w-full bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between text-left transition-all active:scale-[0.98]"
              onClick={() => handleOpenReceipt(sale.id, 'fiscal')}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-brand-primary/5 rounded-2xl flex flex-col items-center justify-center text-brand-primary shrink-0">
                  <span className="text-[9px] font-black uppercase">{new Date(sale.date).toLocaleString('pt-BR', { month: 'short' })}</span>
                  <span className="text-base font-black leading-none">{new Date(sale.date).getDate()}</span>
                </div>
                <div className="truncate pr-2">
                  <div className="font-black text-gray-800 text-sm truncate uppercase">{sale.customerName}</div>
                  <div className="text-[9px] text-gray-400 font-bold uppercase">{new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {sale.sellerUsername}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-black text-brand-primary text-sm">R$ {sale.total.toFixed(2)}</div>
                  <div className="text-[8px] text-gray-300 font-black uppercase">#{sale.id.split('-').pop()}</div>
                </div>
                <ChevronRight size={16} className="text-gray-200" />
              </div>
            </div>
          );
        })}

        {filteredSales.length === 0 && (
          <div className="text-center py-20 text-gray-400 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
              <Search size={32} className="opacity-20" />
            </div>
            <p className="text-sm font-black uppercase tracking-widest opacity-40">Nada por aqui.</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhe da Venda */}
      {selectedSaleId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-5 bg-brand-primary text-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-sm uppercase tracking-widest">Documento de Venda</h3>
              <button onClick={() => setSelectedSaleId(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar bg-gray-50/50">
              <Receipt saleId={selectedSaleId} initialType={initialType} autoPrint={false} />
              
              <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3 no-print">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-3 text-red-600">
                  <ShieldAlert size={18} className="shrink-0" />
                  <p className="text-[9px] font-black uppercase leading-tight">
                    A exclusão é irreversível e exige autorização administrativa. Recomenda-se apenas para correções críticas.
                  </p>
                </div>
                <button 
                  onClick={() => setSaleToDelete(selectedSaleId)}
                  className="w-full py-4 bg-white text-red-500 border-2 border-red-100 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} /> Excluir Registro de Venda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão com Autenticação de Admin */}
      {saleToDelete && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 bg-red-600 text-white text-center space-y-2">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <UserCheck size={32} />
              </div>
              <h3 className="font-black text-lg uppercase tracking-widest">Autorização Admin</h3>
              <p className="text-[10px] font-bold uppercase opacity-80">A exclusão exige validação de um administrador.</p>
            </div>
            
            <form onSubmit={handleDeleteConfirm} className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Usuário Admin</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="text"
                      required
                      placeholder="Login do Administrador"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-red-500 font-bold"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Senha Admin</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="password"
                      required
                      placeholder="Senha do Administrador"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-red-500 font-bold"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-50 text-red-500 text-[10px] font-black uppercase text-center rounded-xl border border-red-100">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => { setSaleToDelete(null); setAdminUsername(''); setAdminPassword(''); setDeleteError(''); }}
                  className="flex-1 py-4 text-xs font-black text-gray-400 uppercase bg-gray-50 rounded-2xl active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isDeleting}
                  className="flex-1 py-4 text-xs font-black text-white bg-red-600 rounded-2xl shadow-xl shadow-red-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={16} /> : "Autorizar Exclusão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
