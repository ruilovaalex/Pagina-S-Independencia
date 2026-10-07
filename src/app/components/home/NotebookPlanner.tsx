import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import { today } from '../../../lib/finance';
import { notebookSummary, type Notebook, type PurchaseGoal, type UpcomingPayment } from '../../../lib/notebook';
import { cash, type Movement } from '../../../lib/preview-wallet';
import type { Product } from '../../types';
import PaperCutText from './PaperCutText';

interface Props { notebook:Notebook; onChange:(next:Notebook)=>void; balance:number; incomes:Movement[]; expenses:Movement[]; products:Product[]; month:string; onPay:(payment:UpcomingPayment)=>void }
export default function NotebookPlanner({notebook,onChange,balance,incomes,expenses,products,month,onPay}:Props) {
  const [mode,setMode] = useState<'budget'|'goal'|'payment'|null>(null);
  const [id,setId] = useState('');
  const [name,setName] = useState('');
  const [amount,setAmount] = useState('');
  const [reserved,setReserved] = useState('0');
  const [productId,setProductId] = useState('');
  const [date,setDate] = useState(today());
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const purchased = products.filter(p=>p.bought).map(p=>p.id);
  const summary = notebookSummary(notebook,balance,incomes,expenses,month,purchased);
  const close = () => { dialog.current?.close(); setMode(null); };
  useEffect(()=>{ if(mode) dialog.current?.showModal(); },[mode]);
  function open(next:NonNullable<typeof mode>,item?:PurchaseGoal|UpcomingPayment) {
    setError(''); setId(item?.id ?? ''); setName(item ? 'name' in item ? item.name : item.description : '');
    setAmount(next==='budget' ? String(notebook.monthlyBudget ?? '') : item ? String('target' in item ? item.target : item.amount) : '');
    setReserved(item && 'reserved' in item ? String(item.reserved) : '0');
    setProductId(item && 'productId' in item ? item.productId ?? '' : '');
    setDate(item && 'due' in item ? item.due : today()); setMode(next);
  }
  function save(event:FormEvent) {
    event.preventDefault();
    const value = Number(amount), allocation = Number(reserved);
    if(!amount.trim() || !Number.isFinite(value) || value<=0 || value>9999999 || !Number.isFinite(allocation) || allocation<0 || allocation>value) { setError('Revisa el importe y la reserva. La reserva debe estar entre cero y el precio de la meta.'); return; }
    const rounded = Math.round(value*100)/100;
    if(mode==='budget') onChange({...notebook,monthlyBudget:rounded});
    else if(mode==='goal') {
      if(!name.trim()) { setError('Escribe un nombre para la meta.'); return; }
      if(productId && notebook.goals.some(g=>g.productId===productId && g.id!==id)) { setError('Este objeto ya tiene una meta. Puedes editarla.'); return; }
      const goal:PurchaseGoal={id:id||crypto.randomUUID(),name:name.trim(),target:rounded,reserved:Math.round(allocation*100)/100,...(productId?{productId}:{})};
      onChange({...notebook,goals:id?notebook.goals.map(g=>g.id===id?goal:g):[...notebook.goals,goal]});
    } else if(mode==='payment') {
      if(!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date) { setError('Completa el concepto y una fecha válida.'); return; }
      const payment:UpcomingPayment={id:id||crypto.randomUUID(),description:name.trim(),amount:rounded,due:date};
      onChange({...notebook,upcoming:id?notebook.upcoming.map(p=>p.id===id?payment:p):[...notebook.upcoming,payment]});
    }
    setNotice('Plan actualizado. Reservar o planificar dinero no descuenta el saldo.'); close();
  }
  return <section className="notebook-planner" aria-label="Plan de mi dinero">
    <div className="notebook-heading"><h2><PaperCutText text="Con calma, con plan."/></h2><span className="eyebrow">MES / {month}</span></div>
    <div className="notebook-metrics"><div><span>Puedo gastar hasta</span><strong>{cash(summary.safeToSpend)}</strong><small>Saldo menos reservas y pagos de 30 días; limitado por el presupuesto del mes.</small></div><div><span>Proyección a 30 días</span><strong className={summary.projectedBalance<0?'negative':''}>{cash(summary.projectedBalance)}</strong><small>Saldo menos pagos previstos. Sin asumir ingresos futuros.</small></div><div><span>Excedente del mes</span><strong className={summary.surplus<0?'negative':''}>{cash(summary.surplus)}</strong><small>{summary.savingsPercent===null?'Registra ingresos para calcular el porcentaje.':`${summary.savingsPercent}% de los ingresos del mes. Es ahorro potencial, no una transferencia.`}</small></div></div>
    {summary.shortage>0 && <p role="status" className="notebook-alert">Tus reservas y próximos pagos superan el saldo por {cash(summary.shortage)}. Revisa el plan antes de una compra.</p>}
    {summary.remainingBudget!==null && summary.remainingBudget<0 && <p className="notebook-alert">Superaste el presupuesto mensual por {cash(-summary.remainingBudget)}.</p>}
    <div className="notebook-budget"><div><h3>Presupuesto mensual</h3><p>{notebook.monthlyBudget===null?'Pon un límite de gastos para este mes.':`${cash(summary.spent)} gastados de ${cash(notebook.monthlyBudget)} · quedan ${cash(Math.max(0,summary.remainingBudget!))}`}</p></div><button className="text-action" onClick={()=>open('budget')}><Pencil size={14}/>{notebook.monthlyBudget===null?'Definir presupuesto':'Editar presupuesto'}</button>{notebook.monthlyBudget!==null&&<button className="text-action" onClick={()=>onChange({...notebook,monthlyBudget:null})}>Quitar límite</button>}</div>
    <div className="notebook-columns">
      <section aria-labelledby="purchase-goals"><div className="notebook-row-heading"><h3 id="purchase-goals">Metas de compra</h3><button className="text-action" onClick={()=>open('goal')}><Plus size={15}/>Añadir meta</button></div><p className="notebook-explainer">Reserva parte del saldo para una compra. El dinero sigue en tu cuenta.</p>
        {notebook.goals.map(goal=>{const complete=Boolean(goal.productId&&purchased.includes(goal.productId)); return <article className="notebook-entry" key={goal.id}><div><h4>{goal.name}</h4><button className="text-action" aria-label={`Editar meta ${goal.name}`} onClick={()=>open('goal',goal)}><Pencil size={14}/></button></div><p>{complete?'Comprado · reserva liberada':`${cash(goal.reserved)} reservados de ${cash(goal.target)} · faltan ${cash(Math.max(0,goal.target-goal.reserved))}`}</p><progress aria-label={`Progreso de ${goal.name}`} max={goal.target} value={complete?goal.target:goal.reserved}/><div><small>{complete?'Tu compra aparece en el hogar.':`${Math.round(goal.reserved/goal.target*100)}% preparado`}</small><button className="text-action" onClick={()=>onChange({...notebook,goals:notebook.goals.filter(g=>g.id!==goal.id)})} aria-label={`Quitar meta ${goal.name}`}>Quitar meta</button></div></article>;})}
        {!notebook.goals.length&&<p className="notebook-empty">Tu próxima compra empieza aquí.</p>}
      </section>
      <section aria-labelledby="upcoming-payments"><div className="notebook-row-heading"><h3 id="upcoming-payments">Próximos pagos</h3><button className="text-action" onClick={()=>open('payment')}><Plus size={15}/>Planificar pago</button></div><p className="notebook-explainer">Solo se convierte en gasto cuando registras el pago.</p>
        {[...notebook.upcoming].sort((a,b)=>a.due.localeCompare(b.due)).map(payment=><article className="notebook-entry" key={payment.id}><div><h4>{payment.description}</h4><strong>{cash(payment.amount)}</strong></div><p>{new Date(`${payment.due}T12:00:00`).toLocaleDateString('es-EC')}{payment.due<today()?' · Fecha vencida':''}</p><div><button className="text-action" onClick={()=>{onPay(payment);setNotice('Pago registrado como gasto una sola vez; saldo actualizado.');}}>Registrar pago</button><button className="text-action" aria-label={`Editar pago ${payment.description}`} onClick={()=>open('payment',payment)}><Pencil size={14}/></button><button className="text-action" aria-label={`Quitar pago ${payment.description}`} onClick={()=>onChange({...notebook,upcoming:notebook.upcoming.filter(p=>p.id!==payment.id)})}>Quitar</button></div></article>)}
        {!notebook.upcoming.length&&<p className="notebook-empty">Sin pagos previstos. Añade solo los que conoces.</p>}
      </section>
    </div><p className="notebook-explainer">Ingresos del mes: {cash(summary.income)} · gastos: {cash(summary.spent)} · reservas: {cash(summary.reserved)} · pagos de 30 días: {cash(summary.committed)}</p><p role="status">{notice}</p>
    <dialog ref={dialog} className="home-dialog" aria-labelledby="planner-title" onClose={()=>setMode(null)} onCancel={()=>setMode(null)}><button className="dialog-close" onClick={close} aria-label="Cerrar"><X/></button><form onSubmit={save}><h2 id="planner-title">{mode==='budget'?'Presupuesto mensual':mode==='goal'?'Mi meta de compra':'Planificar un pago'}</h2>
      {mode==='goal'&&<label>Objeto de tu lista<select value={productId} onChange={event=>{const product=products.find(p=>p.id===event.target.value);setProductId(event.target.value);if(product){setName(product.name);setAmount(String(product.estimated_price*product.quantity));}}}><option value="">Otra meta</option>{products.filter(p=>!p.bought||p.id===productId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      {mode!=='budget'&&<label>{mode==='goal'?'Nombre de la meta':'Concepto'}<input autoFocus required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>}
      <label>{mode==='goal'?'Precio objetivo (USD)':'Monto (USD)'}<input required type="number" min="0.01" max="9999999" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
      {mode==='goal'&&<label>Dinero reservado (USD)<input required type="number" min="0" max={amount||'9999999'} step="0.01" inputMode="decimal" value={reserved} onChange={e=>setReserved(e.target.value)}/></label>}
      {mode==='payment'&&<label>Fecha prevista<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>}
      {mode==='goal'&&<p>Esta reserva reduce lo que puedes gastar libremente, pero no crea un gasto.</p>}{error&&<p className="negative" role="alert">{error}</p>}<button className="primary-action" type="submit">Guardar</button><button className="cancel-action" type="button" onClick={close}>Cancelar</button>
    </form></dialog>
  </section>;
}
