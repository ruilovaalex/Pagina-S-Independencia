import { ROOM_BOUNDS, ROOM_FOOTPRINTS, ROOM_OBSTACLES, type RoomItem, type RoomLayout } from './room-layout.ts';

export type CatKind = 'idle' | 'hello' | 'play' | 'walk' | 'sit' | 'sleep' | 'look' | 'celebrate' | 'low_balance';
export type CatAction = { kind: CatKind; serial: number };
export const CAT_DURATION: Record<CatKind, number> = {
  idle: 2.8, hello: 2.4, play: 4.6, walk: 4.8, sit: 1.6,
  sleep: 1.6, look: 2.5, celebrate: 3.2, low_balance: 2.2,
};
export type CatProgress = { boughtIds: string[]; goalIds?:string[]; balance?: number; goalReached: boolean; shortfall?: boolean };

/** React to a real transition, never celebrate a freshly loaded account. */
export function catFinancialReaction(previous: CatProgress | null, next: CatProgress): CatKind | null {
  if (typeof next.balance === 'number' && Number.isFinite(next.balance) && next.balance < 0) {
    return !previous || (typeof previous.balance === 'number' && previous.balance >= 0) ? 'low_balance' : null;
  }
  if (previous) {
    const oldIds = new Set(previous.boughtIds);
    const oldGoals = new Set(previous.goalIds ?? []);
    if (next.boughtIds.some(id => !oldIds.has(id)) || (next.goalIds ?? []).some(id => !oldGoals.has(id)) || (next.goalReached && !previous.goalReached)) return 'celebrate';
  }
  if (next.shortfall && !previous?.shortfall) return 'low_balance';
  return null;
}

export function catSpotFree(x: number, z: number, items: RoomItem[], layout: RoomLayout) {
  const radius = .38;
  if (![x, z].every(Number.isFinite) || Math.abs(x) + radius > ROOM_BOUNDS.halfWidth || Math.abs(z) + radius > ROOM_BOUNDS.halfDepth) return false;
  if (ROOM_OBSTACLES.some(o => Math.abs(x-o.x) < o.width/2 + radius && Math.abs(z-o.z) < o.depth/2 + radius)) return false;
  return items.every(item => {
    const p = layout[item.id];
    if (!p) return true;
    const [w,d] = ROOM_FOOTPRINTS[item.kind];
    const turned = Math.round(p.rotation/(Math.PI/2)) % 2 !== 0;
    return Math.abs(x-p.x) >= (turned ? d : w)/2 + radius || Math.abs(z-p.z) >= (turned ? w : d)/2 + radius;
  });
}

/** Short out-and-back stroll: check the entire path, not only its end. */
export function catWalkVector(at: [number, number], items: RoomItem[], layout: RoomLayout): [number, number] {
  for (const length of [.42, .25]) {
    for (const angle of [.5, -.5, 2, -2]) {
      const dx = Math.sin(angle)*length, dz = Math.cos(angle)*length;
      if (Array.from({length: 13}, (_,i) => i/12).every(t => catSpotFree(at[0]+dx*t, at[1]+dz*t, items, layout))) return [dx,dz];
    }
  }
  return [0,0];
}
