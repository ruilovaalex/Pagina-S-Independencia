import { sumMoney, today } from './finance.ts';

export interface PurchaseGoal { id: string; name: string; target: number; reserved: number; productId?: string }
export interface UpcomingPayment { id: string; description: string; amount: number; due: string }
export interface Notebook { monthlyBudget: number | null; goals: PurchaseGoal[]; upcoming: UpcomingPayment[] }
export const emptyNotebook: Notebook = { monthlyBudget: null, goals: [], upcoming: [] };
interface MoneyRow { amount: number; date: string }
export function notebookSummary(notebook: Notebook, balance: number, incomes: MoneyRow[], expenses: MoneyRow[], month: string, purchasedIds: string[], now = today()) {
  const income = sumMoney(incomes.filter(row => row.date.startsWith(month)), row => row.amount);
  const spent = sumMoney(expenses.filter(row => row.date.startsWith(month)), row => row.amount);
  const surplus = Math.round((income - spent) * 100) / 100;
  const reserved = sumMoney(notebook.goals.filter(goal => !goal.productId || !purchasedIds.includes(goal.productId)), goal => goal.reserved);
  const horizon = new Date(`${now}T12:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate()+30);
  const horizonDate = horizon.toISOString().slice(0,10);
  // Include overdue commitments, exclude later payments; allocations are not expenses.
  const upcoming = notebook.upcoming.filter(row => row.due <= horizonDate);
  const committed = sumMoney(upcoming, row => row.amount);
  const remainingBudget = notebook.monthlyBudget === null ? null : Math.round((notebook.monthlyBudget-spent)*100)/100;
  const currentSpent = sumMoney(expenses.filter(row=>row.date.startsWith(now.slice(0,7))),row=>row.amount);
  const endOfMonth = new Date(`${now.slice(0,7)}-01T12:00:00Z`);
  endOfMonth.setUTCMonth(endOfMonth.getUTCMonth()+1);
  const dueThisMonth = sumMoney(upcoming.filter(row=>row.due < endOfMonth.toISOString().slice(0,10)),row=>row.amount);
  const availableBudget = notebook.monthlyBudget === null ? null : Math.round((notebook.monthlyBudget-currentSpent-dueThisMonth)*100)/100;
  const freeCash = Math.round((balance-reserved-committed)*100)/100;
  return { income,spent,surplus,reserved,committed,upcoming,remainingBudget,
    savingsPercent:income > 0 ? Math.round(surplus/income*100) : null,
    safeToSpend:Math.max(0,availableBudget === null ? freeCash : Math.min(freeCash,availableBudget)),
    projectedBalance:Math.round((balance-committed)*100)/100,
    shortage:Math.max(0,-freeCash),
  };
}
