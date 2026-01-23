
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { ReceiptType, ShopInfo } from '../types';
import { Printer, Send, CreditCard, Receipt as ReceiptIcon, Truck, AlertTriangle } from 'lucide-react';

interface ReceiptProps {
  saleId: string;
  isBudget?: boolean;
  initialType?: ReceiptType;
}

const Receipt: React.FC<ReceiptProps> = ({ saleId, isBudget = false, initialType = 'fiscal' }) => {
  const [printType, setPrintType] = useState<ReceiptType>(initialType);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [entity, setEntity] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (initialType) setPrintType(initialType);
  }, [initialType]);

  // Fix: Use useEffect to handle asynchronous data fetching instead of calling them in render
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const info = await db.getShopInfo();
      setShopInfo(info);

      let currentEntity;
      let currentItems;

      if (isBudget) {
        const budgets = await db.getBudgets();
        currentEntity = budgets.find(b => b.id === saleId);
        currentItems = await db.getBudgetItems(saleId);
      } else {
        const sales = await db.getSales();
        currentEntity = sales.find(s => s.id === saleId);
        currentItems = await db.getSaleItems(saleId);
      }

      setEntity(currentEntity);
      setItems(currentItems);
      setLoading(false);
    };
    loadData();
  }, [saleId, isBudget]);

  if (loading || !entity || !shopInfo) return (
    <div className="flex justify-center p-8">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const expired = isBudget && (entity as any).validUntil && new Date((entity as any).validUntil) < new Date();

  const handleShareWhatsApp = () => {
    const title = isBudget ? 'ORCAMENTO' : 'COMPROVANTE DE COMPRA';
    let text = `*${title} - ${shopInfo.name}*\n\n`;
    text += `Cliente: ${entity.customerName}\n`;
    text += `Data: ${new Date(entity.date).toLocaleDateString('pt-BR')}\n`;
    
    if (isBudget && (entity as any).validUntil) {
      text += `Validade: ${new Date((entity as any).validUntil).toLocaleDateString('pt-BR')}\n`;
      if (expired) text += `AVISO: ESTE ORCAMENTO ESTA EXPIRADO\n`;
    }
    
    text += `\n--------------------------\n`;
    items.forEach(item => {
      text += `- ${item.productName}\n  Qtd: ${item.quantity} x R$ ${item.unitPrice.toFixed(2)} = R$ ${(item.quantity * item.unitPrice).toFixed(2)}\n`;
    });
    text += `--------------------------\n`;
    text += `\n*TOTAL: R$ ${entity.total.toFixed(2)}*\n\n`;
    text += isBudget 
      ? `Este orcamento e valido ate ${new Date((entity as any).validUntil).toLocaleDateString('pt-BR')} conforme disponibilidade de estoque.` 
      : shopInfo.receiptMessage || `Obrigado pela preferencia! Guarde este recibo para retirada.`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handlePrint = (type: ReceiptType) => {
    setPrintType(type);
    setTimeout(() => { window.print(); }, 150);
  };

  return (
    <div className="w-full space-y-4">
      {expired && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 no-print">
          <AlertTriangle size={24} className="shrink-0" />
          <div>
            <div className="font-black text-xs uppercase tracking-tight">Orcamento Expirado</div>
            <div className="text-[10px] font-medium opacity-80">A validade terminou em {new Date((entity as any).validUntil).toLocaleDateString('pt-BR')}.</div>
          </div>
        </div>
      )}

      <div 
        id="printable-area"
        className="bg-white p-4 text-[12px] font-mono leading-tight receipt-font mx-auto max-w-[300px] border border-gray-100 shadow-sm"
      >
        {printType === 'payment' ? (
          <div className="text-center space-y-4 py-4">
            <div className="border-b-2 border-black pb-4 flex flex-col items-center gap-3">
              {shopInfo.logo && (
                <div className="w-16 h-16 mb-2 flex items-center justify-center overflow-hidden">
                  <img src={shopInfo.logo} alt="Logo" className="max-w-[64px] max-h-[64px] object-contain" />
                </div>
              )}
              <div className="font-bold text-lg uppercase tracking-tighter">{shopInfo.name}</div>
              <div className="text-[10px] uppercase">CNPJ: {shopInfo.cnpj}</div>
            </div>
            
            <div className="py-4 space-y-2">
              <div className="text-sm font-black uppercase tracking-widest bg-black text-white px-2 py-1">Cupom de Pagamento</div>
              <div className="text-[10px] font-bold">PDV: {shopInfo.pdvName || 'TERMINAL-01'} | NO: {entity.id.split('-').pop()}</div>
              <div className="text-4xl font-black py-6 border-y-2 border-dashed border-black">
                R$ {entity.total.toFixed(2)}
              </div>
            </div>

            <div className="text-[10px] space-y-1 text-left px-2">
              <div className="flex justify-between"><span>DATA:</span> <span>{new Date(entity.date).toLocaleDateString('pt-BR')}</span></div>
              <div className="flex justify-between"><span>HORA:</span> <span>{new Date(entity.date).toLocaleTimeString('pt-BR')}</span></div>
              <div className="border-t border-black mt-2 pt-1 uppercase font-bold">Cliente: {entity.customerName}</div>
            </div>
            
            <div className="text-[8px] opacity-80 pt-10 uppercase font-black italic">
              *** DOCUMENTO NAO FISCAL ***<br/>
              --- USO INTERNO / VALE CAIXA ---
            </div>
          </div>
        ) : (
          <>
            <div className="text-center border-b-2 border-black pb-4 mb-4 flex flex-col items-center gap-2">
              {shopInfo.logo && (
                <div className="w-16 h-16 mb-2 flex items-center justify-center overflow-hidden">
                  <img src={shopInfo.logo} alt="Logo" className="max-w-[64px] max-h-[64px] object-contain" />
                </div>
              )}
              <div className="font-bold text-lg uppercase tracking-tighter">{shopInfo.name}</div>
              <div className="text-[10px] uppercase">{shopInfo.address}</div>
              <div className="text-[10px]">CNPJ: {shopInfo.cnpj} | Tel: {shopInfo.phone}</div>
            </div>

            {expired && (
              <div className="text-center border-2 border-black p-2 mb-2 font-black text-[14px]">
                *** ORCAMENTO EXPIRADO ***
              </div>
            )}

            <div className="mb-2 space-y-0.5 border-b border-dashed border-gray-400 pb-2">
              <div className="flex justify-between font-bold">
                <span>{isBudget ? 'ORCAMENTO' : printType === 'delivery' ? 'ORDEM DE ENTREGA' : 'PEDIDO'}</span>
                <span>#{entity.id.split('-').pop()}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>PDV: {shopInfo.pdvName || 'TERMINAL-01'}</span>
                <span>{new Date(entity.date).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span>CLIENTE:</span>
                <span className="truncate max-w-[150px] uppercase font-bold">{entity.customerName}</span>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex justify-between font-bold border-b border-black mb-1 text-[10px]">
                <span className="w-1/2">PRODUTO</span>
                <span className="w-1/6 text-right">QTD</span>
                <span className="w-1/3 text-right">TOTAL</span>
              </div>
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between py-0.5 border-b border-gray-50 last:border-0">
                  <span className="w-1/2 truncate uppercase text-[10px]">{item.productName}</span>
                  <span className="w-1/6 text-right">{item.quantity}</span>
                  <span className="w-1/3 text-right">R${(item.quantity * item.unitPrice).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-black pt-2 mb-4">
              <div className="flex justify-between text-base font-black">
                <span>VALOR TOTAL</span>
                <span>R$ {entity.total.toFixed(2)}</span>
              </div>
            </div>

            {printType === 'delivery' && (
              <div className="mt-4 border-t border-gray-400 pt-8 text-center space-y-4">
                <div className="border-b border-black w-48 mx-auto"></div>
                <div className="text-[9px] uppercase font-bold">Assinatura de Recebimento</div>
              </div>
            )}

            <div className="text-center text-[9px] mt-6 opacity-80 uppercase">
              {isBudget 
                ? `--- ORCAMENTO VALIDO ATE ${new Date((entity as any).validUntil).toLocaleDateString('pt-BR')} ---` 
                : shopInfo.receiptMessage ? `--- ${shopInfo.receiptMessage} ---` : '--- OBRIGADO PELA PREFERENCIA ---'}
              <br />
              <span className="text-[7px] opacity-40">Sistema VendaEasy - Material de Construcao</span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 no-print">
        <button 
          onClick={handleShareWhatsApp}
          className={`w-full ${isBudget ? 'bg-amber-500' : 'bg-green-600'} text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all uppercase text-sm`}
        >
          <Send size={18} /> Enviar via WhatsApp
        </button>
        
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={() => handlePrint('fiscal')}
            className={`p-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 transition-all ${printType === 'fiscal' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100'}`}
          >
            <ReceiptIcon size={20} />
            <span className="text-[9px] uppercase">Cupom</span>
          </button>
          
          <button 
            onClick={() => handlePrint('delivery')}
            className={`p-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 transition-all ${printType === 'delivery' ? 'bg-slate-800 text-white' : 'bg-white text-slate-800 border border-slate-100'}`}
          >
            <Truck size={20} />
            <span className="text-[9px] uppercase">Entrega</span>
          </button>

          <button 
            onClick={() => handlePrint('payment')}
            className={`p-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 transition-all ${printType === 'payment' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
          >
            <CreditCard size={20} />
            <span className="text-[9px] uppercase">Pagam.</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
