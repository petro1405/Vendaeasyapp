
import React, { useState } from 'react';
import { Product, Sale, ReceiptType, Budget } from '../types';
import Receipt from '../components/Receipt';
import { TrendingUp, AlertTriangle, Package, Calendar, FileText, ShoppingBag, Printer, X, CreditCard } from 'lucide-react';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  budgets: Budget[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, sales, budgets }) => {
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [initialType, setInitialType] = useState<ReceiptType>('fiscal');
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
  
  const lowStockProducts = products.filter(p => p.stockQuantity < 5);

  const handleOpenReceipt = (saleId: string, type: ReceiptType = 'fiscal') => {
    setInitialType(type);
    setSelectedSaleId(saleId);
  };

  const latestSaleId = sales.length > 0 ? sales[0].id : null;

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-gray-800">Painel Geral</h2>
        <p className="text-xs text-gray-500 font-medium">Bem-vindo ao controle do seu negocio.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-xs opacity-70 uppercase font-black tracking-widest mb-1">Vendas do Mes</div>
            <div className="text-3xl font-black">R$ {monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <div className="text-[10px] font-bold bg-white/20 px-3 py-1.5 rounded-full flex items-center gap-2">
                <TrendingUp size={12} /> 
                {monthSales.length} pedidos
              </div>
              {latestSaleId && (
                <>
                  <button 
                    onClick={() => handleOpenReceipt(latestSaleId, 'fiscal')}
                    className="text-[9px] font-black uppercase bg-white text-indigo-600 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md active:scale-95 transition-all"
                  >
                    <Printer size={10} /> Cupom Venda
                  </button>
                  <button 
                    onClick={() => handleOpenReceipt(latestSaleId, 'payment')}
                    className="text-[9px] font-black uppercase bg-amber-400 text-indigo-900 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md active:scale-95 transition-all"
                  >
                    <CreditCard size={10} /> Cupom Pagam.
                  </button>
                </>
              )}
            </div>
          </div>
          <ShoppingBag size={120} className="absolute -right-8 -bottom-8 opacity-10 rotate-12" />
        </div>
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" />
            Alertas de Estoque
          </h2>
        </div>
        
        {lowStockProducts.length > 0 ? (
          <div className="space-y-2">
            {lowStockProducts.slice(0, 3).map(product => (
              <div 
                key={product.id} 
                className="flex items-center justify-between p-4 bg-white border border-red-50 rounded-2xl shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                    <Package size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-sm">{product.name}</div>
                    <div className="text-[10px] text-red-500 font-bold uppercase">Apenas {product.stockQuantity} un.</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-green-50 text-green-700 p-6 rounded-3xl text-center text-sm font-bold border border-green-100">
            Estoque saudavel!
          </div>
        )}
      </div>

      <div className="space-y-3 pb-4">
        <h2 className="text-lg font-bold text-gray-800">Ultimas Atividades</h2>
        <div className="bg-white rounded-3xl border border-gray-100 divide-y overflow-hidden shadow-sm">
          {sales.length > 0 ? (
            sales.slice(0, 4).map(sale => (
              <div key={sale.id} className="p-4 flex justify-between items-center group active:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <TrendingUp size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-gray-800">{sale.customerName}</div>
                    <div className="text-[9px] text-gray-400 font-medium">
                      {new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-black text-indigo-600 text-sm mr-2">
                    R$ {sale.total.toFixed(2)}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenReceipt(sale.id, 'fiscal')}
                      className="p-2 text-gray-300 hover:text-indigo-600 transition-colors bg-gray-50 rounded-lg"
                    >
                      <Printer size={16} />
                    </button>
                    <button 
                      onClick={() => handleOpenReceipt(sale.id, 'payment')}
                      className="p-2 text-gray-300 hover:text-amber-600 transition-colors bg-gray-50 rounded-lg"
                    >
                      <CreditCard size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs italic">
              Nenhuma movimentacao registrada.
            </div>
          )}
        </div>
      </div>

      {selectedSaleId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-5 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest">Opcoes de Impressao</h3>
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
