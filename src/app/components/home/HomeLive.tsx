import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Box, Check, LoaderCircle, Plus, Refrigerator, Sofa, Tv, Wallet } from 'lucide-react';
import HomeIntro from './HomeIntro';
import HomeAtmosphere from './HomeAtmosphere';
import { Button } from '../ui/button';
import PaperCutText from './PaperCutText';
import { getSupabase } from '../../../lib/supabase';
import { errorMessage, sumMoney } from '../../../lib/finance';
import type { Expense, Income, Product } from '../../types';
import { defaultHouse, objectKind, replaceRoom, ROOMS, type RoomId } from '../../../lib/house-state';
import '../../../styles/home.css';
import '../../../styles/home-pastel.css';
import '@fontsource/anton/latin-400.css';
import '../../../styles/home-editorial.css';
import '../../../styles/home-controls.css';
import '../../../styles/home-papercut.css';
import '../../../styles/home-brutalist.css';
import '../../../styles/home-collage.css';

const RoomScene = lazy(() => import('./RoomScene'));
const money = (value: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
const balanceKey = (userId: string) => `mi-independencia:opening-balance:${userId}`;

function ItemIcon({ name }: { name: string }) {
  if (/sof[aá]|sill[oó]n/i.test(name)) return <Sofa />;
  if (/refri|nevera/i.test(name)) return <Refrigerator />;
  if (/televisor|\btv\b/i.test(name)) return <Tv />;
  return <Box />;
}

export default function HomeLive({ userId, onManageProducts, onOpenExpenses, active = true }: { userId: string; onManageProducts: () => void; onOpenExpenses: () => void; active?:boolean }) {
  const [room, setRoom] = useState<RoomId>('living');
  const [house, setHouse] = useState(() => defaultHouse([]));
  const initializedHouse = useRef(false);
  const [wallColors, setWallColors] = useState(() => Object.fromEntries(ROOMS.map(r => [r.id, r.wall])) as Record<RoomId,string>);
  const [floorColors, setFloorColors] = useState<Partial<Record<RoomId,string>>>({});
  const [decorations, setDecorations] = useState<Partial<Record<RoomId,Record<string,number>>>>({});
  const [placingDecor, setPlacingDecor] = useState<string>();
  const [catName, setCatName] = useState('');
  const currentRoom = ROOMS.find(r => r.id === room)!;
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [openingBalance, setOpeningBalance] = useState(() => {
    try { const value = Number(localStorage.getItem(balanceKey(userId))); return Number.isFinite(value) && value >= 0 && value <= 9999999 ? value : 0; } catch { return 0; }
  });
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState<'pending' | 'bought'>('pending');
  const [greeting, setGreeting] = useState(0);
  const [balanceDialog, setBalanceDialog] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState('');
  const balanceDialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!active) return;
    let attached = true;
    async function load() {
      setLoading(true);
      const [productResult, expenseResult, incomeResult] = await Promise.all([
        getSupabase().from('products').select('*').eq('user_id', userId).order('priority').order('name'),
        getSupabase().from('expenses').select('*').eq('user_id', userId),
        getSupabase().from('incomes').select('*').eq('user_id', userId),
      ]);
      if (!attached) return;
      const failure = productResult.error ?? expenseResult.error ?? incomeResult.error;
      setError(failure ? errorMessage(failure) : '');
      if (!failure) {
        const loadedProducts = (productResult.data as Product[]) ?? [];
        setProducts(loadedProducts);
        if (!initializedHouse.current) {
          setHouse(defaultHouse(loadedProducts.map(p => ({id:p.id,kind:objectKind(p.name)}))));
          initializedHouse.current = true;
        }
        setExpenses((expenseResult.data as Expense[]) ?? []);
        setIncomes((incomeResult.data as Income[]) ?? []);
      }
      setLoading(false);
    }
    void load();
    return () => { attached = false; };
  }, [userId,active]);

  const bought = products.filter(product => product.bought);
  const pending = products.filter(product => !product.bought);
  const list = filter === 'pending' ? pending : bought;
  const selected = products.find(product => product.id === selectedId) ?? list[0];
  const spent = sumMoney(bought, product => product.quantity * (product.paid_price ?? product.estimated_price));
  const balance = Math.round((openingBalance + sumMoney(incomes, row => row.amount) - sumMoney(expenses, row => row.amount)) * 100) / 100;
  const progress = products.length ? Math.round((bought.length / products.length) * 100) : 0;
  const roomProducts = useMemo(() => products, [products]);

  useEffect(() => {
    if (balanceDialog) balanceDialogRef.current?.showModal();
    else if (balanceDialogRef.current?.open) balanceDialogRef.current.close();
  }, [balanceDialog]);

  function saveOpeningBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(balanceDraft);
    if (!Number.isFinite(amount) || amount < 0 || amount > 9999999) return;
    try {
      localStorage.setItem(balanceKey(userId), String(Math.round(amount * 100) / 100));
      setOpeningBalance(Math.round(amount * 100) / 100);
      setNotice('Saldo inicial guardado en este navegador.');
      setBalanceDialog(false);
    } catch {
      setError('No se pudo guardar el saldo inicial en este navegador.');
    }
  }

  return <section className="home-app live-home">
    <HomeAtmosphere active={active}>{(motionControl, motionPaused) => <main className="home-main home-home-view">
      <HomeIntro onAdd={onManageProducts} actionLabel="Gestionar objetos" objectsId="live-objects-title" motionControl={motionControl} motionPaused={motionPaused} onInventory={onManageProducts}/>
      {error && <p className="live-home-error" role="alert">{error}</p>}
      <div className="home-workspace">
        <section className="room-panel" aria-labelledby="live-room-title">
          <div className="panel-heading"><h2 id="live-room-title"><PaperCutText text={currentRoom.name}/></h2><span className="room-tag"><i/>MI ESPACIO · 3D</span></div>
          <nav className="room-tabs" aria-label="Habitaciones">{ROOMS.map(r => <button key={r.id} aria-current={room === r.id ? 'page' : undefined} onClick={() => {setRoom(r.id);setPlacingDecor(undefined);}}>{r.name}</button>)}</nav>
          <details className="room-personalization"><summary>Personalizar habitación</summary>
            <div className="room-color-controls"><label>Paredes<input aria-label="Color de paredes" type="color" value={wallColors[room]} onChange={e=>setWallColors(p=>({...p,[room]:e.target.value}))}/></label><label>Suelo<input aria-label="Color del suelo" type="color" value={floorColors[room]??'#c7d2b2'} onChange={e=>setFloorColors(p=>({...p,[room]:e.target.value}))}/></label></div>
            <details className="room-customize"><summary>Decoración gratis</summary><div className="decor-catalog">{[{id:'plant',name:'Planta'},{id:'books',name:'Libros'},{id:'art',name:'Cuadro'},{id:'vase',name:'Florero'}].map(d=><button key={d.id} aria-pressed={placingDecor===d.id} onClick={()=>setPlacingDecor(d.id)}><Box size={24}/><span>{d.name}</span><small>Gratis</small></button>)}</div>{placingDecor&&<div className="decor-placement-tools"><span>Elige un recuadro en la pared.</span><button onClick={()=>setPlacingDecor(undefined)}>Cancelar</button><button onClick={()=>{setDecorations(p=>{const next={...p[room]};delete next[placingDecor];return {...p,[room]:next};});setPlacingDecor(undefined);}}>Devolver al catálogo</button></div>}</details>
            <label className="cat-name-field">Nombre de tu gato<input aria-label="Nombre de tu gato" maxLength={24} value={catName} onChange={e=>setCatName(e.target.value)}/></label>
          </details>
          <div className="room-stage">
            {loading && !products.length ? <div className="room-fallback"><LoaderCircle className="animate-spin"/><p>Cargando tus objetos…</p></div> : <Suspense fallback={<div className="room-fallback"><LoaderCircle className="animate-spin"/><p>Preparando tu habitación…</p></div>}><RoomScene key={`${userId}:${room}`} storageKey={`live-memory:${room}`} layoutSource={{layout:house[room],onChange:layout=>setHouse(p=>replaceRoom(p,room,layout)),status:'Distribución temporal; el guardado en Supabase está pendiente.'}} roomId={room} wallColor={wallColors[room]} floorColor={floorColors[room]} decorations={decorations[room]} placingDecor={placingDecor} onPlaceDecor={slot=>{if(placingDecor){setDecorations(p=>({...p,[room]:{...p[room],[placingDecor]:slot}}));setPlacingDecor(undefined);}}} catName={catName.trim()||undefined} products={roomProducts} selectedId={selected?.id} greeting={greeting} onPet={() => setGreeting(value => value + 1)} balance={balance} paused={!active} onSelect={id => { setSelectedId(id); setFilter(products.find(product => product.id === id)?.bought ? 'bought' : 'pending'); }}/></Suspense>}
          </div>
          <div className="room-caption"><span>{selected ? `Seleccionado: ${selected.name}` : 'Toca un objeto para seleccionarlo'}</span><span><i/>+ = por comprar</span></div>
          <p className="scene-note">Personalización temporal. Tus compras siguen en tu cuenta; el guardado del cuarto en Supabase está pendiente.</p>
        </section>
        <section className="money-overview" aria-label="Resumen del hogar">
          <div className="cash"><span>Dinero disponible</span><strong className={balance < 0 ? 'negative' : ''}>{money(balance)}<small>USD</small></strong><span>Saldo inicial + ingresos − gastos</span><button className="text-action" onClick={() => { setBalanceDraft(String(openingBalance)); setBalanceDialog(true); }}><Wallet size={14}/>Ingresar mi saldo inicial</button></div>
          <div><span>Invertido en el hogar</span><strong>{money(spent)}</strong><span>{bought.length} objetos comprados</span></div>
          <div className="home-progress"><span>Objetos comprados</span><strong>{progress}<small>%</small></strong><progress value={progress} max={100} aria-label="Progreso de objetos comprados"/><span>{pending.length} por conseguir</span></div>
        </section>
        <section className="objects-panel" aria-labelledby="live-objects-title">
          <div className="panel-heading"><h2 id="live-objects-title"><PaperCutText text="Mis objetos"/></h2><span className="count-pill">{products.length}</span></div>
          <div className="object-filters" aria-label="Filtrar objetos"><button aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>Por comprar <span>{pending.length}</span></button><button aria-pressed={filter === 'bought'} onClick={() => setFilter('bought')}>Comprados <span>{bought.length}</span></button></div>
          <div className="object-list">{loading ? <p className="empty-objects">Cargando tu lista…</p> : list.map(product => <button key={product.id} className={`object-row ${selected?.id === product.id ? 'selected' : ''}`} onClick={() => setSelectedId(product.id)} aria-pressed={selected?.id === product.id}><span className="object-icon"><ItemIcon name={product.name}/></span><span className="object-name"><strong>{product.name}</strong><small>{product.category}</small></span><span className="object-price">{money(product.bought ? product.quantity * (product.paid_price ?? product.estimated_price) : product.quantity * product.estimated_price)}{product.bought && <Check size={14}/>}</span></button>)}{!loading && !list.length && <div className="empty-objects"><Check/><strong>{products.length ? 'No hay objetos en esta lista.' : 'Tu habitación empieza vacía.'}</strong><p>Añade un mueble o electrodoméstico cuando quieras.</p></div>}</div>
          {selected && <div className="selected-object"><span className="eyebrow">{selected.bought ? 'YA ES PARTE DE TU HOGAR' : 'TU PRÓXIMA COMPRA'}</span><h3>{selected.name}</h3><p>{selected.bought ? `Marcado como comprado por ${money(selected.quantity * (selected.paid_price ?? selected.estimated_price))}.` : `Precio estimado: ${money(selected.quantity * selected.estimated_price)}.`}</p>{!selected.bought && <><div className="balance-after"><span>Saldo disponible</span><strong className={balance < 0 ? 'negative' : ''}>{money(balance)}</strong></div><Button className="purchase-action" onClick={onOpenExpenses}>Registrar un gasto <Wallet size={17}/></Button><small>Registra aquí su pago en Gastos. La compra del producto aún se marca en Electrodomésticos.</small></>}</div>}
          <button className="manage-products-link" onClick={onManageProducts}>Abrir lista de electrodomésticos <Plus size={15}/></button>
        </section>
      </div>
      <p className="home-notice" role="status">{notice}</p>
      <p className="opening-balance-note">El saldo inicial se guarda en este navegador; los ingresos y gastos vienen de tu cuenta.</p>
    </main>}</HomeAtmosphere>
    <dialog ref={balanceDialogRef} className="home-dialog" onClose={() => setBalanceDialog(false)} onCancel={event => { event.preventDefault(); setBalanceDialog(false); }}>
      <form onSubmit={saveOpeningBalance}><p className="eyebrow">SALDO DE PARTIDA</p><h2>¿Con cuánto empiezas?</h2><p>Este monto se suma a tus ingresos y se resta de tus gastos para mostrar el saldo disponible.</p><label>Saldo inicial (USD)<input autoFocus required type="number" min="0" max="9999999" step="0.01" inputMode="decimal" value={balanceDraft} onChange={event => setBalanceDraft(event.target.value)}/></label><Button className="primary-action" type="submit">Guardar saldo inicial</Button><button className="cancel-action" type="button" onClick={() => setBalanceDialog(false)}>Cancelar</button></form>
    </dialog>
  </section>;
}
