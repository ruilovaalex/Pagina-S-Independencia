import { defaultRoomLayout, validateRoomLayout, type RoomItem, type RoomLayout } from './room-layout.ts';

export const ROOMS = [
  { id: 'living', name: 'Sala', label: 'Un lugar para estar', wall: '#ddd6bf' },
  { id: 'bedroom', name: 'Dormitorio', label: 'Tu pausa del día', wall: '#e1bdc4' },
  { id: 'kitchen', name: 'Cocina', label: 'Lo cotidiano también cuenta', wall: '#c7d2b2' },
  { id: 'bathroom', name: 'Baño', label: 'Un pequeño refugio', wall: '#d4ddcd' },
] as const;
export type RoomId = typeof ROOMS[number]['id'];
export type House = Record<RoomId, RoomLayout>;
export function objectKind(name: string): RoomItem['kind'] {
  const text = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/sofa|sillon/.test(text)) return 'sofa';
  if (/mesa|escritorio/.test(text)) return 'table';
  if (/cama|colchon/.test(text)) return 'bed';
  if (/refri|nevera/.test(text)) return 'fridge';
  if (/lavadora/.test(text)) return 'washer';
  if (/televisor|^tv$/.test(text)) return 'tv';
  return 'other';
}
export function suggestedRoom(kind: RoomItem['kind']): RoomId {
  return kind === 'bed' ? 'bedroom' : kind === 'fridge' ? 'kitchen' : kind === 'washer' ? 'bathroom' : 'living';
}
export function defaultHouse(items: RoomItem[]): House {
  return Object.fromEntries(ROOMS.map(room => [room.id, defaultRoomLayout(items.filter(item => suggestedRoom(item.kind) === room.id))])) as House;
}
/** Missing placements mean inventory; never refill them or modify purchase records. */
export function validateHouse(value: unknown, items: RoomItem[]): House {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<House> : {};
  const assigned = new Set<string>();
  return Object.fromEntries(ROOMS.map(room => {
    const layout = validateRoomLayout(source[room.id], items.filter(item => !assigned.has(item.id)), false);
    Object.keys(layout).forEach(id => assigned.add(id));
    return [room.id, layout];
  })) as House;
}
/** A placement belongs to one room. Moving it between rooms preserves the purchase. */
export function replaceRoom(house: House, room: RoomId, layout: RoomLayout): House {
  const moving = new Set(Object.keys(layout));
  return Object.fromEntries(ROOMS.map(entry => [entry.id, entry.id === room ? layout : Object.fromEntries(Object.entries(house[entry.id]).filter(([id]) => !moving.has(id)))])) as House;
}
export function locationOf(house: House, id: string): RoomId | undefined {
  return ROOMS.find(room => Object.hasOwn(house[room.id], id))?.id;
}
