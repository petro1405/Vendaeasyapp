
export interface User {
  username: string;
  name: string;
  role: 'admin' | 'vendedor';
}

export interface ShopInfo {
  id: number;
  name: string;
  cnpj: string;
  phone: string;
  address: string;
  logo?: string; // Base64 image string
  pdvName?: string;
  receiptMessage?: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  costPrice?: number;
  stockQuantity: number;
  category: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

export interface Sale {
  id: string;
  customerId: number;
  customerName: string;
  date: string;
  total: number;
  sellerUsername: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Budget {
  id: string;
  customerId: number;
  customerName: string;
  date: string;
  total: number;
  validUntil: string;
  sellerUsername: string;
}

export interface BudgetItem {
  id: string;
  budgetId: string;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface CartItem extends Product {
  cartQuantity: number;
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  INVENTORY = 'inventory',
  NEW_SALE = 'new_sale',
  BUDGETS = 'budgets',
  HISTORY = 'history',
  SETTINGS = 'settings'
}

export type ReceiptType = 'fiscal' | 'delivery' | 'payment';
