
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
  Camera,
  CreditCard,
  QrCode,
  Truck,
  MapPin,
  Phone,
  Calendar as CalendarIcon,
  Percent,
  TrendingDown,
  Loader2,
  AlertTriangle,
  Info,
  Trash2
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
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao'>('pix');
  
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');

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

  useEffect(() => {
    if (selectedCustomer) {
      setDeliveryAddress(selectedCustomer.address || '');
      setDeliveryPhone(selectedCustomer.phone || '');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDeliveryDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [selectedCustomer]);

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
      alert(`Erro: Estoque insuficiente! (${product.stockQuantity.toLocaleString('pt-BR')} disponiveis)`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, cartQuantity: Number((item.cartQuantity + 1).toFixed(2)) }
          : item
      ));
    } else {
      setCart([...cart, { ...product, cartQuantity: 1 }]);
    }
  };

  const removeFromCart = (id: Product['id']) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartQuantity = (id: Product['id'], delta: number | string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (!existing) return prev;

      let newQty: number;
      if (typeof delta === 'string') {
        if (delta === '') {
          newQty = 0;
        } else {
          newQty = parseFloat(delta);
          if (isNaN(newQty)) return prev;
        }
      } else {
        newQty = Number((existing.cartQuantity + delta).toFixed(2));
      }

      if (newQty < 0) return prev;
      
      const productSource = products.find(p => p.id === id);
      if (newQty > (productSource?.stockQuantity || 0)) {
        alert(`Estoque insuficiente! Disponivel: ${productSource?.stockQuantity.toLocaleString('pt-BR')}`);
        return prev;
      }

      return prev.map(item => item.id === id ? { ...item, cartQuantity: newQty } : item);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  
  const discountAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
      if (item.allowDiscount === false) return sum;
      const maxAllowed = item.maxDiscountPercent ?? 100;
      const effectivePercent = Math.min(discountPercent, maxAllowed);
      return sum + (item.price * item.cartQuantity * (effectivePercent / 100));
    }, 0);
  }, [cart, discountPercent]);

  const hasDiscountRestrictions = useMemo(() => {
    return cart.some(item => item.allowDiscount === false || (item.maxDiscountPercent !== undefined && item.maxDiscountPercent < 100));
  }, [cart]);

  const finalTotal = cartTotal - discountAmount;

  const validateSale = () => {
    if (!selectedCustomer) {
      alert("Selecione um cliente para continuar.");
      return false;
    }
    if (cart.length === 0) {
      alert("O carrinho está vazio.");
      return false;
    }
    if (cart.some(item => item.cartQuantity <= 0)) {
      alert("Existem itens com quantidade zero no carrinho. Ajuste ou remova-os.");
      return false;
    }
    if (isDelivery) {
      if (!deliveryDate) {
        alert("Informe a data da entrega.");
        return false;
      }
      if (!deliveryAddress || deliveryAddress.trim().length < 5) {
        alert("Informe um endereço de entrega válido.");
        return false;
      }
      if (!deliveryPhone) {
        alert("Informe um telefone de contato para a entrega.");
        return false;
      }
    }
    return true;
  };

  const handleFinishSale = async () => {
    if (!validateSale() || !currentUser || isProcessing) return;

    setIsProcessing(true);
    try {
      const saleId = `SALE-${Date.now()}`;
      const newSale: Sale = {
        id: saleId,
        customerId: selectedCustomer!.id,
        customerName: selectedCustomer!.name,
        date: new Date().toISOString(),
        subtotal: cartTotal,
        discount: discountAmount,
        total: finalTotal,
        paymentMethod: paymentMethod,
        sellerUsername: currentUser.username,
        isDelivery: isDelivery
      };
      if (isDelivery) {
        newSale.deliveryDate = deliveryDate;
        newSale.deliveryAddress = deliveryAddress;
        newSale.deliveryPhone = deliveryPhone;
      }
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
    } catch (error: any) {
      console.error("Erro ao finalizar venda:", error);
      alert("Ocorreu um erro ao salvar a venda.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateBudget = async () => {
    if (!selectedCustomer || !currentUser || isProcessing) return;

    setIsProcessing(true);
    try {
      const budgetId = `BUDGET-${Date.now()}`;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);

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
    } catch (error: any) {
      alert("Erro ao gerar orçamento.");
    } finally {
      setIsProcessing(false);
    }
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
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all text-sm font-medium"
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
                      ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/20' 
                      : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${selectedCustomer?.id === c.id ? 'bg-brand-primary/20' : 'bg-gray-100'}`}>
                        <User size={20} className={selectedCustomer?.id === c.id ? 'text-brand-primary' : 'text-gray-400'} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{c.name}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase">{c.phone}</div>
                      </div>
                    </div>
                    {selectedCustomer?.id === c.id && <CheckCircle2 size={20} className="text-brand-primary" />}
                  </button>
                ))
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 font-bold uppercase">Nenhum cliente encontrado</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                setSelectedCustomer({ id: '0', name: 'Consumidor Final', phone: '(00) 00000-0000' } as Customer);
                setStep(SaleStep.ADD_PRODUCTS);
              }}
              className="w-full py-4 text-xs font-black text-brand-primary bg-white rounded-2xl border border-brand-primary/20 uppercase tracking-widest shadow-sm"
            >
              Consumidor Final (Venda Rápida)
            </button>
          </div>
        );

      case SaleStep.ADD_PRODUCTS:
        return (
          <div className="flex flex-col h-full bg-brand-bg">
            {isScannerOpen && (
              <SmartScanner mode="sale" onClose={() => setIsScannerOpen(false)} onDetected={(data) => {
                const matched = products.find(p => p.name.toLowerCase().includes(data.name.toLowerCase()));
                if (matched) addToCart(matched);
                else alert(`Produto não encontrado: ${data.name}`);
              }} />
            )}
            <div className="bg-white p-4 border-b border-gray-200 space-y-3 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(SaleStep.SELECT_CUSTOMER)} className="text-brand-primary flex items-center gap-1 font-semibold text-sm">
                  <ChevronLeft size={16} /> {selectedCustomer?.name.split(' ')[0]}
                </button>
                <div className="text-xs font-bold text-gray-400 uppercase">Itens: {cart.reduce((a, b) => a + (b.cartQuantity || 0), 0).toLocaleString('pt-BR')}</div>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Buscar produtos..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button onClick={() => setIsScannerOpen(true)} className="bg-brand-primary text-white p-2.5 rounded-xl">
                  <Camera size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-40 no-scrollbar">
              {filteredProducts.map(product => {
                const inCart = cart.find(item => item.id === product.id);
                return (
                  <div key={product.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 text-sm">{product.name}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-brand-primary font-bold">R$ {product.price.toFixed(2)}</div>
                        {product.allowDiscount === false && (
                          <span className="text-[7px] bg-red-50 text-red-500 font-black px-1 rounded-sm uppercase">Fixo</span>
                        )}
                      </div>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-2 bg-brand-primary/5 p-1 rounded-xl">
                        <button 
                          onClick={() => {
                            if (inCart.cartQuantity <= 1) removeFromCart(product.id);
                            else updateCartQuantity(product.id, -1);
                          }} 
                          className="w-8 h-8 flex items-center justify-center bg-white text-brand-primary rounded-lg shadow-sm"
                        >
                          {inCart.cartQuantity <= 1 ? <Trash2 size={14} className="text-red-500" /> : <Minus size={14} />}
                        </button>
                        <input 
                          type="number"
                          step="0.01"
                          className="w-12 text-center font-black text-brand-primary bg-transparent border-b border-brand-primary/30 outline-none text-xs"
                          value={inCart.cartQuantity === 0 ? '' : inCart.cartQuantity}
                          onChange={(e) => updateCartQuantity(product.id, e.target.value)}
                        />
                        <button onClick={() => updateCartQuantity(product.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white text-brand-primary rounded-lg shadow-sm"><Plus size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(product)} disabled={product.stockQuantity <= 0} className="p-3 bg-brand-primary text-white rounded-xl disabled:opacity-30 active:scale-95 transition-all">
                        <Plus size={20} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto p-4 pointer-events-none">
              <div className="bg-brand-primary rounded-[2rem] shadow-2xl p-4 text-white flex items-center justify-between pointer-events-auto border border-white/10">
                <div className="ml-4">
                  <div className="text-[10px] opacity-70 font-black uppercase">Total</div>
                  <div className="text-2xl font-black">R$ {cartTotal.toFixed(2)}</div>
                </div>
                <button 
                  onClick={() => cart.length > 0 && setStep(SaleStep.CONFIRMATION)}
                  className="px-8 py-4 bg-brand-action text-brand-black rounded-2xl font-black flex items-center gap-2 active:scale-95 transition-all shadow-lg"
                >
                  Próximo <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        );

      case SaleStep.CONFIRMATION:
        return (
          <div className="p-4 space-y-4 pb-24">
            <button onClick={() => setStep(SaleStep.ADD_PRODUCTS)} className="text-brand-primary flex items-center gap-1 font-black text-xs uppercase bg-white border border-brand-primary/10 px-4 py-2 rounded-full shadow-sm">
              <ChevronLeft size={16} /> Voltar aos Itens
            </button>
            
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary"><User size={20} /></div>
                <div>
                  <div className="text-[10px] text-gray-400 font-black uppercase">Cliente</div>
                  <div className="font-black text-gray-800">{selectedCustomer?.name}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Modalidade</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsDelivery(false)}
                    className={`flex-1 py-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${!isDelivery ? 'bg-brand-primary text-white border-brand-primary shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                  >
                    <CheckCircle2 size={20} /> <span className="text-[10px] font-black uppercase">Retirada</span>
                  </button>
                  <button 
                    onClick={() => setIsDelivery(true)}
                    className={`flex-1 py-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${isDelivery ? 'bg-brand-primary text-white border-brand-primary shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                  >
                    <Truck size={20} /> <span className="text-[10px] font-black uppercase">Entrega</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-4">
                <div className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Pagamento</div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setPaymentMethod('pix'); }} className={`py-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${paymentMethod === 'pix' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-50 text-gray-400'}`}>
                    <QrCode size={18} /> <span className="text-[9px] font-black uppercase">PIX</span>
                  </button>
                  <button onClick={() => { setPaymentMethod('dinheiro'); }} className={`py-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${paymentMethod === 'dinheiro' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-50 text-gray-400'}`}>
                    <span className="text-lg font-bold">R$</span> <span className="text-[9px] font-black uppercase">Dinheiro</span>
                  </button>
                  <button onClick={() => { setPaymentMethod('cartao'); }} className={`py-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${paymentMethod === 'cartao' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-50 text-gray-400'}`}>
                    <CreditCard size={18} /> <span className="text-[9px] font-black uppercase">Cartão</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-dashed border-gray-100 space-y-2">
                <div className="flex justify-between items-center text-gray-400">
                  <span className="text-[10px] font-black uppercase">Subtotal</span>
                  <span className="font-bold">R$ {cartTotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <div className="flex items-center gap-1">
                      <TrendingDown size={14} />
                      <span className="text-[10px] font-black uppercase">Desconto</span>
                    </div>
                    <span className="font-bold">- R$ {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-2">
                  <div>
                    <div className="text-[10px] text-gray-400 font-black uppercase">Total Líquido</div>
                    <div className="font-black text-4xl text-gray-900 tracking-tighter">R$ {finalTotal.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleFinishSale}
              disabled={isProcessing}
              className={`w-full text-brand-black font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95 transition-all ${isProcessing ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand-action shadow-brand-action/20'}`}
            >
              {isProcessing ? (
                <>Processando... <Loader2 className="animate-spin" size={20} /></>
              ) : (
                <>Finalizar Venda <CheckCircle2 size={20} /></>
              )}
            </button>
            
            <button 
              onClick={handleGenerateBudget}
              disabled={isProcessing}
              className={`w-full text-brand-primary font-black py-5 rounded-3xl border-2 border-brand-primary/20 flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95 transition-all ${isProcessing ? 'opacity-50' : 'bg-white shadow-sm'}`}
            >
              {isProcessing ? 'Gerando...' : <>Gerar Orçamento <FileText size={20} /></>}
            </button>
          </div>
        );

      case SaleStep.FINISHED:
        return (
          <div className="p-4 flex flex-col items-center justify-center min-h-[70vh] space-y-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-green-100 text-green-600 animate-bounce`}>
              <CheckCircle2 size={56} />
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-black text-gray-800">Concluído!</h2>
              <p className="text-gray-500 font-medium">O registro foi salvo com sucesso.</p>
            </div>
            {lastId && <Receipt saleId={lastId} isBudget={isBudgetMode} initialType={isDelivery ? 'delivery' : 'fiscal'} />}
            <button onClick={isBudgetMode ? onBudgetComplete : onComplete} className="w-full bg-brand-primary text-white font-black py-5 rounded-[2rem] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-brand-primary/20">Voltar ao Início</button>
          </div>
        );
    }
  };

  return <div className="h-full bg-brand-bg">{renderStep()}</div>;
};

export default NewSale;
