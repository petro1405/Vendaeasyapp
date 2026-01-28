
export interface User {
  username: string;
  name: string;
  role: 'admin' | 'vendedor';
  uid?: string;
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
  id: string | number;
  name: string;
  price: number;
  costPrice?: number;
  stockQuantity: number;
  category: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  address?: string;
  createdAt?: string;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  total: number;
  subtotal?: number;
  discount?: number;
  paymentMethod?: string;
  sellerUsername: string;
  items?: SaleItem[];
  // Entrega
  isDelivery?: boolean;
  deliveryDate?: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string | number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Budget {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  total: number;
  validUntil: string;
  sellerUsername: string;
  items?: BudgetItem[];
}

export interface BudgetItem {
  id: string;
  budgetId: string;
  productId: string | number;
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
  CUSTOMERS = 'customers',
  NEW_SALE = 'new_sale',
  BUDGETS = 'budgets',
  HISTORY = 'history',
  SETTINGS = 'settings'
}

export type ReceiptType = 'fiscal' | 'delivery' | 'payment';
