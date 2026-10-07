import test from 'node:test';
import assert from 'node:assert/strict';
import { catFinancialReaction, catSpotFree, catWalkVector } from '../src/lib/cat-companion.ts';
import { defaultRoomLayout } from '../src/lib/room-layout.ts';

test('la mascota reacciona a compras y metas nuevas, no a cargar o reordenar datos', () => {
  const first = {boughtIds:['sofa'],balance:100,goalReached:false};
  assert.equal(catFinancialReaction(null,first),null);
  assert.equal(catFinancialReaction(first,{...first,boughtIds:['sofa']}),null);
  assert.equal(catFinancialReaction(first,{...first,boughtIds:['table','sofa']}),'celebrate');
  assert.equal(catFinancialReaction(first,{...first,goalReached:true}),'celebrate');
  assert.equal(catFinancialReaction({...first,goalReached:true},{...first,goalReached:true}),null);
  assert.equal(catFinancialReaction(first,{...first,boughtIds:[]}),null);
  assert.equal(catFinancialReaction({...first,goalIds:['one']},{...first,goalIds:['one','two']}),'celebrate');
  assert.equal(catFinancialReaction({...first,goalIds:['one','two']},{...first,goalIds:['two','one']}),null);
});
test('el saldo negativo dispara un único gesto, sin repetirlo ni premiar esa transición', () => {
  const first = {boughtIds:[],balance:10,goalReached:false};
  const next = {...first,boughtIds:['bed'],balance:-20};
  assert.equal(catFinancialReaction(first,next),'low_balance');
  assert.equal(catFinancialReaction(next,{...next,balance:-30}),null);
  assert.equal(catFinancialReaction(next,{...next,balance:20}),null);
  assert.equal(catFinancialReaction(null,{...next,balance:NaN}),null);
});
test('el paseo completo cabe dentro del suelo y evita obstáculos y muebles girados', () => {
  const items = [{id:'sofa',kind:'sofa'},{id:'table',kind:'table'},{id:'bed',kind:'bed'}];
  const layout = defaultRoomLayout(items);
  for (const at of [[0,2],[-.2,1.5],[2.7,2]]) {
    const vector = catWalkVector(at,items,layout);
    assert.ok(Math.hypot(...vector) <= .420001);
    if (vector.some(Boolean)) for (let i=0;i<=30;i++) assert.ok(catSpotFree(at[0]+vector[0]*i/30,at[1]+vector[1]*i/30,items,layout));
  }
  assert.deepEqual(catWalkVector([100,100],items,layout),[0,0]);
  assert.equal(catSpotFree(NaN,0,items,layout),false);
  const turned = {...layout,bed:{x:0,z:0,rotation:Math.PI/2}};
  assert.equal(catSpotFree(.8,0,items,turned),false);
});
