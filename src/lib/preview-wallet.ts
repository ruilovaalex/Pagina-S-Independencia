import { sumMoney, today } from './finance.ts';
import type { Product } from '../app/types';
import { emptyNotebook, type Notebook } from './notebook.ts';

export interface Movement { id: string; amount: number; description: string; category: string; date: string; notes: string; productId?: string }
export interface PreviewWallet { opening: number; budget: number; incomes: Movement[]; expenses: Movement[]; notebook:Notebook }
export const initialWallet: PreviewWallet = { opening: 1200, budget: 1500, incomes: [], expenses: [], notebook:emptyNotebook };
export const cash = (value: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
export function homeExpenses(products: Product[]): Movement[] {
  return products.filter(p => p.bought).map(p => ({ id: `product-${p.id}`, productId: p.id, amount: Math.round((p.paid_price ?? p.estimated_price) * p.quantity * 100) / 100, description: p.name, category: p.category, date: p.created_at?.slice(0, 10) || today(), notes: p.notes }));
}
export function availableCash(wallet: PreviewWallet, products: Product[]) {
  return Math.round((wallet.opening + sumMoney(wallet.incomes, m => m.amount) - sumMoney([...wallet.expenses, ...homeExpenses(products)], m => m.amount)) * 100) / 100;
}

