import { animate, createScope } from 'animejs';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Home, Wallet, Plus, ArrowUpRight, Check, Sofa, Refrigerator, BedDouble, Tv, X, RotateCcw, Box, MousePointer2 } from 'lucide-react';
import HomeIntro from './HomeIntro';
import HomeAtmosphere from './HomeAtmosphere';
import { Button } from '../ui/button';
import PaperCutText from './PaperCutText';
import type { Product } from '../../types';
import FinancePreview from './FinancePreview';
import { availableCash, initialWallet } from '../../../lib/preview-wallet';
import { validateRoomLayout } from '../../../lib/room-layout';
import { defaultHouse, replaceRoom, locationOf, objectKind, ROOMS, type RoomId } from '../../../lib/house-state';

const RoomScene = lazy(() => import('./RoomScene'));
const roomItems = (products: Product[]) => products.map(product => ({id:product.id,kind:objectKind(product.name)}));
const money = (n: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n);
const initial: Product[] = [
  { id: 'sofa', name: 'Sofá de dos puestos', category: 'Muebles', estimated_price: 280, paid_price: 260, bought: true },
  { id: 'table', name: 'Mesa de centro', category: 'Muebles', estimated_price: 85, paid_price: 85, bought: true },
  { id: 'fridge', name: 'Refrigeradora', category: 'Electrodomésticos', estimated_price: 450, paid_price: null, bought: false },
  { id: 'bed', name: 'Cama y colchón', category: 'Muebles', estimated_price: 320, paid_price: null, bought: false },
  { id: 'tv', name: 'Televisor', category: 'Electrodomésticos', estimated_price: 230, paid_price: null, bought: false },
].map(p => ({ ...p, quantity: 1, priority: 'P2', store: '', link: '', notes: '' }));
function ItemIcon({ name }: { name: string }) {
  return /sofá/i.test(name) ? <Sofa /> : /refri/i.test(name) ? <Refrigerator /> : /cama/i.test(name) ? <BedDouble /> : /televisor/i.test(name) ? <Tv /> : <Box />;
}

