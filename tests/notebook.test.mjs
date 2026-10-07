import test from 'node:test';
import assert from 'node:assert/strict';
import { notebookSummary } from '../src/lib/notebook.ts';
import { defaultHouse,replaceRoom,validateHouse,locationOf } from '../src/lib/house-state.ts';

test('las habitaciones conservan compras; mover y devolver al inventario no hace reaparecer objetos',()=>{
  const items=[{id:'bed',kind:'bed'},{id:'sofa',kind:'sofa'}];
  const original=defaultHouse(items);
  assert.equal(locationOf(original,'bed'),'bedroom');
  const moved=replaceRoom(original,'living',{bed:{x:1.8,z:.8,rotation:0}});
  assert.equal(locationOf(moved,'bed'),'living');
  assert.equal(locationOf(moved,'sofa'),undefined);
  assert.equal(Object.keys(validateHouse(moved,items).living).length,1);
  const inventory=replaceRoom(moved,'living',{});
  assert.equal(locationOf(validateHouse(inventory,items),'bed'),undefined);
  assert.equal(locationOf(original,'bed'),'bedroom','el estado anterior no fue mutado');
});
test('gasto libre protege metas, pagos vencidos y presupuesto; proyección no descuenta reservas dos veces',()=>{
  const plan={monthlyBudget:600,goals:[{id:'g',name:'Cama',target:300,reserved:200}],upcoming:[{id:'a',amount:80,due:'2026-10-05'},{id:'b',amount:50,due:'2026-10-20'},{id:'c',amount:500,due:'2026-12-01'}]};
  const result=notebookSummary(plan,900,[{amount:1000,date:'2026-10-01'}],[{amount:500,date:'2026-10-03'}],'2026-10',[],'2026-10-06');
  assert.equal(result.safeToSpend,0,'los pagos previstos también deben caber dentro del presupuesto');
  assert.equal(result.projectedBalance,770);
  assert.equal(result.savingsPercent,50);
  assert.equal(result.committed,130);
  assert.equal(result.reserved,200);
  const historical=notebookSummary(plan,900,[],[{amount:500,date:'2026-10-03'}],'2026-09',[],'2026-10-06');
  assert.equal(historical.safeToSpend,0,'consultar otro mes no aumenta lo disponible hoy');
});
test('sin ingresos no inventa un porcentaje; comprar libera reserva y los saldos negativos no permiten gastar',()=>{
  const plan={monthlyBudget:null,goals:[{id:'g',name:'Cama',target:300,reserved:300,productId:'bed'}],upcoming:[]};
  const result=notebookSummary(plan,100,[],[],'2026-10',['bed'],'2026-10-06');
  assert.equal(result.reserved,0);
  assert.equal(result.safeToSpend,100);
  assert.equal(result.savingsPercent,null);
  assert.equal(notebookSummary(plan,-20,[],[],'2026-10',['bed'],'2026-10-06').safeToSpend,0);
});
