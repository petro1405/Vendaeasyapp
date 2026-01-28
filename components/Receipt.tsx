
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { ReceiptType, ShopInfo, Sale } from '../types';
import { Printer, Send, CreditCard, Receipt as ReceiptIcon, Truck, AlertTriangle, MapPin, Calendar, Phone, DollarSign } from 'lucide-react';

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

  const sale = entity as Sale;

  const handleShareWhatsApp = () => {
    const title = isBudget ? 'ORÇAMENTO' : (printType === 'delivery' ? 'ORDEM DE ENTREGA' : (printType === 'payment' ? 'TICKET DE CAIXA' : 'COMPROVANTE'));
    let text = `*${title} - ${shopInfo.name}*\n\n`;
    text += `Cliente: ${entity.customerName}\n`;
    
    if (printType === 'payment') {
      text += `Pagamento: *${sale.paymentMethod?.toUpperCase()}*\n`;
      text += `VALOR TOTAL: *R$ ${entity.total.toFixed(2)}*\n`;
    } else {
      text += `Data: ${new Date(entity.date).toLocaleDateString('pt-BR')}\n`;
      if (!isBudget && sale.isDelivery && printType === 'delivery') {
        text += `\n*DADOS DE ENTREGA:*\n`;
        text += `Endereço: ${sale.deliveryAddress}\n`;
        text += `Contato: ${sale.deliveryPhone}\n`;
      }
      text += `\n--------------------------\n`;
      items.forEach(item => {
        text += `- ${item.productName} (${item.quantity}x)\n`;
      });
      text += `--------------------------\n`;
      text += `*TOTAL: R$ ${entity.total.toFixed(2)}*\n`;
    }
    
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handlePrint = (type: ReceiptType) => {
    setPrintType(type);
    setTimeout(() => { window.print(); }, 150);
  };

  // RENDERIZAÇÃO DO TICKET DE CAIXA (MUITO SIMPLIFICADO)
  if (printType === 'payment' && !isBudget) {
    return (
      <div className="w-full space-y-4">
        <div id="printable-area" className="bg-white p-6 text-black font-mono leading-tight receipt-font mx-auto max-w-[320px] border-2 border-black">
          <div className="text-center border-b-2 border-black pb-2 mb-4">
            <div className="font-black text-sm uppercase tracking-tighter">TICKET DE CAIXA</div>
            <div className="text-[10px] uppercase font-bold">{shopInfo.name}</div>
          </div>

          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-1 border-b border-dashed border-gray-300 pb-4">
              <span className="text-[10px] font-bold uppercase text-gray-500">CLIENTE</span>
              <span className="text-sm font-black uppercase text-center">{entity.customerName}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold uppercase text-gray-500">FORMA DE PAGAMENTO</span>
              <div className="bg-black text-white px-4 py-1 rounded-md font-black text-base uppercase">
                {sale.paymentMethod || 'A DEFINIR'}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 py-4 border-y-2 border-black bg-gray-50">
              <span className="text-[10px] font-black uppercase text-black">VALOR TOTAL A PAGAR</span>
              <span className="text-4xl font-black text-black">R$ {entity.total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-[10px] pt-2 font-bold opacity-60">
              <span>CONTROLE: #{entity.id.split('-').pop()}</span>
              <span>{new Date(entity.date).toLocaleTimeString('pt-BR')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 no-print">
          <button onClick={handleShareWhatsApp} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all uppercase text-sm">
            <Send size={18} /> WhatsApp
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setPrintType('fiscal')} className="p-3 border rounded-xl font-bold flex flex-col items-center gap-1 bg-white text-gray-400">
              <ReceiptIcon size={20} /> <span className="text-[9px]">Venda</span>
            </button>
            <button onClick={() => setPrintType('delivery')} className="p-3 border rounded-xl font-bold flex flex-col items-center gap-1 bg-white text-gray-400">
              <Truck size={20} /> <span className="text-[9px]">Entrega</span>
            </button>
            <button onClick={() => handlePrint('payment')} className="p-3 border rounded-xl font-bold flex flex-col items-center gap-1 bg-indigo-600 text-white shadow-md">
              <DollarSign size={20} /> <span className="text-[9px]">Caixa</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDERIZAÇÃO PADRÃO (FISCAL OU ENTREGA)
  return (
    <div className="w-full space-y-4">
      <div 
        id="printable-area"
        className="bg-white p-6 text-[11px] font-mono leading-tight receipt-font mx-auto max-w-[320px] border border-gray-100"
      >
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <div className="font-bold text-lg uppercase">{shopInfo.name}</div>
          <div className="text-[9px] uppercase">{shopInfo.address}</div>
          <div className="text-[9px]">CNPJ: {shopInfo.cnpj}</div>
        </div>

        {!isBudget && sale.isDelivery && printType === 'delivery' && (
          <div className="mb-4 p-3 border-4 border-black space-y-2">
            <div className="font-black text-center border-b-2 border-black pb-1 mb-1 text-sm">ORDEM DE ENTREGA</div>
            <div className="flex items-start gap-1">
              <Calendar size={12} className="shrink-0 mt-0.5" />
              <span className="font-black text-xs uppercase">DATA: {new Date(sale.deliveryDate!).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-start gap-1 border-t border-black pt-1">
              <MapPin size={12} className="shrink-0 mt-0.5" />
              <span className="font-black text-xs uppercase">LOCAL: {sale.deliveryAddress}</span>
            </div>
            <div className="flex items-start gap-1 border-t border-black pt-1">
              <Phone size={12} className="shrink-0 mt-0.5" />
              <span className="font-black text-xs uppercase">FONE: {sale.deliveryPhone}</span>
            </div>
          </div>
        )}

        <div className="mb-2 space-y-1 border-b border-dashed border-black pb-2">
          <div className="flex justify-between font-black text-sm">
            <span>{isBudget ? 'ORÇAMENTO' : printType === 'delivery' ? 'ORDEM DE ENTREGA' : 'RECIBO DE VENDA'}</span>
            <span>#{entity.id.split('-').pop()}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>CLIENTE:</span>
            <span className="uppercase">{entity.customerName}</span>
          </div>
          <div className="flex justify-between opacity-70">
            <span>EMISSÃO:</span>
            <span>{new Date(entity.date).toLocaleString('pt-BR')}</span>
          </div>
        </div>

        <div className="mb-2">
          <div className="flex justify-between font-black border-b border-black mb-1">
            <span className="w-1/2">PRODUTO</span>
            <span className="w-1/6 text-right">QTD</span>
            <span className="w-1/3 text-right">TOTAL</span>
          </div>
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
              <span className="w-1/2 uppercase">{item.productName}</span>
              <span className="w-1/6 text-right">{item.quantity}</span>
              <span className="w-1/3 text-right">R${(item.quantity * item.unitPrice).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-black pt-2 mb-4">
          <div className="flex justify-between text-base font-black">
            <span>TOTAL GERAL</span>
            <span>R$ {entity.total.toFixed(2)}</span>
          </div>
          {!isBudget && sale.paymentMethod && (
            <div className="text-[10px] font-bold mt-1 uppercase text-right">FORMA: {sale.paymentMethod}</div>
          )}
        </div>

        <div className="text-center text-[9px] mt-6 border-t border-black pt-2 opacity-80 uppercase italic">
          {shopInfo.receiptMessage || 'Obrigado pela preferência!'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 no-print">
        <button 
          onClick={handleShareWhatsApp}
          className="w-full bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all uppercase text-sm"
        >
          <Send size={18} /> WhatsApp
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setPrintType('fiscal')} className={`p-3 border rounded-xl font-bold flex flex-col items-center gap-1 shadow-md transition-all ${printType === 'fiscal' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-100'}`}>
            <ReceiptIcon size={20} /> <span className="text-[9px]">Venda</span>
          </button>
          <button onClick={() => setPrintType('delivery')} className={`p-3 border rounded-xl font-bold flex flex-col items-center gap-1 shadow-md transition-all ${printType === 'delivery' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-800 border-slate-100'}`}>
            <Truck size={20} /> <span className="text-[9px]">Entrega</span>
          </button>
          <button onClick={() => setPrintType('payment')} className={`p-3 border rounded-xl font-bold flex flex-col items-center gap-1 shadow-md transition-all ${printType === 'payment' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-amber-700 border-amber-100'}`}>
            <DollarSign size={20} /> <span className="text-[9px]">Caixa</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