export default function HomePreview() {
  const [products, setProducts] = useState(initial);
  const [wallet, setWallet] = useState(initialWallet);
  const [house, setHouse] = useState(() => defaultHouse(roomItems(initial)));
  const [room, setRoom] = useState<RoomId>('living');
  const [catalogCategory,setCatalogCategory] = useState('Todos');
  const [wallColors,setWallColors] = useState<Record<RoomId,string>>(() => Object.fromEntries(ROOMS.map(r => [r.id,r.wall])) as Record<RoomId,string>);
  const [decorations,setDecorations] = useState<Partial<Record<RoomId,Record<string,number>>>>({});
  const [placingDecor,setPlacingDecor] = useState<string>();
  const catalogRoot=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!placingDecor || !catalogRoot.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const scope=createScope({root:catalogRoot.current}).add(()=>{animate('button[aria-pressed=true] svg',{y:[-3,0],duration:240,ease:'out(3)'});});
    return ()=>scope.revert();
  },[placingDecor]);
  const [catName,setCatName] = useState('');
  const [floorColors,setFloorColors] = useState<Partial<Record<RoomId,string>>>({});
  const currentRoom = ROOMS.find(entry => entry.id === room)!;
  const [openBalanceRequest, setOpenBalanceRequest] = useState(0);
  const enterBalance = () => { setSection('money'); setOpenBalanceRequest(n => n + 1); };
  const [section, setSection] = useState<'home' | 'money'>('home');
  const [filter, setFilter] = useState<'pending' | 'bought'>('pending');
  const [selected, setSelected] = useState('tv');
  const [notice, setNotice] = useState('');
  const [greeting, setGreeting] = useState(0);
  const [roomRevision, setRoomRevision] = useState(0);
  const pet = () => setGreeting(value => value + 1);
  const [modal, setModal] = useState<'add' | 'buy' | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [paid, setPaid] = useState('');
  const [name, setName] = useState('');
  const [destination,setDestination] = useState<RoomId>('living');
  const [category, setCategory] = useState('Muebles');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const spent = products.filter(p => p.bought).reduce((sum, p) => sum + Math.round((p.paid_price ?? p.estimated_price) * 100), 0) / 100;
  const balance = availableCash(wallet, products);
  const bought = products.filter(p => p.bought).length;
  const milestones = [
    ...wallet.notebook.goals.filter(goal=>goal.reserved>=goal.target).map(goal=>`goal:${goal.id}`),
    ...ROOMS.filter(entry=>{const ids=Object.keys(house[entry.id]);return ids.length>0&&ids.every(id=>products.some(p=>p.id===id&&p.bought));}).map(entry=>`room:${entry.id}`),
  ];
  const list = products.filter(p => p.bought === (filter === 'bought') && (catalogCategory === 'Todos' || p.category === catalogCategory));
  const item = products.find(p => p.id === selected);
  useEffect(() => {
    if (!modal) return;
    dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [modal]);
  const changeFilter = (next: 'pending' | 'bought') => {
    setFilter(next);
    setSelected(products.find(p => p.bought === (next === 'bought'))?.id ?? '');
  };
  const changeRoom = (next:RoomId) => {
    setRoom(next); setPlacingDecor(undefined);
    const placed = products.filter(product=>Object.hasOwn(house[next],product.id));
    const choice = placed.find(product=>product.bought === (filter==='bought')) ?? placed[0];
    setSelected(choice?.id ?? '');
    if(choice) setFilter(choice.bought?'bought':'pending');
  };
  const open = (mode: 'add' | 'buy') => {
    setError(''); setModal(mode); if(mode==='add')setDestination(room);
    if (mode === 'buy' && item) setPaid(String(item.estimated_price));
    dialog.current?.showModal();
  };
  const close = () => { dialog.current?.close(); setModal(null); };
  const reset = () => {
    setProducts(initial); setWallet(initialWallet); setFilter('pending'); setSelected('tv'); setGreeting(0);
    setHouse(defaultHouse(roomItems(initial))); setRoom('living'); setCatalogCategory('Todos');
    setWallColors(Object.fromEntries(ROOMS.map(r => [r.id,r.wall])) as Record<RoomId,string>);
    setFloorColors({}); setDecorations({}); setCatName(''); setPlacingDecor(undefined); setRoomRevision(value => value+1); setNotice('La demostración volvió al inicio.');
  };
  return <div className="home-app">
    <div className="preview-strip">Vista de prueba <span>· Datos ficticios; se reinician al recargar</span><button onClick={reset} aria-label="Reiniciar demostración"><RotateCcw size={14} /><span>Reiniciar</span></button></div>
    <header className="home-header">
      <a className="home-brand" href="/home-preview.html"><img className="home-brand-image brand-kittens" src="/images/vintage-kittens.png" width="46" height="46" alt="" draggable={false}/><span>mi independencia<small>Un hogar, a tu ritmo.</small></span></a>
      <nav aria-label="Secciones principales"><Button variant="ghost" type="button" aria-current={section === 'home' ? 'page' : undefined} onClick={() => setSection('home')}><Home size={18}/>Mi hogar</Button><Button variant="ghost" type="button" aria-current={section === 'money' ? 'page' : undefined} onClick={() => setSection('money')}><Wallet size={18}/>Gastos</Button></nav>
      <span className="home-location">Cuenca, EC <span className="location-dot"/></span>
    </header>
    <main className="preview-pages">
      <section className="home-main home-home-view" hidden={section !== 'home'}><HomeAtmosphere active={section === 'home'}>{(motionControl, motionPaused) => <>
        <HomeIntro onAdd={() => open('add')} actionLabel="Añadir objeto" objectsId="furniture-catalog" motionControl={motionControl} motionPaused={motionPaused} onInventory={() => setSection('money')}/>
        <div className="home-workspace">
          <section className="room-panel" aria-labelledby="room-heading"><div className="panel-heading"><h2 id="room-heading"><PaperCutText text={currentRoom.name}/></h2><span className="room-tag"><i/>MI ESPACIO · 3D</span></div>
            <div className="room-catalog-actions"><button type="button" onClick={()=>open('add')}>Añadir objeto <Plus size={15}/></button><button type="button" onClick={()=>{setSection('money'); requestAnimationFrame(()=>{const catalog=document.getElementById('furniture-catalog') as HTMLDetailsElement;catalog.open=true;catalog.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});catalog.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});});}}>Catálogo e inventario <Box size={15}/></button></div><nav className="room-tabs" aria-label="Habitaciones">{ROOMS.map((entry,index) => <button key={entry.id} aria-current={room === entry.id ? 'page' : undefined} onClick={() => changeRoom(entry.id)}>{entry.name}</button>)}</nav>
            <details className="room-personalization"><summary>Personalizar habitación</summary><details className="room-customize"><summary>Colores y materiales</summary><div className="room-color-controls">
              <label>Paredes <input type="color" aria-label="Color de paredes" value={wallColors[room]} onChange={e=>setWallColors(p=>({...p,[room]:e.target.value}))}/></label>
              <label>Suelo <input type="color" aria-label="Color del suelo" value={floorColors[room]??'#c7d2b2'} onChange={e=>setFloorColors(p=>({...p,[room]:e.target.value}))}/></label>
              {['#e1bdc4','#c7d2b2','#ddd6bf','#718f80'].map((color,i)=><button key={color} style={{background:color}} aria-pressed={wallColors[room]===color} onClick={()=>setWallColors(p=>({...p,[room]:color}))}>{['Rosa','Salvia','Crema','Verde'][i]}</button>)}
              <button onClick={()=>{setWallColors(p=>({...p,[room]:currentRoom.wall}));setFloorColors(p=>({...p,[room]:undefined}));}}>Restaurar ambiente</button>
            </div><p>Decoración visual sin costo. Tus muebles y compras se conservan.</p></details>
            <details className="room-customize free-decor"><summary>Decorar · objetos gratis</summary><div ref={catalogRoot} className="decor-catalog">
              {[{id:'plant',name:'Planta'},{id:'books',name:'Libros'},{id:'art',name:'Cuadro'},{id:'vase',name:'Florero'}].map(entry=><button key={entry.id} aria-pressed={placingDecor===entry.id} onClick={()=>setPlacingDecor(entry.id)}><svg viewBox="0 0 80 80" aria-hidden="true"><path d="M10 55L40 40L70 55L40 70Z" fill="#d4c5a5"/>{entry.id==='art'?<><path d="M25 17L58 25V56L25 48Z" fill="#d9a7b3"/><path d="M29 23L53 29V49L29 43Z" fill="#f5eddd"/><path d="M38 39Q28 27 38 30Q49 29 43 41" fill="#557e59"/></>:entry.id==='books'?<>{[0,1,2].map(i=><path key={i} d={`M${23+i*11} ${23+i*3}l8 3v29l-8 -3Z`} fill={['#d9a7b3','#9caf8c','#f5eddd'][i]}/>)}</>:<><ellipse cx="40" cy="51" rx="12" ry="6" fill="#e2cfb6"/><path d="M28 41H52L49 53Q40 59 31 53Z" fill="#e2cfb6"/><ellipse cx="40" cy="41" rx="12" ry="5" fill="#f5eddd"/>{entry.id==='plant'?<><path d="M40 41V21" stroke="#557e59" strokeWidth="3"/><ellipse cx="34" cy="28" rx="5" ry="10" transform="rotate(-35 34 28)" fill="#557e59"/><ellipse cx="46" cy="23" rx="5" ry="10" transform="rotate(35 46 23)" fill="#91a56b"/></>:<><path d="M40 41V24" stroke="#557e59" strokeWidth="2"/><circle cx="40" cy="24" r="9" fill="#d9a7b3"/></>}</>}</svg><span>{entry.name}</span><small>Gratis</small></button>)}
            </div>{placingDecor&&<div className="decor-placement-tools"><span>Elige un recuadro en la pared.</span><button onClick={()=>setPlacingDecor(undefined)}>Cancelar</button>{Object.hasOwn(decorations[room]??{},placingDecor)&&<button onClick={()=>{setDecorations(p=>{const next={...p[room]};delete next[placingDecor];return {...p,[room]:next};});setPlacingDecor(undefined);}}>Devolver al catálogo</button>}</div>}</details>
            <details className="room-customize"><summary>Nombre de tu compañero</summary><label className="cat-name-field">Nombre de tu gato <input aria-label="Nombre de tu gato" maxLength={24} placeholder="¿Cómo se llama?" value={catName} onChange={e=>setCatName(e.target.value)}/></label></details></details>
            <div className="room-stage"><Suspense fallback={<div className="room-fallback">Preparando tu habitación…</div>}>
              <RoomScene key={roomRevision} storageKey={`simulation:${room}`}
                layoutSource={{layout:house[room],onChange:layout => setHouse(previous => replaceRoom(previous,room,layout)),status:'Distribución de prueba actualizada; se reinicia al recargar.'}}
                roomId={room} wallColor={wallColors[room]} floorColor={floorColors[room]} decorations={decorations[room]??{}} placingDecor={placingDecor} onPlaceDecor={slot=>{if(placingDecor){setDecorations(p=>({...p,[room]:{...p[room],[placingDecor]:slot}}));setPlacingDecor(undefined);}}} catName={catName.trim() || undefined} products={products} selectedId={selected} greeting={greeting} onPet={pet}
                balance={balance} goalReached={wallet.budget > 0 && balance >= wallet.budget} goalIds={milestones} paused={section !== 'home'}
                onSelect={id => { setSelected(id); setFilter(products.find(p => p.id === id)?.bought ? 'bought' : 'pending'); }}/>
            </Suspense></div>
            <div className="room-caption"><span><MousePointer2 size={15}/>{item ? `Seleccionado: ${item.name}` : 'Toca un objeto para seleccionarlo'}</span><span><i/>+ = por comprar</span></div>
            <p className="scene-note">Acomoda objetos en cada habitación. Quitar uno del cuarto conserva su compra.</p>
          </section>

        </div>
        <footer className="home-footer"><span>MI INDEPENDENCIA / CUENCA, ECUADOR</span><span>Precios y saldo en dólares.</span></footer>
      </>}</HomeAtmosphere></section>
      <section className="home-main finance-catalog-view" hidden={section !== 'money'}><HomeAtmosphere active={section === 'money'}>{motionControl => <><div className="finance-background-control">{motionControl}</div>{section === 'money' && <FinancePreview wallet={wallet} onChange={setWallet} products={products} onProductsChange={setProducts} openBalanceRequest={openBalanceRequest}/>}          <section className="money-overview" aria-label="Resumen del hogar">
            <div><span>Invertido en tu hogar</span><strong>{money(spent)}</strong><span>{bought} objetos comprados</span></div>
            <div className="home-progress"><span>Objetos comprados</span><strong>{bought}<small> / {products.length}</small></strong><progress value={bought} max={products.length} aria-label="Objetos comprados"/><span>{products.length - bought} por conseguir</span></div>
          </section>
          <section className="objects-panel" aria-labelledby="objects-heading"><details className="furniture-catalog" id="furniture-catalog"><summary><span className="catalog-title"><small>CATÁLOGO / INVENTARIO</small><span id="objects-heading">Objetos para tu hogar</span><small>Elige una pieza y dale su lugar.</small></span><span className="catalog-tally"><strong>{bought}</strong> comprados <span>·</span> <strong>{products.length - bought}</strong> por comprar</span><span className="catalog-toggle-label">Abrir catálogo</span></summary><div className="finance-catalog-body">
            <div className="object-filters" aria-label="Filtrar objetos"><button aria-pressed={filter === 'pending'} onClick={() => changeFilter('pending')}>Por comprar <span>{products.length - bought}</span></button><button aria-pressed={filter === 'bought'} onClick={() => changeFilter('bought')}>Comprados <span>{bought}</span></button></div>
            <label className="catalog-filter">Categoría<select aria-label="Categoría del catálogo" value={catalogCategory} onChange={event => setCatalogCategory(event.target.value)}>{['Todos',...new Set(products.map(p => p.category))].map(value => <option key={value}>{value}</option>)}</select></label>
            <div className="object-list">{list.map(p => <button key={p.id} className={`object-row ${selected === p.id ? 'selected' : ''}`} onClick={() => setSelected(p.id)} aria-pressed={selected === p.id}><span className="object-icon"><ItemIcon name={p.name}/></span><span className="object-name"><strong>{p.name}</strong><small>{p.category}</small></span><span className="object-price">{money(p.paid_price ?? p.estimated_price)}{p.bought && <Check size={14}/>}</span></button>)}{!list.length && <div className="empty-objects"><Check/><strong>Todo tiene su lugar.</strong><p>Añade tu próximo objeto cuando quieras.</p></div>}</div>
            {item && <div key={`${item.id}-${item.bought}`} className="selected-object"><span className="eyebrow">{item.bought ? 'YA ES PARTE DE TU HOGAR' : 'TU PRÓXIMA COMPRA'}</span><h3>{item.name}</h3><p>{item.bought ? `Comprado por ${money(item.paid_price ?? item.estimated_price)}.` : `Precio estimado: ${money(item.estimated_price)}.`}</p><p className="object-location">{locationOf(house,item.id) ? `En ${ROOMS.find(r => r.id === locationOf(house,item.id))?.name.toLowerCase()}` : 'En tu inventario'}</p><button className="text-action" onClick={() => { const destination = locationOf(house, item.id); if(destination) changeRoom(destination); setSection('home'); }}>Ver en Mi hogar <ArrowUpRight size={14}/></button>{!item.bought && <><div className="balance-after"><span>Saldo si lo compras</span><strong className={balance - item.estimated_price < 0 ? 'negative' : ''}>{money(balance - item.estimated_price)}</strong></div><Button className="purchase-action" onClick={() => open('buy')}>Registrar compra <ArrowUpRight size={18}/></Button><small>Se descontará al confirmar, no al añadirlo.</small></>}</div>}
          </div></details></section></>}</HomeAtmosphere></section>
      <details className="paper-credit"><summary>Créditos de imágenes</summary><p>Textura de papel: <a href="https://commons.wikimedia.org/wiki/File:Free_crumpled_paper_texture_for_layers_(2978651767).jpg" target="_blank" rel="noreferrer">D Sharon Pruitt / Pink Sherbet Photography</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a> · recortada y tintada.</p></details><p className="home-notice" role="status">{notice}</p>
    </main>
    <dialog ref={dialog} aria-labelledby="home-dialog-title" className="home-dialog" onClose={() => setModal(null)} onCancel={() => setModal(null)}><button className="dialog-close" onClick={close} aria-label="Cerrar"><X/></button>
      <form onSubmit={e => { e.preventDefault(); const value = Number(modal === 'buy' ? paid : price); if (!Number.isFinite(value) || value <= 0 || value > 9999999) { setError('Ingresa un precio mayor que cero y menor a 10 millones.'); return; } if (modal === 'add') { const trimmed = name.trim(); if (!trimmed) { setError('Escribe el nombre del objeto.'); return; } const id = crypto.randomUUID(); setProducts(current => [...current, { id, name: trimmed, category, estimated_price: Math.round(value * 100) / 100, paid_price: null, bought: false, quantity: 1, priority: 'P2', store: '', link: '', notes: '' }]); setHouse(previous=>{const present=roomItems(products).filter(p=>Object.hasOwn(previous[destination],p.id));return replaceRoom(previous,destination,validateRoomLayout(previous[destination],[...present,{id,kind:objectKind(trimmed)}],true));}); setRoom(destination); setSelected(id); setFilter('pending'); setName(''); setPrice(''); setNotice(`Objeto añadido a ${ROOMS.find(r=>r.id===destination)?.name}. Si no hay espacio, queda en el inventario. Tu saldo no cambió.`); } else if (item && !item.bought) { setProducts(current => current.map(p => p.id === item.id && !p.bought ? { ...p, bought: true, paid_price: Math.round(value * 100) / 100 } : p)); setFilter('bought'); setNotice(`Compra de ${item.name} registrada una sola vez.`); } close(); }}>
        <p className="eyebrow">{modal === 'add' ? 'DALE UN LUGAR' : 'UN PASO MÁS'}</p><h2 id="home-dialog-title">{modal === 'add' ? 'Añadir objeto' : 'Registrar compra'}</h2><p>{modal === 'add' ? 'Añadirlo a tu lista no descuenta dinero.' : item?.name}</p>
        {modal === 'add' && <><label>Nombre<input autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Lavadora"/></label><label>Tipo<select value={category} onChange={e => setCategory(e.target.value)}><option>Muebles</option><option>Electrodomésticos</option><option>Decoración</option><option>Iluminación</option><option>Otros</option></select></label><label>Habitación<select aria-label="Habitación del nuevo objeto" value={destination} onChange={e=>setDestination(e.target.value as RoomId)}>{ROOMS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><p>Se coloca en un espacio libre; después puedes acomodarlo. Si el cuarto está lleno, queda en el inventario.</p></>}
        <label>{modal === 'add' ? 'Precio estimado (USD)' : 'Cuánto pagaste (USD)'}<input autoFocus={modal === 'buy'} type="number" required step="0.01" min="0.01" max="9999999" inputMode="decimal" value={modal === 'buy' ? paid : price} onChange={e => modal === 'buy' ? setPaid(e.target.value) : setPrice(e.target.value)} placeholder="0.00"/></label>
        {modal === 'buy' && <div className="balance-after"><span>Saldo después de la compra</span><strong className={balance - Number(paid) < 0 ? 'negative' : ''}>{money(balance - (Number(paid) || 0))}</strong></div>}
        {modal === 'buy' && balance - Number(paid) < 0 && <p className="negative">Puedes registrarla. El saldo quedará en negativo.</p>}{error && <p role="alert" className="negative">{error}</p>}
        <Button className="primary-action" type="submit">{modal === 'add' ? 'Añadir a mi lista' : 'Confirmar compra'}</Button><button type="button" className="cancel-action" onClick={close}>Cancelar</button>
      </form>
    </dialog>
  </div>;
}


