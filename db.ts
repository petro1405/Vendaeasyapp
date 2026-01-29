
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
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Product, Customer, Sale, SaleItem, ShopInfo, Budget, BudgetItem, User, PasswordResetRequest } from './types';

const COLLECTIONS = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  SALES: 'sales',
  BUDGETS: 'budgets',
  SHOP_INFO: 'shop_info',
  USERS: 'users',
  RESET_REQUESTS: 'password_resets'
};

const DEFAULT_SHOP_INFO: ShopInfo = {
  id: 1,
  name: "Depósito ConstruFácil",
  cnpj: "12.345.678/0001-99",
  phone: "(11) 98765-4321",
  address: "Av. das Indústrias, 500 - Distrito Industrial",
  pdvName: "PDV-01",
  receiptMessage: "Obrigado pela preferência! Guarde este recibo."
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
        role: userData.role || 'vendedor',
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

  changePassword: async (currentPass: string, newPass: string): Promise<{ success: boolean, message: string }> => {
    const user = auth.currentUser;
    if (!user || !user.email) return { success: false, message: "Usuário não autenticado" };
    
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPass);
      return { success: true, message: "Senha alterada com sucesso!" };
    } catch (error: any) {
      console.error("Erro ao mudar senha:", error);
      return { success: false, message: "Senha atual incorreta ou erro de rede." };
    }
  },

  requestPasswordReset: async (username: string): Promise<{ success: boolean, message: string }> => {
    try {
      const sanitizedUsername = username.trim().toLowerCase();
      const q = query(collection(firestore, COLLECTIONS.USERS), where('username', '==', sanitizedUsername));
      const snap = await getDocs(q);
      
      if (snap.empty) return { success: false, message: "Usuário não encontrado." };
      
      const userData = snap.docs[0].data() as User;
      
      await addDoc(collection(firestore, COLLECTIONS.RESET_REQUESTS), {
        username: sanitizedUsername,
        name: userData.name,
        date: new Date().toISOString(),
        status: 'pending'
      });
      
      return { success: true, message: "Solicitação enviada ao administrador." };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  getResetRequests: async (): Promise<PasswordResetRequest[]> => {
    // Para evitar erro de índice composto, buscamos por data e filtramos o status em memória
    const q = query(collection(firestore, COLLECTIONS.RESET_REQUESTS), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as PasswordResetRequest))
      .filter(req => req.status === 'pending');
  },

  resolvePasswordReset: async (requestId: string, uid: string) => {
    await deleteDoc(doc(firestore, COLLECTIONS.USERS, uid));
    await updateDoc(doc(firestore, COLLECTIONS.RESET_REQUESTS, requestId), { status: 'resolved' });
  },

  updateUserRole: async (uid: string, newRole: 'admin' | 'vendedor') => {
    const userRef = doc(firestore, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, { role: newRole });
  },

  deleteUser: async (uid: string) => {
    const userRef = doc(firestore, COLLECTIONS.USERS, uid);
    await deleteDoc(userRef);
  },

  logout: async () => {
    await signOut(auth);
  },

  getAuthUser: (): Promise<User | null> => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        unsubscribe();
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

  // --- REAL-TIME LISTENERS ---
  subscribeProducts: (callback: (products: Product[]) => void) => {
    const q = query(collection(firestore, COLLECTIONS.PRODUCTS), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      callback(prods);
    });
  },

  subscribeCustomers: (callback: (customers: Customer[]) => void) => {
    const q = query(collection(firestore, COLLECTIONS.CUSTOMERS), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const custs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer));
      callback(custs);
    });
  },

  subscribeSales: (callback: (sales: Sale[]) => void, sellerUsername?: string) => {
    // Buscamos ordenado por data e filtramos em memória para evitar a necessidade de índice composto manual
    const q = query(collection(firestore, COLLECTIONS.SALES), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      let sales = snapshot.docs.map(doc => doc.data() as Sale);
      if (sellerUsername) {
        sales = sales.filter(s => s.sellerUsername === sellerUsername);
      }
      callback(sales);
    });
  },

  subscribeBudgets: (callback: (budgets: Budget[]) => void, sellerUsername?: string) => {
    // Seguindo o mesmo padrão para evitar erro de índice
    const q = query(collection(firestore, COLLECTIONS.BUDGETS), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      let budgets = snapshot.docs.map(doc => doc.data() as Budget);
      if (sellerUsername) {
        budgets = budgets.filter(b => b.sellerUsername === sellerUsername);
      }
      callback(budgets);
    });
  },

  // --- SHOP INFO ---
  getShopInfo: async (): Promise<ShopInfo> => {
    try {
      const shopDoc = await getDoc(doc(firestore, COLLECTIONS.SHOP_INFO, 'main'));
      return shopDoc.exists() ? (shopDoc.data() as ShopInfo) : DEFAULT_SHOP_INFO;
    } catch (e) {
      return DEFAULT_SHOP_INFO;
    }
  },

  saveShopInfo: async (info: ShopInfo) => {
    await setDoc(doc(firestore, COLLECTIONS.SHOP_INFO, 'main'), info);
  },

  // --- ACTIONS ---
  addProduct: async (product: Omit<Product, 'id'>) => {
    await addDoc(collection(firestore, COLLECTIONS.PRODUCTS), product);
  },

  updateProduct: async (id: string | number, data: Partial<Product>) => {
    const prodRef = doc(firestore, COLLECTIONS.PRODUCTS, String(id));
    await updateDoc(prodRef, data);
  },

  updateProductStock: async (id: string | number, quantity: number) => {
    const prodRef = doc(firestore, COLLECTIONS.PRODUCTS, String(id));
    await updateDoc(prodRef, { stockQuantity: quantity });
  },

  // CUSTOMERS
  addCustomer: async (customer: Omit<Customer, 'id'>) => {
    const docRef = await addDoc(collection(firestore, COLLECTIONS.CUSTOMERS), {
      ...customer,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  },

  updateCustomer: async (id: string, data: Partial<Customer>) => {
    const ref = doc(firestore, COLLECTIONS.CUSTOMERS, id);
    await updateDoc(ref, data);
  },

  deleteCustomer: async (id: string) => {
    await deleteDoc(doc(firestore, COLLECTIONS.CUSTOMERS, id));
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

  createBudget: async (budget: Budget, items: BudgetItem[]) => {
    await setDoc(doc(firestore, COLLECTIONS.BUDGETS, budget.id), { ...budget, items });
  },

  deleteBudget: async (id: string) => {
    await deleteDoc(doc(firestore, COLLECTIONS.BUDGETS, id));
  },

  getBudgetItems: async (budgetId: string): Promise<BudgetItem[]> => {
    const budgetDoc = await getDoc(doc(firestore, COLLECTIONS.BUDGETS, budgetId));
    if (budgetDoc.exists()) {
      return (budgetDoc.data() as Budget).items || [];
    }
    return [];
  },

  getSaleItems: async (saleId: string): Promise<SaleItem[]> => {
    const saleDoc = await getDoc(doc(firestore, COLLECTIONS.SALES, saleId));
    if (saleDoc.exists()) {
      return (saleDoc.data() as Sale).items || [];
    }
    return [];
  },

  getTopSellingProducts: (products: Product[], limit: number): Product[] => {
    return [...products].sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, limit);
  },

  getUsers: async (): Promise<User[]> => {
    const q = query(collection(firestore, COLLECTIONS.USERS));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as User);
  },

  // --- DATABASE MAINTENANCE ---
  resetDatabase: async () => {
    if (confirm("ATENÇÃO: Deseja realmente restaurar as configurações da loja e deslogar? Isso NÃO apagará as vendas do Firebase, mas limpa o cache local.")) {
      localStorage.clear();
      await db.logout();
      window.location.reload();
    }
  },

  // Função para exportar dados (JSON)
  exportData: async () => {
    const shopInfo = await db.getShopInfo();
    const products = await db.getProducts();
    const sales = await db.getSales();
    
    const exportObj = {
      shopInfo,
      products,
      sales,
      exportDate: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `venda_easy_backup_${new Date().getTime()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  },

  getProducts: async (): Promise<Product[]> => {
    const q = query(collection(firestore, COLLECTIONS.PRODUCTS), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
  },

  getSales: async (sellerUsername?: string): Promise<Sale[]> => {
    const q = query(collection(firestore, COLLECTIONS.SALES), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    let sales = snapshot.docs.map(doc => doc.data() as Sale);
    if (sellerUsername) {
      sales = sales.filter(s => s.sellerUsername === sellerUsername);
    }
    return sales;
  },

  getBudgets: async (sellerUsername?: string): Promise<Budget[]> => {
    const q = query(collection(firestore, COLLECTIONS.BUDGETS), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    let budgets = snapshot.docs.map(doc => doc.data() as Budget);
    if (sellerUsername) {
      budgets = budgets.filter(b => b.sellerUsername === sellerUsername);
    }
    return budgets;
  }
};
