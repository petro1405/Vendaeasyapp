
import React, { useState, useEffect } from 'react';
import { AppTab, Product, Sale, Customer, Budget, User } from './types.ts';
import { db } from './db.ts';
import Dashboard from './screens/Dashboard.tsx';
import Inventory from './screens/Inventory.tsx';
import NewSale from './screens/NewSale.tsx';
import SalesHistory from './screens/SalesHistory.tsx';
import Budgets from './screens/Budgets.tsx';
import Settings from './screens/Settings.tsx';
import Login from './screens/Login.tsx';
import { LayoutDashboard, Package, ShoppingCart, History, FileText, Settings as SettingsIcon } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  const refreshData = async () => {
    const user = await db.getAuthUser();
    setCurrentUser(user);
    
    if (user) {
      const [prods, sles, bdgts] = await Promise.all([
        db.getProducts(),
        db.getSales(user.role === 'vendedor' ? user.username : undefined),
        db.getBudgets(user.role === 'vendedor' ? user.username : undefined)
      ]);
      setProducts(prods);
      setSales(sles);
      setBudgets(bdgts);
    }
    setIsInitializing(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleConvertToSale = (budget: Budget) => {
    // Lógica para preencher o carrinho seria necessária aqui
    setActiveTab(AppTab.NEW_SALE);
  };

  const handleLogout = async () => {
    await db.logout();
    setCurrentUser(null);
    refreshData();
  };

  if (isInitializing) {
    return (
      <div className="h-screen bg-indigo-600 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white font-black text-xs uppercase tracking-widest animate-pulse">Autenticando...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={refreshData} />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case AppTab.DASHBOARD:
        return <Dashboard products={products} sales={sales} budgets={budgets} />;
      case AppTab.INVENTORY:
        return <Inventory products={products} onUpdate={refreshData} currentUser={currentUser} />;
      case AppTab.NEW_SALE:
        return (
          <NewSale 
            products={products} 
            customers={[]} // Ajustar busca de clientes Firestore se necessário
            currentUser={currentUser}
            onComplete={() => {
              refreshData();
              setActiveTab(AppTab.HISTORY);
            }} 
            onBudgetComplete={() => {
              refreshData();
              setActiveTab(AppTab.BUDGETS);
            }}
          />
        );
      case AppTab.BUDGETS:
        return <Budgets budgets={budgets} onUpdate={refreshData} onConvertToSale={handleConvertToSale} />;
      case AppTab.HISTORY:
        return <SalesHistory sales={sales} />;
      case AppTab.SETTINGS:
        return <Settings onUpdate={refreshData} onLogout={handleLogout} />;
      default:
        return <Dashboard products={products} sales={sales} budgets={budgets} />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl overflow-hidden border-x border-gray-100">
      <header className="bg-indigo-600 text-white p-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <h1 className="text-xl font-bold flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab(AppTab.DASHBOARD)}>
          <span className="bg-white text-indigo-600 p-1 rounded-md">V</span>
          VendaEasy
        </h1>
        <div className="flex items-center gap-3">
          <div className="text-[9px] font-bold bg-white/10 px-2 py-1 rounded-lg">
            {currentUser.name.split(' ')[0]} ({currentUser.role})
          </div>
          <button 
            onClick={() => setActiveTab(AppTab.SETTINGS)}
            className={`p-2 rounded-xl transition-all ${activeTab === AppTab.SETTINGS ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white hover:bg-indigo-400'}`}
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-20">
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
