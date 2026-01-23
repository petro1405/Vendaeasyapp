
import { 
  auth, 
  firestore,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot
} from "./firebase";
import { Product, Customer, Sale, SaleItem, ShopInfo, Budget, BudgetItem, User } from './types';

const COLLECTIONS = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  SALES: 'sales',
  BUDGETS: 'budgets',
  SHOP_INFO: 'shop_info',
  USERS: 'users'
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

export const db = {
  // --- AUTH ---
  login: async (email: string, pass: string): Promise<User | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, userCredential.user.uid));
      if (userDoc.exists()) {
        return userDoc.data() as User;
      }
      return null;
    } catch (error) {
      console.error("Erro no login Firebase:", error);
      throw error;
    }
  },

  registerUser: async (userData: any): Promise<{ success: boolean, message: string }> => {
    try {
      const sanitizedUsername = userData.username.trim().toLowerCase().replace(/\s+/g, '');
      const email = `${sanitizedUsername}@venda-easy.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, userData.password);
      const newUser: User = {
        username: sanitizedUsername,
        name: userData.name,
        role: userData.role,
        uid: userCredential.user.uid
      };
      await updateProfile(userCredential.user, { displayName: userData.name });
      await setDoc(doc(firestore, COLLECTIONS.USERS, userCredential.user.uid), newUser);
      return { success: true, message: 'Usuário cadastrado com sucesso!' };
    } catch (error: any) {
      console.error("Erro no registro:", error);
      return { success: false, message: error.message };
    }
  },

  logout: async () => {
    await signOut(auth);
  },

  getAuthUser: (): Promise<User | null> => {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, firebaseUser.uid));
            resolve(userDoc.exists() ? (userDoc.data() as User) : null);
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  },

  // --- REAL-TIME LISTENERS (CLOUD SYNC) ---
  subscribeProducts: (callback: (products: Product[]) => void) => {
    const q = query(collection(firestore, COLLECTIONS.PRODUCTS), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      callback(prods);
    });
  },

  subscribeSales: (callback: (sales: Sale[]) => void, sellerUsername?: string) => {
    let q = query(collection(firestore, COLLECTIONS.SALES), orderBy('date', 'desc'));
    if (sellerUsername) {
      q = query(collection(firestore, COLLECTIONS.SALES), where('sellerUsername', '==', sellerUsername), orderBy('date', 'desc'));
    }
    return onSnapshot(q, (snapshot) => {
      const sales = snapshot.docs.map(doc => doc.data() as Sale);
      callback(sales);
    });
  },

  subscribeBudgets: (callback: (budgets: Budget[]) => void, sellerUsername?: string) => {
    let q = query(collection(firestore, COLLECTIONS.BUDGETS), orderBy('date', 'desc'));
    if (sellerUsername) {
      q = query(collection(firestore, COLLECTIONS.BUDGETS), where('sellerUsername', '==', sellerUsername), orderBy('date', 'desc'));
    }
    return onSnapshot(q, (snapshot) => {
      const budgets = snapshot.docs.map(doc => doc.data() as Budget);
      callback(budgets);
    });
  },

  // --- SHOP INFO ---
  getShopInfo: async (): Promise<ShopInfo> => {
    const shopDoc = await getDoc(doc(firestore, COLLECTIONS.SHOP_INFO, 'main'));
    return shopDoc.exists() ? (shopDoc.data() as ShopInfo) : DEFAULT_SHOP_INFO;
  },

  saveShopInfo: async (info: ShopInfo) => {
    await setDoc(doc(firestore, COLLECTIONS.SHOP_INFO, 'main'), info);
  },

  // --- ACTIONS ---
  addProduct: async (product: Omit<Product, 'id'>) => {
    await addDoc(collection(firestore, COLLECTIONS.PRODUCTS), product);
  },

  updateProductStock: async (id: string | number, quantity: number) => {
    const prodRef = doc(firestore, COLLECTIONS.PRODUCTS, String(id));
    await updateDoc(prodRef, { stockQuantity: quantity });
  },

  getProducts: async (): Promise<Product[]> => {
    const q = query(collection(firestore, COLLECTIONS.PRODUCTS), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
  },

  getSales: async (sellerUsername?: string): Promise<Sale[]> => {
    let q = query(collection(firestore, COLLECTIONS.SALES), orderBy('date', 'desc'));
    if (sellerUsername) {
      q = query(collection(firestore, COLLECTIONS.SALES), where('sellerUsername', '==', sellerUsername), orderBy('date', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Sale);
  },

  getSaleItems: async (saleId: string): Promise<SaleItem[]> => {
    const saleDoc = await getDoc(doc(firestore, COLLECTIONS.SALES, saleId));
    if (saleDoc.exists()) {
      return (saleDoc.data() as Sale).items || [];
    }
    return [];
  },

  createSale: async (sale: Sale, items: SaleItem[]) => {
    await setDoc(doc(firestore, COLLECTIONS.SALES, sale.id), { ...sale, items });
    for (const item of items) {
      const prodRef = doc(firestore, COLLECTIONS.PRODUCTS, String(item.productId));
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const currentQty = prodSnap.data().stockQuantity;
        await updateDoc(prodRef, { stockQuantity: currentQty - item.quantity });
      }
    }
  },

  getBudgets: async (sellerUsername?: string): Promise<Budget[]> => {
    let q = query(collection(firestore, COLLECTIONS.BUDGETS), orderBy('date', 'desc'));
    if (sellerUsername) {
      q = query(collection(firestore, COLLECTIONS.BUDGETS), where('sellerUsername', '==', sellerUsername), orderBy('date', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Budget);
  },

  getBudgetItems: async (budgetId: string): Promise<BudgetItem[]> => {
    const budgetDoc = await getDoc(doc(firestore, COLLECTIONS.BUDGETS, budgetId));
    if (budgetDoc.exists()) {
      return (budgetDoc.data() as Budget).items || [];
    }
    return [];
  },

  createBudget: async (budget: Budget, items: BudgetItem[]) => {
    await setDoc(doc(firestore, COLLECTIONS.BUDGETS, budget.id), { ...budget, items });
  },

  deleteBudget: async (id: string) => {
    await deleteDoc(doc(firestore, COLLECTIONS.BUDGETS, id));
  },

  getTopSellingProducts: (products: Product[], limit: number): Product[] => {
    // Simulando baseada no menor estoque (itens que saíram mais)
    return [...products].sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, limit);
  },

  getUsers: async (): Promise<User[]> => {
    const q = query(collection(firestore, COLLECTIONS.USERS));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as User);
  }
};
