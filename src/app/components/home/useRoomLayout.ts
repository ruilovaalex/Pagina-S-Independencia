import { useCallback, useEffect, useRef, useState } from 'react';
import {
  defaultRoomLayout, placeRoomItem, rotateRoomItem, stepRoomItem, validateRoomLayout,
  type Placement, type RoomItem, type RoomLayout,
} from '../../../lib/room-layout';

const INITIAL_STATUS = 'La distribución se guarda en este navegador.';
const HISTORY_LIMIT = 30;
export interface LayoutSource { layout: RoomLayout; onChange: (layout: RoomLayout) => void; status: string }
type LayoutState = { layout: RoomLayout; status: string; dragging: boolean; canUndo: boolean; canRedo: boolean };

function copyLayout(layout: RoomLayout): RoomLayout {
  return Object.fromEntries(Object.entries(layout).map(([id, placement]) => [id, { ...placement }]));
}

function sameLayout(first: RoomLayout, second: RoomLayout) {
  const ids = Object.keys(first);
  return ids.length === Object.keys(second).length && ids.every(id => {
    const a = first[id];
    const b = second[id];
    return Object.hasOwn(second, id) && b && a.x === b.x && a.z === b.z && a.rotation === b.rotation;
  });
}

function readLayout(items: RoomItem[], key: string): { layout: RoomLayout; status: string } {
  try {
    const value = localStorage.getItem(key);
    if (!value) return { layout: defaultRoomLayout(items), status: INITIAL_STATUS };
    const saved: unknown = JSON.parse(value);
    if (!saved || typeof saved !== 'object' || !('version' in saved) || saved.version !== 1 || !('layout' in saved) || !saved.layout || typeof saved.layout !== 'object' || Array.isArray(saved.layout)) {
      return { layout: defaultRoomLayout(items), status: 'La distribución guardada no es válida. Se usó la vista inicial.' };
    }
    return { layout: validateRoomLayout(saved.layout, items), status: INITIAL_STATUS };
  } catch {
    return { layout: defaultRoomLayout(items), status: 'No se pudo leer la distribución. Puedes organizarla en esta página.' };
  }
}

