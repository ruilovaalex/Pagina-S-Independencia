import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOM_BOUNDS, ROOM_OBSTACLES, defaultRoomLayout, validateRoomLayout, placeRoomItem, rotateRoomItem, stepRoomItem } from '../src/lib/room-layout.ts';

const sofa = { id: 'sofa', kind: 'sofa' };
const table = { id: 'table', kind: 'table' };
const other = { id: 'other', kind: 'other' };

test('los movimientos se ajustan a décimas y giros de 90 grados sin mutar el layout', () => {
  const layout = defaultRoomLayout([other]);
  const result = placeRoomItem(layout, [other], other.id, { x: .34, z: -.16, rotation: Math.PI / 2 + .1 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.layout.other, { x: .3, z: -.2, rotation: Math.PI / 2 });
  assert.notEqual(result.layout, layout);
  assert.equal(layout.other.x, -2.5);
});

test('los límites incluyen toda la huella del mueble y rechazan el movimiento sin cambiarlo', () => {
  const layout = defaultRoomLayout([sofa]);
  assert.equal(placeRoomItem(layout, [sofa], sofa.id, { x: 2.1, z: 0, rotation: 0 }).ok, true);
  const outside = placeRoomItem(layout, [sofa], sofa.id, { x: 2.2, z: 0, rotation: 0 });
  assert.equal(outside.ok, false);
  assert.match(outside.reason, /dentro del cuarto/);
  assert.equal(outside.layout, layout);
  assert.equal(placeRoomItem(layout, [sofa], sofa.id, { x: 0, z: 2.3, rotation: 0 }).ok, false);
});

test('un giro intercambia la anchura y la profundidad al comprobar el suelo', () => {
  const layout = defaultRoomLayout([sofa]);
  assert.equal(placeRoomItem(layout, [sofa], sofa.id, { x: 2.4, z: 0, rotation: 0 }).ok, false);
  assert.equal(placeRoomItem(layout, [sofa], sofa.id, { x: 2.4, z: 0, rotation: Math.PI / 2 }).ok, true);
  assert.equal(placeRoomItem(layout, [sofa], sofa.id, { x: 0, z: 2.0, rotation: Math.PI / 2 }).ok, false);
});

test('un destino ocupado rechaza mover y girar el mueble; bordes en contacto no se solapan', () => {
  const items = [sofa, table];
  const layout = validateRoomLayout({ sofa: { x: 0, z: 0, rotation: 0 }, table: { x: 0, z: 1.4, rotation: 0 } }, items);
  const collision = placeRoomItem(layout, items, table.id, { x: 0, z: .8, rotation: 0 });
  assert.equal(collision.ok, false);
  assert.match(collision.reason, /otro mueble/);
  assert.equal(collision.layout, layout);
  assert.equal(placeRoomItem(layout, items, table.id, { x: 0, z: 1, rotation: 0 }).ok, true);
  assert.equal(placeRoomItem(layout, items, table.id, { x: 0, z: 1, rotation: Math.PI / 2 }).ok, false);
});

test('almacenamiento corrupto, datos heredados e IDs extra se sustituyen por defaults seguros', () => {
  const items = [sofa, table, other];
  const stored = Object.assign(Object.create({ other: { x: 1, z: 1, rotation: 0 } }), {
    sofa: { x: Infinity, z: 0, rotation: 0 }, table: { x: '1', z: 0, rotation: NaN },
    extra: { x: 0, z: 0, rotation: 0 },
  });
  const layout = validateRoomLayout(stored, items);
  assert.deepEqual(layout, defaultRoomLayout(items));
  assert.equal(Object.hasOwn(layout, 'extra'), false);
  assert.deepEqual(validateRoomLayout(null, items), defaultRoomLayout(items));
  assert.deepEqual(validateRoomLayout([], items), defaultRoomLayout(items));
  assert.deepEqual(validateRoomLayout({ sofa: { x: 100, z: 100, rotation: 0 } }, items), defaultRoomLayout(items));
});

test('los objetos repetidos reciben posiciones libres distintas y persisten al volver a validar', () => {
  const items = [sofa, { id: 'sofa-2', kind: 'sofa' }, table, { id: 'table-2', kind: 'table' }];
  const layout = defaultRoomLayout(items);
  assert.equal(Object.keys(layout).length, items.length);
  assert.notDeepEqual(layout.sofa, layout['sofa-2']);
  assert.notDeepEqual(layout.table, layout['table-2']);
  for (const item of items) assert.equal(placeRoomItem(layout, items, item.id, layout[item.id]).ok, true);
  assert.deepEqual(validateRoomLayout(JSON.parse(JSON.stringify(layout)), items), layout);
});

test('un layout válido conserva intercambios completos y normaliza rotaciones negativas', () => {
  const items = [other, { id: 'other-2', kind: 'other' }];
  const layout = validateRoomLayout({ other: { x: 1.2, z: .8, rotation: -Math.PI / 2 }, 'other-2': { x: -1.2, z: -.8, rotation: Math.PI * 4 } }, items);
  assert.deepEqual(layout.other, { x: 1.2, z: .8, rotation: Math.PI * 1.5 });
  assert.deepEqual(layout['other-2'], { x: -1.2, z: -.8, rotation: 0 });
});

test('pasos y objetos desconocidos usan la misma validación que la colocación directa', () => {
  const layout = validateRoomLayout({ other: { x: 0, z: 0, rotation: 0 } }, [other]);
  assert.deepEqual(stepRoomItem(layout, [other], other.id, .1, -.1).layout.other, { x: .1, z: -.1, rotation: 0 });
  assert.equal(stepRoomItem(layout, [other], other.id, 20, 0).ok, false);
  assert.equal(stepRoomItem(layout, [other], other.id, NaN, 0).ok, false);
  assert.equal(placeRoomItem(layout, [other], 'deleted', { x: 0, z: 0, rotation: 0 }).ok, false);
});

test('IDs especiales no alteran el prototipo y getters del almacenamiento no se ejecutan', () => {
  const item = { id: '__proto__', kind: 'other' };
  const saved = JSON.parse('{"__proto__":{"x":0,"z":0,"rotation":0}}');
  const layout = validateRoomLayout(saved, [item]);
  assert.equal(Object.getPrototypeOf(layout), null);
  assert.deepEqual(layout.__proto__, { x: 0, z: 0, rotation: 0 });
  const getters = { get other() { throw new Error('getter no confiable'); } };
  assert.deepEqual(validateRoomLayout(getters, [other]), defaultRoomLayout([other]));
});

test('un cuarto lleno omite objetos sin espacio y permite añadirlos al liberar un lugar', () => {
  const items = Array.from({ length: 16 }, (_, i) => ({ id: `bed-${i}`, kind: 'bed' }));
  const layout = defaultRoomLayout(items);
  const placed = Object.keys(layout);
  assert.ok(placed.length > 0 && placed.length < items.length);
  for (const id of placed) assert.equal(placeRoomItem(layout, items, id, layout[id]).ok, true);
  const missing = items.find(item => !Object.hasOwn(layout, item.id));
  const occupied = layout[placed[0]];
  assert.equal(placeRoomItem(layout, items, missing.id, occupied).ok, false);
  const freed = { ...layout };
  delete freed[placed[0]];
  const added = placeRoomItem(freed, items, missing.id, occupied);
  assert.equal(added.ok, true);
  assert.deepEqual(added.layout[missing.id], occupied);
  assert.equal(stepRoomItem(layout, items, missing.id, 0, 0).ok, false);
  assert.deepEqual(validateRoomLayout(JSON.parse(JSON.stringify(layout)), items), layout);
});

test('las plantas y la lámpara reservan espacio y rechazan movimientos sin cambiar el layout', () => {
  const layout = defaultRoomLayout([other]);
  for (const obstacle of ROOM_OBSTACLES) {
    const blocked = placeRoomItem(layout, [other], other.id, { x: obstacle.x, z: obstacle.z, rotation: 0 });
    assert.equal(blocked.ok, false);
    assert.match(blocked.reason, /planta o la lámpara/);
    assert.equal(blocked.layout, layout);
  }
  const onPlant = { x: -2.8, z: 2.1, rotation: 0 };
  const storedOnPlant = validateRoomLayout({ other: onPlant }, [other]);
  assert.notDeepEqual(storedOnPlant.other, onPlant);
  assert.equal(placeRoomItem(storedOnPlant, [other], other.id, storedOnPlant.other).ok, true);
  const bed = { id: 'bed', kind: 'bed' };
  const safeBed = defaultRoomLayout([bed]);
  assert.equal(placeRoomItem(safeBed, [bed], bed.id, safeBed.bed).ok, true);
  assert.equal(safeBed.bed.z, .8);
});

test('girar mantiene el centro cuando cabe y cuatro giros recuperan la orientación inicial', () => {
  const items = [table];
  const original = validateRoomLayout({ table: { x: 0, z: 0, rotation: 0 } }, items);
  let layout = original;
  for (let turn = 0; turn < 4; turn++) {
    const result = rotateRoomItem(layout, items, table.id);
    assert.equal(result.ok, true);
    assert.equal(result.adjusted, false);
    assert.equal(result.layout.table.x, 0);
    assert.equal(result.layout.table.z, 0);
    layout = result.layout;
  }
  assert.deepEqual(layout.table, original.table);
  assert.equal(rotateRoomItem(original, items, table.id, -1).layout.table.rotation, Math.PI * 1.5);
});

test('un giro contra el borde busca el hueco más cercano con la orientación solicitada', () => {
  const tv = { id: 'tv', kind: 'tv' };
  const layout = validateRoomLayout({ tv: { x: 0, z: -2.5, rotation: 0 } }, [tv]);
  assert.equal(layout.tv.z, -2.5);
  const result = rotateRoomItem(layout, [tv], tv.id);
  assert.equal(result.ok, true);
  assert.equal(result.adjusted, true);
  assert.match(result.message, /espacio libre más cercano/);
  assert.deepEqual(result.layout.tv, { x: 0, z: -2.2, rotation: Math.PI / 2 });
  assert.equal(placeRoomItem(result.layout, [tv], tv.id, result.layout.tv).ok, true);
  assert.deepEqual(layout.tv, { x: 0, z: -2.5, rotation: 0 });
});

test('todos los muebles iniciales giran sin mover vecinos ni perder posiciones al recargar', () => {
  const items = ['sofa', 'table', 'bed', 'fridge', 'washer', 'tv', 'other'].map(kind => ({ id: kind, kind }));
  const layout = defaultRoomLayout(items);
  for (const item of items) {
    const result = rotateRoomItem(layout, items, item.id);
    assert.equal(result.ok, true, `${item.id}: ${result.reason}`);
    assert.equal(result.adjusted, false, `${item.id} debe tener espacio para girar sobre su centro`);
    assert.equal(result.layout[item.id].rotation, Math.PI / 2);
    for (const neighbor of items) {
      if (neighbor.id !== item.id) assert.deepEqual(result.layout[neighbor.id], layout[neighbor.id]);
      assert.equal(placeRoomItem(result.layout, items, neighbor.id, result.layout[neighbor.id]).ok, true);
    }
    const persisted = validateRoomLayout(JSON.parse(JSON.stringify(result.layout)), items);
    for (const neighbor of items) assert.deepEqual(persisted[neighbor.id], result.layout[neighbor.id]);
  }
});

test('un giro sin espacio conserva todo el snapshot y ofrece una salida clara', () => {
  const items = Array.from({ length: 16 }, (_, i) => ({ id: `bed-${i}`, kind: 'bed' }));
  const layout = defaultRoomLayout(items);
  const blockedId = Object.keys(layout).find(id => !rotateRoomItem(layout, items, id).ok);
  assert.ok(blockedId, 'El cuarto lleno debe incluir un mueble sin hueco para girar');
  const result = rotateRoomItem(layout, items, blockedId);
  assert.equal(result.ok, false);
  assert.equal(result.layout, layout);
  assert.match(result.reason, /Mueve otro mueble/);
  const omitted = items.find(item => !Object.hasOwn(layout, item.id));
  assert.equal(rotateRoomItem(layout, items, omitted.id).ok, false);
  assert.equal(rotateRoomItem(layout, items, 'deleted').ok, false);
  assert.equal(rotateRoomItem(layout, items, Object.keys(layout)[0], Infinity).ok, false);
});

test('el suelo ampliado permite colocar muebles en la zona nueva manteniendo sus límites reales', () => {
  const layout = defaultRoomLayout([table]);
  assert.equal(ROOM_BOUNDS.width, 6.4);
  assert.equal(ROOM_BOUNDS.depth, 5.6);
  const expanded = placeRoomItem(layout, [table], table.id, { x: 2.3, z: 0, rotation: 0 });
  assert.equal(expanded.ok, true);
  assert.equal(placeRoomItem(expanded.layout, [table], table.id, { x: 2.6, z: 0, rotation: 0 }).ok, false);
  const beds = Array.from({ length: 6 }, (_, i) => ({ id: `bed-${i}`, kind: 'bed' }));
  const roomy = defaultRoomLayout(beds);
  assert.equal(Object.keys(roomy).length, beds.length);
  for (const bed of beds) assert.equal(placeRoomItem(roomy, beds, bed.id, roomy[bed.id]).ok, true);
});

test('ampliar la habitación conserva las posiciones válidas guardadas en el cuarto anterior', () => {
  const items = ['sofa', 'table', 'bed', 'fridge', 'washer', 'tv', 'other'].map(kind => ({ id: kind, kind }));
  const old = {
    sofa: { x: -1.1, z: -.6, rotation: 0 }, table: { x: -.9, z: .7, rotation: 0 },
    bed: { x: 1.4, z: .6, rotation: 0 }, fridge: { x: 1.9, z: -1.8, rotation: 0 },
    washer: { x: .9, z: -1.8, rotation: 0 }, tv: { x: -.1, z: -1.9, rotation: 0 },
    other: { x: -1.9, z: .6, rotation: 0 },
  };
  const restored = validateRoomLayout(JSON.parse(JSON.stringify(old)), items);
  for (const item of items) assert.deepEqual(restored[item.id], old[item.id]);
});
