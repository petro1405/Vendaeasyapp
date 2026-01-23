
import React, { useState } from 'react';
import { Budget } from '../types';
import { db } from '../db';
import Receipt from '../components/Receipt';
import { X, FileText, ChevronRight, Trash2, AlertCircle, Calendar, ShoppingCart } from 'lucide-react';

interface BudgetsProps {
  budgets: Budget[];
  onUpdate: () => void;
  onConvertToSale: (budget: Budget) => void;
}

const Budgets: React.FC<BudgetsProps> = ({ budgets, onUpdate, onConvertToSale }) => {
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Deseja excluir este orçamento?")) {
      db.deleteBudget(id);
      onUpdate();
    }
  };

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  const selectedBudget = budgets.find(b => b.id === selectedBudgetId);

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-gray-800">Orçamentos</h2>
        <p className="text-xs text-gray-500 font-medium">Controle de orçamentos pendentes e válidos.</p>
      </div>
      
      <div className="space-y-3 pb-8">
        {budgets.map(budget => {
          const expired = isExpired(budget.validUntil);
          return (
            <button 
              key={budget.id}
              onClick={() => setSelectedBudgetId(budget.id)}
              className={`w-full p-4 rounded-3xl border shadow-sm flex items-center justify-between text-left group transition-all active:scale-[0.98] ${
                expired ? 'bg-gray-50 border-gray-100 grayscale-[0.5]' : 'bg-white border-white active:bg-amber-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  expired ? 'bg-gray-200 text-gray-500' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100'
                }`}>
                  {expired ? <AlertCircle size={24} /> : <FileText size={24} />}
                </div>
                <div>
                  <div className={`font-bold text-sm ${expired ? 'text-gray-500' : 'text-gray-800'}`}>{budget.customerName}</div>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <div className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                      <Calendar size={10} /> Criado: {new Date(budget.date).toLocaleDateString('pt-BR')}
                    </div>
                    <div className={`text-[9px] font-black uppercase flex items-center gap-1 ${
                      expired ? 'text-red-400' : 'text-amber-500'
                    }`}>
                      <AlertCircle size={10} /> {expired ? 'Expirou em:' : 'Expira em:'} {new Date(budget.validUntil).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div className={`font-black text-sm ${expired ? 'text-gray-400' : 'text-gray-900'}`}>
                  R$ {budget.total.toFixed(2)}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => handleDelete(e, budget.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight size={16} className={`transition-colors ${expired ? 'text-gray-200' : 'text-gray-300 group-hover:text-amber-500'}`} />
                </div>
              </div>
            </button>
          );
        })}

        {budgets.length === 0 && (
          <div className="text-center py-20 text-gray-400 italic flex flex-col items-center gap-4">
            <FileText size={48} className="opacity-10" />
            <p className="text-sm font-medium">Nenhum orçamento pendente.</p>
          </div>
        )}
      </div>

      {selectedBudgetId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-5 bg-amber-500 text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest">Detalhes do Orçamento</h3>
              <button onClick={() => setSelectedBudgetId(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto no-scrollbar bg-gray-50/50 space-y-4">
              <Receipt saleId={selectedBudgetId} isBudget={true} />
              
              <button 
                onClick={() => selectedBudget && onConvertToSale(selectedBudget)}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                <ShoppingCart size={18} /> Converter em Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
