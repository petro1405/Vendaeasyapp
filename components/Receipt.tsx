
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { ReceiptType, ShopInfo, Sale } from '../types';
import { Printer, Send, CreditCard, Receipt as ReceiptIcon, Truck, AlertTriangle, MapPin, Calendar, Phone } from 'lucide-react';

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

  const expired = isBudget && (entity as any).validUntil && new Date((entity as any).validUntil) < new Date();
  const sale = entity as Sale;

  const handleShareWhatsApp = () => {
    const title = isBudget ? 'ORCAMENTO' : (printType === 'delivery' ? 'ORDEM DE ENTREGA' : 'COMPROVANTE DE COMPRA');
    let text = `*${title} - ${shopInfo.name}*\n\n`;
    text += `Cliente: ${entity.customerName}\n`;
    text += `Data: ${new Date(entity.date).toLocaleDateString('pt-BR')}\n`;
    
    if (isBudget && (entity as any).validUntil) {
      text += `Validade: ${new Date((entity as any).validUntil).toLocaleDateString('pt-BR')}\n`;
      if (expired) text += `AVISO: ESTE ORCAMENTO ESTA EXPIRADO\n`;
    }

    if (!isBudget && sale.isDelivery && printType === 'delivery') {
      text += `\n*DADOS DE ENTREGA:*\n`;
      text += `Data Agendada: ${new Date(sale.deliveryDate!).toLocaleDateString('pt-BR')}\n`;
      text += `Endereço: ${sale.deliveryAddress}\n`;
      text += `Contato: ${sale.deliveryPhone}\n`;
    }
    
    text += `\n--------------------------\n`;
    items.forEach(item => {
      text += `- ${item.productName}\n  Qtd: ${item.quantity} x R$ ${item.unitPrice.toFixed(2)} = R$ ${(item.quantity * item.unitPrice).toFixed(2)}\n`;
    });
    text += `--------------------------\n`;
    
    if (!isBudget && sale.discount && sale.discount > 0) {
      text += `Subtotal: R$ ${sale.subtotal?.toFixed(2)}\n`;
      text += `Desconto: - R$ ${sale.discount?.toFixed(2)}\n`;
    }
    
    text += `\n*TOTAL: R$ ${entity.total.toFixed(2)}*\n`;
    if (!isBudget && sale.paymentMethod) {
      text += `Pagamento: ${sale.paymentMethod.toUpperCase()}\n`;
    }
    text += `\n--------------------------\n`;
    
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

        {/* DADOS DE ENTREGA EM DESTAQUE NO TOPO (MODO ENTREGA) */}
        {!isBudget && sale.isDelivery && printType === 'delivery' && (
          <div className="mb-4 p-2 border-2 border-black space-y-1">
            <div className="font-black text-center border-b border-black mb-1">DADOS PARA ENTREGA</div>
            <div className="flex items-start gap-1">
              <Calendar size={10} className="shrink-0 mt-0.5" />
              <span className="font-bold">DATA: {new Date(sale.deliveryDate!).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-start gap-1">
              <MapPin size={10} className="shrink-0 mt-0.5" />
              <span className="font-bold">ENDEREÇO: {sale.deliveryAddress}</span>
            </div>
            <div className="flex items-start gap-1">
              <Phone size={10} className="shrink-0 mt-0.5" />
              <span className="font-bold">CONTATO: {sale.deliveryPhone}</span>
            </div>
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
          {!isBudget && sale.paymentMethod && (
            <div className="flex justify-between">
              <span>PAGAMENTO:</span>
              <span className="uppercase font-bold">{sale.paymentMethod}</span>
            </div>
          )}
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

        <div className="border-t-2 border-black pt-2 mb-4 space-y-1">
          {!isBudget && sale.discount && sale.discount > 0 && (
            <>
              <div className="flex justify-between text-[10px]">
                <span>SUBTOTAL BRUTO</span>
                <span>R$ {sale.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>DESCONTO APLICADO</span>
                <span>- R$ {sale.discount?.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-base font-black">
            <span>{(!isBudget && sale.discount && sale.discount > 0) ? 'TOTAL LÍQUIDO' : 'VALOR TOTAL'}</span>
            <span>R$ {entity.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-center text-[9px] mt-6 opacity-80 uppercase">
          {isBudget 
            ? `--- ORCAMENTO VALIDO ATE ${new Date((entity as any).validUntil).toLocaleDateString('pt-BR')} ---` 
            : shopInfo.receiptMessage ? `--- ${shopInfo.receiptMessage} ---` : '--- OBRIGADO PELA PREFERENCIA ---'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 no-print">
        <button 
          onClick={handleShareWhatsApp}
          className={`w-full ${isBudget ? 'bg-amber-500' : 'bg-green-600'} text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all uppercase text-sm`}
        >
          <Send size={18} /> WhatsApp
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => handlePrint('fiscal')} className={`p-3 border rounded-xl font-bold flex flex-col items-center gap-1 shadow-md transition-all ${printType === 'fiscal' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-100'}`}>
            <ReceiptIcon size={20} /> <span className="text-[9px]">Cupom</span>
          </button>
          <button onClick={() => handlePrint('delivery')} className={`p-3 border rounded-xl font-bold flex flex-col items-center gap-1 shadow-md transition-all ${printType === 'delivery' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-800 border-slate-100'}`}>
            <Truck size={20} /> <span className="text-[9px]">Entrega</span>
          </button>
          <button onClick={() => handlePrint('payment')} className={`p-3 border rounded-xl font-bold flex flex-col items-center gap-1 shadow-md transition-all ${printType === 'payment' ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            <CreditCard size={20} /> <span className="text-[9px]">Pagam.</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
