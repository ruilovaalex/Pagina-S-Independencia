import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Trash2, TrendingDown, TrendingUp, PiggyBank, Wallet, X } from 'lucide-react';
import { currentMonth, sumMoney, today } from '../../../lib/finance';
import type { Product } from '../../types';
import PaperCutText from './PaperCutText';
import NotebookPlanner from './NotebookPlanner';

import { availableCash, cash, homeExpenses, type Movement, type PreviewWallet } from '../../../lib/preview-wallet';

const expenseCategories = ['Alimentación', 'Transporte', 'Arriendo', 'Servicios', 'Salud', 'Educación', 'Entretenimiento', 'Ropa', 'Muebles', 'Electrodomésticos', 'Otro'];
const incomeSources = ['Salario', 'Freelance', 'Bono', 'Regalo', 'Inversión', 'Otro'];
const blank = (): Movement => ({ id: '', amount: 0, description: '', category: 'Otro', date: today(), notes: '' });
interface Props { wallet: PreviewWallet; onChange: (wallet: PreviewWallet) => void; products: Product[]; onProductsChange: (products: Product[]) => void; openBalanceRequest: number }

export default function FinancePreview({ wallet, onChange, products, onProductsChange, openBalanceRequest }: Props) {
  const [tab, setTab] = useState<'expenses' | 'incomes' | 'finances'>('expenses');
  const [month, setMonth] = useState(currentMonth());
  const [mode, setMode] = useState<'movement' | 'balance' | 'budget' | 'delete' | null>(null);
  const [draft, setDraft] = useState<Movement>(blank);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const balance = availableCash(wallet, products);
  const expenses = [...wallet.expenses, ...homeExpenses(products)];
  const rows = (tab === 'incomes' ? wallet.incomes : expenses).filter(m => m.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date));
  const categories = [...new Set(rows.map(m => m.category))].map(category => ({ category, total: sumMoney(rows.filter(m => m.category === category), m => m.amount) }));
  const total = sumMoney(rows, m => m.amount);
  const open = (next: NonNullable<typeof mode>, movement?: Movement) => {
    setError(''); setMode(next); setDraft(movement ?? blank());
    setValue(next === 'balance' ? String(wallet.opening) : next === 'budget' ? String(wallet.budget) : movement ? String(movement.amount) : '');
  };
  useEffect(() => { if (mode) { dialog.current?.showModal(); dialog.current?.querySelector<HTMLInputElement>('input')?.focus(); } }, [mode]);
  useEffect(() => { if (openBalanceRequest) { setValue(String(wallet.opening)); setMode('balance'); } }, [openBalanceRequest]);
  const close = () => { dialog.current?.close(); setMode(null); };
  const save = () => {
    if (mode === 'delete') {
      if (draft.productId) onProductsChange(products.map(p => p.id === draft.productId ? { ...p, bought: false, paid_price: null } : p));
      else onChange({ ...wallet, [tab === 'incomes' ? 'incomes' : 'expenses']: (tab === 'incomes' ? wallet.incomes : wallet.expenses).filter(m => m.id !== draft.id) });
      setNotice(draft.productId ? 'Compra anulada. El objeto volvió a Por comprar y se devolvió su importe al saldo.' : 'Registro eliminado; saldo actualizado.'); close(); return;
    }
    const amount = Number(value);
    if (!value.trim() || !Number.isFinite(amount) || amount > 9999999 || amount < 0 || (mode !== 'balance' && amount === 0)) { setError('Escribe un importe válido. Solo el saldo inicial puede ser cero.'); return; }
    const rounded = Math.round(amount * 100) / 100;
    if (mode === 'balance' || mode === 'budget') onChange({ ...wallet, [mode === 'balance' ? 'opening' : 'budget']: rounded });
    else {
      if (!draft.description.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) { setError('Completa la descripción y la fecha.'); return; }
      if (draft.productId) onProductsChange(products.map(p => p.id === draft.productId ? { ...p, name: draft.description.trim(), paid_price: rounded / p.quantity, category: draft.category, notes: draft.notes, created_at: `${draft.date}T12:00:00` } : p));
      else {
        const key = tab === 'incomes' ? 'incomes' : 'expenses';
        const record = { ...draft, id: draft.id || crypto.randomUUID(), description: draft.description.trim(), amount: rounded };
        onChange({ ...wallet, [key]: draft.id ? wallet[key].map(m => m.id === draft.id ? record : m) : [...wallet[key], record] });
      }
      setMonth(draft.date.slice(0, 7));
    }
    setNotice(mode === 'balance' ? 'Saldo inicial guardado. Mi hogar también está actualizado.' : mode === 'budget' ? 'Meta del hogar actualizada.' : 'Registro guardado; saldo actualizado.'); close();
  };
  return <section className="wallet-view">
    <div className="home-heading"><div><p className="eyebrow">TU DINERO / CUENCA, EC</p><h1><PaperCutText text="Mi libreta."/></h1><p>Lo que entra, lo que sale y lo que viene.</p></div><button className="primary-action" onClick={() => open('balance')}><Wallet size={18}/>Ingresar mi saldo</button></div>
    <section className="wallet-summary" aria-label="Resumen de mi dinero"><div><span>Saldo disponible</span><strong className={balance < 0 ? 'negative' : ''}>{cash(balance)}</strong><small>Saldo inicial + ingresos − gastos</small></div><div><span>Saldo inicial</span><strong>{cash(wallet.opening)}</strong><button className="text-action" onClick={() => open('balance')}><Pencil size={13}/>Editar saldo inicial</button></div><div><span>Ingresos registrados</span><strong>{cash(sumMoney(wallet.incomes, m => m.amount))}</strong><small>Todos los meses</small></div><div><span>Gastos registrados</span><strong>{cash(sumMoney(expenses, m => m.amount))}</strong><small>Incluye las compras de Mi hogar</small></div></section>
    <nav className="wallet-tabs" aria-label="Gastos, ingresos y finanzas">{([{ id: 'expenses', label: 'Gastos', Icon: TrendingDown }, { id: 'incomes', label: 'Ingresos', Icon: TrendingUp }, { id: 'finances', label: 'Finanzas', Icon: PiggyBank }] as const).map(({ id, label, Icon }) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon size={17}/>{label}</button>)}</nav>
    {tab !== 'finances' ? <>
      <div className="wallet-toolbar"><label>Mes<input aria-label="Mes de movimientos" type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }}/></label><span className="wallet-total">Total: {cash(total)}</span><button className="primary-action" onClick={() => open('movement')}><Plus size={16}/>{tab === 'incomes' ? 'Agregar ingreso' : 'Agregar gasto'}</button></div>
      <div className="wallet-detail"><aside className="category-summary"><h2>{tab === 'incomes' ? 'Por fuente' : 'Por categoría'}</h2>{categories.map(c => <div key={c.category}><p><span>{c.category}</span><strong>{cash(c.total)}</strong></p><progress max={total || 1} value={c.total}/></div>)}{!categories.length && <p>Los totales aparecerán al registrar movimientos.</p>}</aside>
        <div className="movement-table"><table><thead><tr><th>Fecha</th><th>Descripción</th><th>{tab === 'incomes' ? 'Fuente' : 'Categoría'}</th><th>Monto</th><th>Notas</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td data-label="Fecha">{new Date(`${row.date}T12:00:00`).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td data-label="Descripción"><strong>{row.description}</strong>{row.productId && <small>Compra de Mi hogar</small>}</td><td data-label={tab === 'incomes' ? 'Fuente' : 'Categoría'}><span className="category-badge">{row.category}</span></td><td data-label="Monto" className={tab === 'incomes' ? 'income-amount' : 'expense-amount'}>{cash(row.amount)}</td><td data-label="Notas">{row.notes || '—'}</td><td className="movement-actions"><button aria-label={`Editar ${row.description}`} onClick={() => open('movement', row)}><Pencil size={16}/></button><button aria-label={`Eliminar ${row.description}`} onClick={() => open('delete', row)}><Trash2 size={16}/></button></td></tr>)}</tbody></table>{!rows.length && <p className="wallet-empty">Sin {tab === 'incomes' ? 'ingresos' : 'gastos'} en este mes. Usa «{tab === 'incomes' ? 'Agregar ingreso' : 'Agregar gasto'}» para empezar.</p>}<div className="table-total"><span>{rows.length} registros</span><strong>{cash(total)}</strong></div></div>
      </div>
    </> : <><div className="wallet-toolbar"><label>Mes<input aria-label="Mes del resumen financiero" type="month" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value);}}/></label></div><NotebookPlanner notebook={wallet.notebook} onChange={notebook=>onChange({...wallet,notebook})} balance={balance} incomes={wallet.incomes} expenses={expenses} products={products} month={month} onPay={payment=>onChange({...wallet,expenses:[...wallet.expenses,{id:`planned-${payment.id}`,description:payment.description,amount:payment.amount,date:today(),category:'Otro',notes:'Pago previamente planificado'}],notebook:{...wallet.notebook,upcoming:wallet.notebook.upcoming.filter(p=>p.id!==payment.id)}})}/><div className="finance-cards"><article><div className="finance-card-title"><h2>Meta del hogar</h2><button className="text-action" onClick={() => open('budget')}><Pencil size={14}/>Editar meta</button></div><strong className="finance-value">{cash(wallet.budget)}</strong><p>Objetivo de presupuesto para tu independencia.</p><progress max={wallet.budget || 1} value={Math.min(Math.max(balance, 0), wallet.budget)}/><p>{cash(Math.max(balance, 0))} disponibles · faltan {cash(Math.max(0, wallet.budget - balance))}</p></article><article><h2>Tu hogar en números</h2><dl><div><dt>Compras realizadas</dt><dd>{cash(sumMoney(homeExpenses(products), m => m.amount))}</dd></div><div><dt>Objetos por comprar</dt><dd>{cash(sumMoney(products.filter(p => !p.bought), p => p.estimated_price * p.quantity))}</dd></div><div><dt>Saldo disponible</dt><dd>{cash(balance)}</dd></div></dl><p>La meta es una referencia. Cambiarla no modifica tu saldo.</p></article></div></>}
    <p role="status" className="home-notice">{notice}</p>
    <dialog ref={dialog} className="home-dialog" aria-labelledby="wallet-dialog-title" onClose={() => setMode(null)} onCancel={() => setMode(null)}><button className="dialog-close" onClick={close} aria-label="Cerrar"><X/></button><form onSubmit={e => { e.preventDefault(); save(); }}><p className="eyebrow">TU DINERO, AL DÍA</p><h2 id="wallet-dialog-title">{mode === 'balance' ? 'Mi saldo inicial' : mode === 'budget' ? 'Meta del hogar' : mode === 'delete' ? 'Eliminar registro' : `${draft.id ? 'Editar' : 'Agregar'} ${tab === 'incomes' ? 'ingreso' : 'gasto'}`}</h2>
      {mode === 'balance' && <p>Dinero con el que empiezas, antes de los movimientos registrados. Los ingresos nuevos se añaden en «Ingresos».</p>}
      {mode === 'delete' ? <p>¿Eliminar «{draft.description}»? {draft.productId && 'La compra se anulará y el objeto volverá a Por comprar.'}</p> : <>
        {mode === 'movement' && <><label>Descripción<input required maxLength={120} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></label><label>Fecha<input required type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })}/></label><label>{tab === 'incomes' ? 'Fuente' : 'Categoría'}<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{[...new Set([...(tab === 'incomes' ? incomeSources : expenseCategories), draft.category])].map(c => <option key={c}>{c}</option>)}</select></label></>}
        <label>{mode === 'balance' ? 'Saldo inicial (USD)' : mode === 'budget' ? 'Meta (USD)' : 'Monto (USD)'}<input required type="number" step="0.01" min={mode === 'balance' ? '0' : '.01'} max="9999999" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)}/></label>
        {mode === 'movement' && <label>Notas<input maxLength={300} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })}/></label>}
        {mode === 'balance' && <p className="balance-after"><span>Saldo disponible resultante</span><strong>{cash(balance - wallet.opening + (Number(value) || 0))}</strong></p>}
      </>}{error && <p role="alert" className="negative">{error}</p>}<button type="submit" className="primary-action">{mode === 'delete' ? 'Confirmar eliminación' : 'Guardar'}</button><button type="button" className="cancel-action" onClick={close}>Cancelar</button>
    </form></dialog>
  </section>;
}

