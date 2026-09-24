export type Priority = "P1" | "P2" | "P3";
export type AppTab = "dashboard" | "products" | "expenses" | "incomes" | "finances" | "stores" | "searches";
export type SortDir = "asc" | "desc";

export interface Product {
  id: string;
  user_id?: string;
  name: string;
  category: string;
  priority: Priority;
  quantity: number;
  estimated_price: number;
  paid_price: number | null;
  bought: boolean;
  store: string;
  link: string;
  notes: string;
  created_at?: string;
}

export interface StoreRecord {
  id: string;
  user_id?: string;
  name: string;
  city: string;
  address: string;
  website: string;
  notes: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  user_id?: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  notes: string;
  created_at?: string;
}

export interface Income {
  id: string;
  user_id?: string;
  amount: number;
  description: string;
  source: string;
  date: string;
  notes: string;
  created_at?: string;
}

export interface PriceSearch {
  id: string;
  user_id?: string;
  product_name: string;
  store_name: string;
  price: number;
  url: string;
  notes: string;
  created_at?: string;
}

export interface AppSettings {
  id?: string;
  user_id: string;
  total_budget: number;
}
