
import { Product, Customer, Sale, SaleItem, ShopInfo, Budget, BudgetItem, User } from './types';

interface StoredUser extends User {
  password: string;
}

const STORAGE_KEYS = {
  PRODUCTS: 've_products',
  CUSTOMERS: 've_customers',
  SALES: 've_sales',
  SALE_ITEMS: 've_sale_items',
  BUDGETS: 've_budgets',
  BUDGET_ITEMS: 've_budget_items',
  SHOP_INFO: 've_shop_info',
  AUTH_USER: 've_auth_user',
  USERS: 've_registered_users'
};

const DEFAULT_SHOP_INFO: ShopInfo = {
  id: 1,
  name: "Deposito ConstruFacil",
  cnpj: "12.345.678/0001-99",
  phone: "(11) 98765-4321",
  address: "Av. das Industrias, 500 - Distrito Industrial",
  pdvName: "PDV-01",
  receiptMessage: "Obrigado pela preferencia! Guarde este recibo."
};

const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: "Cimento CP-II Todas as Obras (50kg)", price: 42.90, stockQuantity: 150, category: "Basicos" },
  { id: 2, name: "Areia Fina Lavada (m3)", price: 95.00, stockQuantity: 20, category: "Basicos" },
  { id: 3, name: "Tijolo Baiano 9 Furos (Milheiro)", price: 850.00, stockQuantity: 5, category: "Alvenaria" },
  { id: 4, name: "Tubo PVC Esgoto 100mm (6m)", price: 38.50, stockQuantity: 45, category: "Hidraulica" },
  { id: 5, name: "Vergalhao CA-50 8.0mm (12m)", price: 54.00, stockQuantity: 80, category: "Ferragens" },
  { id: 6, name: "Argamassa AC-I Interior (20kg)", price: 18.90, stockQuantity: 200, category: "Acabamento" },
  { id: 7, name: "Piso Ceramico 60x60 (m2)", price: 32.90, stockQuantity: 120, category: "Acabamento" },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 1, name: "Ricardo Empreiteiro", phone: "11999999999" },
  { id: 2, name: "Ana Maria (Reforma)", phone: "11888888888" },
  { id: 3, name: "Consumidor Final", phone: "00000000000" },
];

export const db = {
  getUsers: (): StoredUser[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      const defaultUsers: StoredUser[] = [
        { username: 'admin', name: 'Administrador', role: 'admin', password: 'admin' },
        { username: 'vendedor', name: 'Vendedor Loja', role: 'vendedor', password: '123' }
      ];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    return JSON.parse(data);
  },

  registerUser: (newUser: StoredUser): { success: boolean, message: string } => {
    const users = db.getUsers();
    if (users.find(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
      return { success: false, message: 'Este nome de usuario ja esta em uso.' };
    }
    const updatedUsers = [...users, newUser];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    return { success: true, message: 'Usuario cadastrado com sucesso!' };
  },

  login: (username: string, password: string): User | null => {
    const users = db.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
    if (user) {
      const { password, ...userWithoutPassword } = user;
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(userWithoutPassword));
      return userWithoutPassword;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  },

  getAuthUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return data ? JSON.parse(data) : null;
  },

  getShopInfo: (): ShopInfo => {
    const data = localStorage.getItem(STORAGE_KEYS.SHOP_INFO);
    return data ? JSON.parse(data) : DEFAULT_SHOP_INFO;
  },

  saveShopInfo: (info: ShopInfo) => {
    localStorage.setItem(STORAGE_KEYS.SHOP_INFO, JSON.stringify(info));
  },

  getProducts: (): Product[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(data);
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  getTopSellingProducts: (limit: number): Product[] => {
    const itemsData = localStorage.getItem(STORAGE_KEYS.SALE_ITEMS);
    const allItems: SaleItem[] = itemsData ? JSON.parse(itemsData) : [];
    const counts: Record<number, number> = {};
    
    allItems.forEach(item => {
      counts[item.productId] = (counts[item.productId] || 0) + item.quantity;
    });

    const sortedIds = Object.keys(counts)
      .map(Number)
      .sort((a, b) => counts[b] - counts[a]);
    
    const products = db.getProducts();
    return sortedIds
      .slice(0, limit)
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => !!p);
  },

  addProduct: (product: Omit<Product, 'id'>) => {
    const products = db.getProducts();
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProduct: Product = { ...product, id: newId };
    db.saveProducts([...products, newProduct]);
  },

  updateProductStock: (id: number, quantity: number) => {
    const products = db.getProducts();
    const updated = products.map(p => p.id === id ? { ...p, stockQuantity: quantity } : p);
    db.saveProducts(updated);
  },

  getCustomers: (): Customer[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    return JSON.parse(data);
  },

  getSales: (): Sale[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SALES);
    const sales: Sale[] = data ? JSON.parse(data) : [];
    const currentUser = db.getAuthUser();
    
    if (currentUser?.role === 'vendedor') {
      return sales.filter(s => s.sellerUsername === currentUser.username);
    }
    return sales;
  },

  getSaleItems: (saleId: string): SaleItem[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SALE_ITEMS);
    const items: SaleItem[] = data ? JSON.parse(data) : [];
    return items.filter(item => item.saleId === saleId);
  },

  getBudgets: (): Budget[] => {
    const data = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    const budgets: Budget[] = data ? JSON.parse(data) : [];
    const currentUser = db.getAuthUser();

    if (currentUser?.role === 'vendedor') {
      return budgets.filter(b => b.sellerUsername === currentUser.username);
    }
    return budgets;
  },

  getBudgetItems: (budgetId: string): BudgetItem[] => {
    const data = localStorage.getItem(STORAGE_KEYS.BUDGET_ITEMS);
    const items: BudgetItem[] = data ? JSON.parse(data) : [];
    return items.filter(item => item.budgetId === budgetId);
  },

  createSale: (sale: Sale, items: SaleItem[]) => {
    const sales = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || '[]');
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([sale, ...sales]));

    const allItems = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALE_ITEMS) || '[]');
    localStorage.setItem(STORAGE_KEYS.SALE_ITEMS, JSON.stringify([...items, ...allItems]));

    const products = db.getProducts();
    const updatedProducts = products.map(p => {
      const soldItem = items.find(item => item.productId === p.id);
      if (soldItem) {
        return { ...p, stockQuantity: p.stockQuantity - soldItem.quantity };
      }
      return p;
    });
    db.saveProducts(updatedProducts);
  },

  createBudget: (budget: Budget, items: BudgetItem[]) => {
    const budgets = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS) || '[]');
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify([budget, ...budgets]));

    const allItems = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGET_ITEMS) || '[]');
    localStorage.setItem(STORAGE_KEYS.BUDGET_ITEMS, JSON.stringify([...items, ...allItems]));
  },

  deleteBudget: (id: string) => {
    const budgets = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS) || '[]')
      .filter((b: any) => b.id !== id);
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGET_ITEMS) || '[]')
      .filter((item: BudgetItem) => item.budgetId !== id);
    
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    localStorage.setItem(STORAGE_KEYS.BUDGET_ITEMS, JSON.stringify(items));
  }
};