export default function useRoomLayout(items: RoomItem[], storageKey: string, source?: LayoutSource) {
  // Buying an item changes its appearance, but must not erase the room or its undo history.
  const signature = JSON.stringify(items.map(item => [item.id, item.kind]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  const [state, setState] = useState<LayoutState>(() => ({ ...(source ? {layout:validateRoomLayout(source.layout,items,false),status:source.status} : readLayout(items, storageKey)), dragging: false, canUndo: false, canRedo: false }));
  const externalRef = useRef(source);
  externalRef.current = source;
  const stateRef = useRef(state);
  const itemsRef = useRef(items);
  const sourceRef = useRef({ storageKey, signature });
  const historyRef = useRef<{ past: RoomLayout[]; future: RoomLayout[] }>({ past: [], future: [] });
  const dragRef = useRef<RoomLayout | null>(null);
  itemsRef.current = items;

  const publish = useCallback((layout: RoomLayout, status: string, dragging = dragRef.current !== null) => {
    const history = historyRef.current;
    const next: LayoutState = { layout, status, dragging, canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
    stateRef.current = next;
    setState(next);
  }, []);

  const save = useCallback((layout: RoomLayout) => {
    if (externalRef.current) {
      externalRef.current.onChange(layout);
      return externalRef.current.status;
    }
    try {
      localStorage.setItem(sourceRef.current.storageKey, JSON.stringify({ version: 1, layout }));
      return 'Distribución guardada en este navegador.';
    } catch {
      return 'No se pudo guardar. Los cambios siguen disponibles hasta cerrar esta página.';
    }
  }, []);

  useEffect(() => {
    const previous = sourceRef.current;
    if (previous.storageKey === storageKey && previous.signature === signature && (!source || sameLayout(source.layout, stateRef.current.layout))) return;
    const committed = dragRef.current ?? stateRef.current.layout;
    const next = source ? {layout:validateRoomLayout(source.layout,itemsRef.current,false),status:source.status} : previous.storageKey === storageKey
      ? { layout: validateRoomLayout(committed, itemsRef.current), status: 'Tus objetos se actualizaron; se conservó la distribución.' }
      : readLayout(itemsRef.current, storageKey);
    sourceRef.current = { storageKey, signature };
    dragRef.current = null;
    historyRef.current = { past: [], future: [] };
    publish(next.layout, next.status, false);
  }, [storageKey, signature, publish, source?.layout]);

  const cancelDrag = useCallback(() => {
    const original = dragRef.current;
    if (!original) return;
    dragRef.current = null;
    publish(original, 'Movimiento cancelado.', false);
  }, [publish]);

  const confirm = useCallback((layout: RoomLayout, before: RoomLayout, message?: string) => {
    if (sameLayout(layout, before)) {
      publish(layout, 'El mueble quedó en el mismo lugar.', false);
      return;
    }
    const history = historyRef.current;
    history.past = [...history.past, copyLayout(before)].slice(-HISTORY_LIMIT);
    history.future = [];
    const saved = save(layout);
    publish(layout, message ? `${message} ${saved}` : saved, false);
  }, [publish, save]);

  const beginDrag = useCallback(() => {
    if (dragRef.current) return;
    dragRef.current = copyLayout(stateRef.current.layout);
    publish(stateRef.current.layout, 'Arrastra el mueble hacia su nuevo lugar.', true);
  }, [publish]);

  const preview = useCallback((id: string, candidate: Placement) => {
    if (!dragRef.current) return false;
    const result = placeRoomItem(stateRef.current.layout, itemsRef.current, id, candidate);
    const status = result.ok ? 'Suelta para colocar el mueble.' : result.reason ?? 'No se puede colocar ahí.';
    if (!sameLayout(result.layout, stateRef.current.layout) || status !== stateRef.current.status) {
      publish(result.layout, status, true);
    }
    return result.ok;
  }, [publish]);

  const commitDrag = useCallback(() => {
    const before = dragRef.current;
    if (!before) return;
    dragRef.current = null;
    confirm(stateRef.current.layout, before);
  }, [confirm]);

  const place = useCallback((id: string, candidate: Placement) => {
    cancelDrag();
    const before = stateRef.current.layout;
    const result = placeRoomItem(before, itemsRef.current, id, candidate);
    if (!result.ok) {
      publish(before, result.reason ?? 'No se puede colocar ahí.', false);
      return false;
    }
    confirm(result.layout, before);
    return true;
  }, [cancelDrag, confirm, publish]);

  const step = useCallback((id: string, dx: number, dz: number) => {
    cancelDrag();
    const before = stateRef.current.layout;
    const result = stepRoomItem(before, itemsRef.current, id, dx, dz);
    if (!result.ok) {
      publish(before, result.reason ?? 'No se puede mover en esa dirección.', false);
      return false;
    }
    confirm(result.layout, before);
    return true;
  }, [cancelDrag, confirm, publish]);

  const rotate = useCallback((id: string) => {
    cancelDrag();
    const before = stateRef.current.layout;
    const result = rotateRoomItem(before, itemsRef.current, id);
    if (!result.ok) {
      publish(before, result.reason ?? 'No se puede girar aquí.', false);
      return false;
    }
    // One history entry and one persisted snapshot cover rotation plus the
    // automatic position adjustment, so Undo restores both together.
    confirm(result.layout, before, result.message);
    return true;
  }, [cancelDrag, confirm, publish]);

  const undo = useCallback(() => {
    cancelDrag();
    const history = historyRef.current;
    const layout = history.past.pop();
    if (!layout) return;
    history.future = [...history.future, copyLayout(stateRef.current.layout)].slice(-HISTORY_LIMIT);
    publish(layout, save(layout), false);
  }, [cancelDrag, publish, save]);

  const redo = useCallback(() => {
    cancelDrag();
    const history = historyRef.current;
    const layout = history.future.pop();
    if (!layout) return;
    history.past = [...history.past, copyLayout(stateRef.current.layout)].slice(-HISTORY_LIMIT);
    publish(layout, save(layout), false);
  }, [cancelDrag, publish, save]);

  const reset = useCallback(() => {
    cancelDrag();
    const items = externalRef.current ? itemsRef.current.filter(item => Object.hasOwn(stateRef.current.layout,item.id)) : itemsRef.current;
    confirm(defaultRoomLayout(items), stateRef.current.layout);
  }, [cancelDrag, confirm]);

  const remove = useCallback((id: string) => {
    cancelDrag();
    const before = stateRef.current.layout;
    const layout = Object.fromEntries(Object.entries(before).filter(([key]) => key !== id));
    confirm(layout, before, 'Objeto devuelto al inventario. La compra y el saldo no cambiaron.');
  }, [cancelDrag, confirm]);

  return { ...state, beginDrag, preview, commitDrag, cancelDrag, place, step, rotate, remove, undo, redo, reset };
}
