
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Customer, CartItem, Sale, SaleItem, Budget, BudgetItem, User as UserType } from '../types';
import { db } from '../db';
import Receipt from '../components/Receipt';
import SmartScanner from '../components/SmartScanner';
import { 
  User, 
  Search, 
  Plus, 
  Minus, 
  ArrowRight, 
  CheckCircle2,
  ChevronLeft,
  FileText,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Flame,
  Camera,
  Percent,
  CreditCard,
  QrCode,
  Users
} from 'lucide-react';

interface NewSaleProps {
  products: Product[];
  customers: Customer[];
  conversionData?: Budget | null;
  currentUser: UserType | null;
  onComplete: () => void;
  onBudgetComplete: () => void;
  onCancel?: () => void;
}

enum SaleStep {
  SELECT_CUSTOMER,
  ADD_PRODUCTS,
  CONFIRMATION,
  FINISHED
}

const NewSale: React.FC<NewSaleProps> = ({ products, customers, conversionData, currentUser, onComplete, onBudgetComplete }) => {
  const [step, setStep] = useState<SaleStep>(SaleStep.SELECT_CUSTOMER);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [lastId, setLastId] = useState<string | null>(null);
  const [isBudgetMode, setIsBudgetMode] = useState(false);
  const [budgetValidityDays, setBudgetValidityDays] = useState(7);
  const [showFeatured, setShowFeatured] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao'>('pix');

  const featuredProducts = useMemo(() => db.getTopSellingProducts(products, 3), [products]);

  useEffect(() => {
    if (conversionData && products.length > 0 && customers.length > 0) {
      const customer = customers.find(c => c.id === conversionData.customerId);
      if (customer) {
        setSelectedCustomer(customer);
        const loadBudgetItems = async () => {
          const budgetItems = await db.getBudgetItems(conversionData.id);
          const initialCart: CartItem[] = budgetItems.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
              ...(product || {
                id: item.productId,
                name: item.productName,
                price: item.unitPrice,
                stockQuantity: 0,
                category: 'Desconhecida'
              }),
              cartQuantity: item.quantity
            };
          });
          setCart(initialCart);
          setStep(SaleStep.CONFIRMATION);
        };
        loadBudgetItems();
      }
    }
  }, [conversionData, products, customers]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch) ||
    (c.cpf && c.cpf.includes(customerSearch))
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    const currentQtyInCart = existing?.cartQuantity || 0;

    if (currentQtyInCart + 1 > product.stockQuantity) {
      alert(`Erro: Estoque insuficiente! (${product.stockQuantity} disponiveis)`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, cartQuantity: item.cartQuantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, cartQuantity: 1 }]);
    }
  };

  const handleScannerDetected = (data: { name: string }) => {
    const matched = products.find(p => 
      p.name.toLowerCase().includes(data.name.toLowerCase()) || 
      data.name.toLowerCase().includes(p.name.toLowerCase())
    );

    if (matched) {
      addToCart(matched);
      setSearchTerm('');
    } else {
      setSearchTerm(data.name);
      alert(`Produto detectado: "${data.name}". Não encontrado no estoque.`);
    }
  };

  const updateCartQuantity = (id: Product['id'], delta: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (!existing) return prev;
      const newQty = existing.cartQuantity + delta;
      if (newQty <= 0) return prev.filter(item => item.id !== id);
      const productSource = products.find(p => p.id === id);
      if (newQty > (productSource?.stockQuantity || 0)) {
        alert(`Estoque insuficiente! Disponivel: ${productSource?.stockQuantity}`);
        return prev;
      }
      return prev.map(item => item.id === id ? { ...item, cartQuantity: newQty } : item);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const discountAmount = cartTotal * (discountPercent / 100);
  const finalTotal = cartTotal - discountAmount;

  const handleFinishSale = async () => {
    if (!selectedCustomer || !currentUser) return;

    const saleId = `SALE-${Date.now()}`;
    const newSale: Sale = {
      id: saleId,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      date: new Date().toISOString(),
      subtotal: cartTotal,
      discount: discountAmount,
      total: finalTotal,
      paymentMethod: paymentMethod,
      sellerUsername: currentUser.username
    };

    const saleItems: SaleItem[] = cart.map(item => ({
      id: `ITEM-${item.id}-${Date.now()}`,
      saleId: saleId,
      productId: item.id,
      productName: item.name,
      quantity: item.cartQuantity,
      unitPrice: item.price
    }));

    await db.createSale(newSale, saleItems);
    setLastId(saleId);
    setIsBudgetMode(false);
    setStep(SaleStep.FINISHED);
  };

  const handleGenerateBudget = async () => {
    if (!selectedCustomer || !currentUser) return;

    const budgetId = `BUDGET-${Date.now()}`;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + budgetValidityDays);

    const newBudget: Budget = {
      id: budgetId,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      date: new Date().toISOString(),
      total: cartTotal,
      validUntil: validUntil.toISOString(),
      sellerUsername: currentUser.username
    };

    const budgetItems: BudgetItem[] = cart.map(item => ({
      id: `BITEM-${item.id}-${Date.now()}`,
      budgetId: budgetId,
      productId: item.id,
      productName: item.name,
      quantity: item.cartQuantity,
      unitPrice: item.price
    }));

    await db.createBudget(newBudget, budgetItems);
    setLastId(budgetId);
    setIsBudgetMode(true);
    setStep(SaleStep.FINISHED);
  };

  const renderStep = () => {
    switch (step) {
      case SaleStep.SELECT_CUSTOMER:
        return (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Selecione o Cliente</h2>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Nome, Telefone ou CPF..."
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setStep(SaleStep.ADD_PRODUCTS);
                    }}
                    className={`w-full p-4 text-left border rounded-2xl flex items-center justify-between transition-all ${
                      selectedCustomer?.id === c.id 
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' 
                      : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${selectedCustomer?.id === c.id ? 'bg-indigo-200' : 'bg-gray-100'}`}>
                        <User size={20} className={selectedCustomer?.id === c.id ? 'text-indigo-600' : 'text-gray-400'} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{c.name}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase">{c.phone}</div>
                      </div>
                    </div>
                    {selectedCustomer?.id === c.id && <CheckCircle2 size={20} className="text-indigo-600" />}
                  </button>
                ))
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 font-bold uppercase">Nenhum cliente encontrado</p>
                  <p className="text-[10px] text-gray-400 mt-1">Cadastre o cliente na aba de Clientes.</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button 
                onClick={() => {
                  // Fallback para consumidor final rápido se não houver cadastro
                  const fastCustomer = { id: '0', name: 'Consumidor Final', phone: '(00) 00000-0000' } as Customer;
                  setSelectedCustomer(fastCustomer);
                  setStep(SaleStep.ADD_PRODUCTS);
                }}
                className="w-full py-4 text-xs font-black text-indigo-600 bg-indigo-50 rounded-2xl border border-indigo-100 uppercase tracking-widest"
              >
                Venda Rápida (Consumidor Final)
              </button>
            </div>
          </div>
        );

      case SaleStep.ADD_PRODUCTS:
        return (
          <div className="flex flex-col h-full bg-gray-50">
            {isScannerOpen && (
              <SmartScanner mode="sale" onClose={() => setIsScannerOpen(false)} onDetected={handleScannerDetected} />
            )}
            <div className="bg-white p-4 border-b border-gray-200 space-y-3 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(SaleStep.SELECT_CUSTOMER)} className="text-indigo-600 flex items-center gap-1 font-semibold text-sm">
                  <ChevronLeft size={16} /> Cliente: {selectedCustomer?.name.split(' ')[0]}
                </button>
                <div className="text-xs font-bold text-gray-400 uppercase">Carrinho: {cart.reduce((a, b) => a + b.cartQuantity, 0)}</div>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Buscar produtos..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button onClick={() => setIsScannerOpen(true)} className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg">
                  <Camera size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32 no-scrollbar">
              {filteredProducts.map(product => {
                const inCart = cart.find(item => item.id === product.id);
                return (
                  <div key={product.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 text-sm">{product.name}</div>
                      <div className="text-xs text-indigo-600 font-bold">R$ {product.price.toFixed(2)}</div>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-3 bg-indigo-50 p-1 rounded-xl">
                        <button onClick={() => updateCartQuantity(product.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white text-indigo-600 rounded-lg shadow-sm"><Minus size={14} /></button>
                        <span className="font-black text-indigo-700 w-6 text-center">{inCart.cartQuantity}</span>
                        <button onClick={() => updateCartQuantity(product.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white text-indigo-600 rounded-lg shadow-sm"><Plus size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(product)} disabled={product.stockQuantity <= 0} className="p-3 bg-indigo-600 text-white rounded-xl shadow-md active:scale-95 transition-all">
                        <Plus size={20} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto p-4 pointer-events-none">
              <div className="bg-indigo-600 rounded-[2rem] shadow-2xl p-4 text-white flex items-center justify-between pointer-events-auto border border-white/10">
                <div className="ml-4">
                  <div className="text-[10px] opacity-70 font-black uppercase tracking-widest">Total</div>
                  <div className="text-2xl font-black">R$ {cartTotal.toFixed(2)}</div>
                </div>
                <button 
                  onClick={() => cart.length > 0 && setStep(SaleStep.CONFIRMATION)}
                  disabled={cart.length === 0}
                  className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold flex items-center gap-2 shadow-xl active:scale-95 transition-all"
                >
                  Pagar <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        );

      case SaleStep.CONFIRMATION:
        return (
          <div className="p-4 space-y-4 pb-24">
            <button onClick={() => setStep(SaleStep.ADD_PRODUCTS)} className="text-indigo-600 flex items-center gap-1 font-black text-xs uppercase bg-indigo-50 px-4 py-2 rounded-full">
              <ChevronLeft size={16} /> Voltar ao Carrinho
            </button>
            
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><User size={20} /></div>
                <div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Cliente</div>
                  <div className="font-black text-gray-800">{selectedCustomer?.name}</div>
                  {selectedCustomer?.cpf && <div className="text-[8px] text-gray-400 font-bold">CPF: {selectedCustomer.cpf}</div>}
                </div>
              </div>

              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-sm truncate">{item.name}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">{item.cartQuantity}x R$ {item.price.toFixed(2)}</div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-black text-indigo-600 text-sm">R$ {(item.price * item.cartQuantity).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-100 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setPaymentMethod('pix')} className={`py-3 rounded-2xl flex flex-col items-center gap-1 border transition-all ${paymentMethod === 'pix' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                    <QrCode size={18} /> <span className="text-[9px] font-black uppercase">PIX</span>
                  </button>
                  <button onClick={() => setPaymentMethod('dinheiro')} className={`py-3 rounded-2xl flex flex-col items-center gap-1 border transition-all ${paymentMethod === 'dinheiro' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                    <div className="text-lg font-bold">R$</div> <span className="text-[9px] font-black uppercase">Dinheiro</span>
                  </button>
                  <button onClick={() => setPaymentMethod('cartao')} className={`py-3 rounded-2xl flex flex-col items-center gap-1 border transition-all ${paymentMethod === 'cartao' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                    <CreditCard size={18} /> <span className="text-[9px] font-black uppercase">Cartão</span>
                  </button>
                </div>

                <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-700 font-black text-[10px] uppercase tracking-wider">Desconto (%)</div>
                  </div>
                  <input 
                    type="number"
                    className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-2xl text-lg font-black text-indigo-600 outline-none"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  />
                </div>
              </div>

              <div className="pt-4 border-t-2 border-dashed border-gray-100 space-y-2">
                <div className="flex justify-between items-center text-gray-400">
                  <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                  <span className="font-bold text-sm">R$ {cartTotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span className="text-[10px] font-black uppercase tracking-widest">Desconto ({discountPercent}%)</span>
                    <span className="font-bold text-sm">- R$ {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-2">
                  <div>
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Líquido</div>
                    <div className="font-black text-4xl text-gray-900 tracking-tighter">R$ {finalTotal.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleFinishSale}
              className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-sm"
            >
              Finalizar Venda <CheckCircle2 size={20} />
            </button>
            <button 
              onClick={handleGenerateBudget}
              className="w-full bg-amber-500 text-white font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-sm"
            >
              Salvar Orçamento <FileText size={20} />
            </button>
          </div>
        );

      case SaleStep.FINISHED:
        return (
          <div className="p-4 flex flex-col items-center justify-center min-h-[70vh] space-y-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center animate-bounce shadow-lg ${isBudgetMode ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
              {isBudgetMode ? <FileText size={56} /> : <CheckCircle2 size={56} />}
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-black text-gray-800">{isBudgetMode ? 'Orçamento OK!' : 'Venda Concluída!'}</h2>
              <p className="text-gray-500 font-medium">O registro foi salvo com sucesso.</p>
            </div>
            {lastId && <Receipt saleId={lastId} isBudget={isBudgetMode} />}
            <button onClick={isBudgetMode ? onBudgetComplete : onComplete} className="w-full bg-gray-900 text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm">Continuar</button>
          </div>
        );
    }
  };

  return <div className="h-full bg-gray-50">{renderStep()}</div>;
};

export default NewSale;
