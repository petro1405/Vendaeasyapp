
import React, { useState, useEffect } from 'react';
import { AppTab, Product, Sale, Customer, Budget, User } from './types.ts';
import { db } from './db.ts';
import { auth, onAuthStateChanged, firestore, doc, getDoc } from './firebase.ts';
import Dashboard from './screens/Dashboard.tsx';
import Inventory from './screens/Inventory.tsx';
import NewSale from './screens/NewSale.tsx';
import SalesHistory from './screens/SalesHistory.tsx';
import Budgets from './screens/Budgets.tsx';
import Settings from './screens/Settings.tsx';
import Login from './screens/Login.tsx';
import { LayoutDashboard, Package, ShoppingCart, History, FileText, Settings as SettingsIcon, Cloud, Check } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    let unsubProds: any;
    let unsubSales: any;
    let unsubBudgets: any;

    // REAL-TIME AUTH LISTENER
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[Auth] Estado alterado:", firebaseUser ? "Logado" : "Deslogado");
      
      if (firebaseUser) {
        try {
          // Busca dados do usuário no Firestore
          const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setCurrentUser(userData);
            
            // Inicia os listeners de dados
            unsubProds = db.subscribeProducts((prods) => {
              setProducts(prods);
              setIsSynced(true);
            });

            unsubSales = db.subscribeSales((sles) => {
              setSales(sles);
            }, userData.role === 'vendedor' ? userData.username : undefined);

            unsubBudgets = db.subscribeBudgets((bdgts) => {
              setBudgets(bdgts);
            }, userData.role === 'vendedor' ? userData.username : undefined);
          } else {
            console.error("[Auth] Usuário logado mas documento não encontrado no Firestore");
            setCurrentUser(null);
          }
        } catch (e) {
          console.error("[Auth] Erro ao carregar perfil:", e);
          setCurrentUser(null);
        }
      } else {
        // Limpa tudo se deslogar
        setCurrentUser(null);
        if (unsubProds) unsubProds();
        if (unsubSales) unsubSales();
        if (unsubBudgets) unsubBudgets();
        setIsSynced(false);
      }
      
      setIsInitializing(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubProds) unsubProds();
      if (unsubSales) unsubSales();
      if (unsubBudgets) unsubBudgets();
    };
  }, []);

  const handleConvertToSale = (budget: Budget) => {
    setActiveTab(AppTab.NEW_SALE);
  };

  const handleLogout = async () => {
    await db.logout();
    setCurrentUser(null);
  };

  if (isInitializing) {
    return (
      <div className="h-screen bg-indigo-600 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white font-black text-xs uppercase tracking-widest animate-pulse">Conectando à Nuvem...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={() => {}} />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case AppTab.DASHBOARD:
        return <Dashboard products={products} sales={sales} budgets={budgets} />;
      case AppTab.INVENTORY:
        return <Inventory products={products} onUpdate={() => {}} currentUser={currentUser} />;
      case AppTab.NEW_SALE:
        return (
          <NewSale 
            products={products} 
            customers={[{id: 1, name: 'Consumidor Final', phone: '(00) 00000-0000'}]} 
            currentUser={currentUser}
            onComplete={() => setActiveTab(AppTab.HISTORY)} 
            onBudgetComplete={() => setActiveTab(AppTab.BUDGETS)}
          />
        );
      case AppTab.BUDGETS:
        return <Budgets budgets={budgets} onUpdate={() => {}} onConvertToSale={handleConvertToSale} />;
      case AppTab.HISTORY:
        return <SalesHistory sales={sales} />;
      case AppTab.SETTINGS:
        return <Settings onUpdate={() => {}} onLogout={handleLogout} />;
      default:
        return <Dashboard products={products} sales={sales} budgets={budgets} />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl overflow-hidden border-x border-gray-100">
      <header className="bg-indigo-600 text-white p-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab(AppTab.DASHBOARD)}>
            <span className="bg-white text-indigo-600 p-1 rounded-md">V</span>
            VendaEasy
          </h1>
          <div className="flex items-center gap-1 mt-0.5">
            {isSynced ? <Check size={10} className="text-green-400" /> : <Cloud size={10} className="text-indigo-300 animate-pulse" />}
            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-200">
              {isSynced ? 'Estoque na Nuvem' : 'Sincronizando...'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[9px] font-bold bg-white/10 px-2 py-1 rounded-lg">
            {currentUser.name.split(' ')[0]}
          </div>
          <button 
            onClick={() => setActiveTab(AppTab.SETTINGS)}
            className={`p-2 rounded-xl transition-all ${activeTab === AppTab.SETTINGS ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white hover:bg-indigo-400'}`}
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 bg-slate-50">
        {renderScreen()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 flex justify-around items-center p-2 z-20 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <NavButton active={activeTab === AppTab.DASHBOARD} onClick={() => setActiveTab(AppTab.DASHBOARD)} icon={<LayoutDashboard size={18} />} label="Início" />
        <NavButton active={activeTab === AppTab.INVENTORY} onClick={() => setActiveTab(AppTab.INVENTORY)} icon={<Package size={18} />} label="Estoque" />
        <NavButton active={activeTab === AppTab.NEW_SALE} onClick={() => setActiveTab(AppTab.NEW_SALE)} icon={<ShoppingCart size={18} />} label="Vender" />
        <NavButton active={activeTab === AppTab.BUDGETS} onClick={() => setActiveTab(AppTab.BUDGETS)} icon={<FileText size={18} />} label="Orçam." />
        <NavButton active={activeTab === AppTab.HISTORY} onClick={() => setActiveTab(AppTab.HISTORY)} icon={<History size={18} />} label="Vendas" />
      </nav>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full transition-all duration-200 ${active ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
    <div className={`p-1.5 rounded-2xl ${active ? 'bg-indigo-50' : ''}`}>{icon}</div>
    <span className={`text-[8px] mt-0.5 uppercase tracking-tighter font-black ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);

export default App;
