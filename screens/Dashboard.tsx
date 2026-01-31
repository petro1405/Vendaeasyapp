
import React, { useState, useMemo } from 'react';
import { Product, Sale, ReceiptType, Budget } from '../types';
import Receipt from '../components/Receipt';
import { 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Calendar, 
  FileText, 
  ShoppingBag, 
  Printer, 
  X, 
  CreditCard,
  BarChart3,
  DollarSign,
  Users,
  ArrowUpRight
} from 'lucide-react';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  budgets: Budget[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, sales, budgets }) => {
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [initialType, setInitialType] = useState<ReceiptType>('fiscal');
  const [viewMode, setViewMode] = useState<'overview' | 'analytics'>('overview');

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const todaySales = sales.filter(s => s.date.startsWith(today));
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

  const monthSales = sales.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);
  
  // ANALYTICS DATA
  const stats = useMemo(() => {
    const sellerPerformance: Record<string, number> = {};
    let totalCost = 0;
    
    monthSales.forEach(sale => {
      // Performance por Vendedor
      sellerPerformance[sale.sellerUsername] = (sellerPerformance[sale.sellerUsername] || 0) + sale.total;
      
      // Cálculo de Lucro Estimado (seguro contra campos undefined)
      if (sale.items) {
        sale.items.forEach(item => {
          const prod = products.find(p => p.id === item.productId);
          totalCost += (prod?.costPrice || 0) * item.quantity;
        });
      }
    });

    const sellers = Object.entries(sellerPerformance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const ticketMedio = monthSales.length > 0 ? monthTotal / monthSales.length : 0;
    const lucroBruto = monthTotal - totalCost;

    return { sellers, ticketMedio, lucroBruto, totalCost };
  }, [monthSales, products, monthTotal]);

  const lowStockProducts = products.filter(p => p.stockQuantity < 5);

  const handleOpenReceipt = (saleId: string, type: ReceiptType = 'fiscal') => {
    setInitialType(type);
    setSelectedSaleId(saleId);
  };

  const latestSaleId = sales.length > 0 ? sales[0].id : null;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-800">Painel Geral</h2>
          <p className="text-xs text-gray-500 font-medium">Controle em tempo real.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          <button 
            onClick={() => setViewMode('overview')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'overview' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
          >
            <ShoppingBag size={18} />
          </button>
          <button 
            onClick={() => setViewMode('analytics')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'analytics' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
          >
            <BarChart3 size={18} />
          </button>
        </div>
      </div>

      {viewMode === 'overview' ? (
        <>
          <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-xs opacity-70 uppercase font-black tracking-widest mb-1">Vendas do Mês</div>
              <div className="text-4xl font-black">R$ {monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <div className="text-[10px] font-bold bg-white/20 px-3 py-1.5 rounded-full flex items-center gap-2">
                  <TrendingUp size={12} /> 
                  {monthSales.length} pedidos
                </div>
                {latestSaleId && (
                  <button 
                    onClick={() => handleOpenReceipt(latestSaleId, 'fiscal')}
                    className="text-[9px] font-black uppercase bg-white text-indigo-600 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md active:scale-95 transition-all"
                  >
                    <Printer size={10} /> Último Recibo
                  </button>
                )}
              </div>
            </div>
            <ArrowUpRight size={140} className="absolute -right-8 -bottom-8 opacity-10 rotate-12" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2 text-indigo-500 mb-2">
                <Calendar size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">Hoje</span>
              </div>
              <div className="text-lg font-black text-gray-800">R$ {todayTotal.toFixed(2)}</div>
              <div className="text-[10px] text-gray-500 font-medium">{todaySales.length} vendas</div>
            </div>
            
            <div className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <FileText size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">Orcamentos</span>
              </div>
              <div className="text-lg font-black text-gray-800">{budgets.length}</div>
              <div className="text-[10px] text-gray-500 font-medium text-amber-600">Aguardando</div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 px-2">
              <AlertTriangle size={18} className="text-red-500" />
              Atenção ao Estoque
            </h2>
            {lowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 3).map(product => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-white border border-red-50 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                        <Package size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{product.name}</div>
                        <div className="text-[10px] text-red-500 font-bold uppercase">Restam {product.stockQuantity.toLocaleString('pt-BR')} un./m</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-50 text-green-700 p-6 rounded-3xl text-center text-sm font-bold border border-green-100">
                Tudo em dia com o estoque!
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ticket Médio</div>
              <div className="text-2xl font-black text-indigo-600">R$ {stats.ticketMedio.toFixed(2)}</div>
              <div className="mt-2 h-1 w-full bg-indigo-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600" style={{ width: '65%' }}></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lucro Estimado</div>
              <div className="text-2xl font-black text-green-600">R$ {stats.lucroBruto.toFixed(2)}</div>
              <div className="text-[8px] text-gray-400 font-bold uppercase mt-1 italic">*Baseado no preço de custo</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Users size={18} className="text-indigo-600" />
              <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Performance da Equipe</h3>
            </div>
            
            <div className="space-y-5">
              {stats.sellers.length > 0 ? stats.sellers.map(([seller, amount], index) => {
                const percentage = (amount / monthTotal) * 100;
                return (
                  <div key={seller} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400">#{index+1}</div>
                        <span className="text-xs font-black text-gray-700 capitalize">{seller}</span>
                      </div>
                      <span className="text-xs font-black text-indigo-600">R$ {amount.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-center py-10 text-xs text-gray-400 font-bold uppercase tracking-widest">Nenhuma venda registrada este mês.</p>
              )}
            </div>
          </div>

          <div className="bg-indigo-900 p-6 rounded-[2.5rem] text-white shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em]">Custo de Operação</div>
              <div className="text-2xl font-black">R$ {stats.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <DollarSign size={24} className="text-indigo-300" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 pb-4">
        <h2 className="text-lg font-bold text-gray-800 px-2">Atividade Recente</h2>
        <div className="bg-white rounded-[2rem] border border-gray-100 divide-y overflow-hidden shadow-sm">
          {sales.length > 0 ? (
            sales.slice(0, 5).map(sale => (
              <div key={sale.id} className="p-4 flex justify-between items-center active:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <div className="font-black text-xs text-gray-800 truncate w-32">{sale.customerName}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">
                      {new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {sale.paymentMethod}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-black text-indigo-600 text-sm">R$ {sale.total.toFixed(2)}</div>
                  <button onClick={() => handleOpenReceipt(sale.id, 'fiscal')} className="p-2 text-gray-300 hover:text-indigo-600 bg-gray-50 rounded-xl">
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest italic">
              Nenhuma movimentação.
            </div>
          )}
        </div>
      </div>

      {selectedSaleId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-5 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest">Imprimir Recibo</h3>
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

export default Dashboard;
