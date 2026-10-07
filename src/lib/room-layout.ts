export type RoomItem = {
  id: string;
  kind: 'sofa' | 'table' | 'bed' | 'fridge' | 'washer' | 'tv' | 'other';
};
export type Placement = { x: number; z: number; rotation: number };
export type RoomLayout = Record<string, Placement>;
type PlacementResult = { layout: RoomLayout; ok: boolean; reason?: string };

const QUARTER_TURN = Math.PI / 2;
const EPSILON = 1e-7;
const FLOOR_X = 3.2;
const FLOOR_Z = 2.8;
export const ROOM_BOUNDS = {
  width: FLOOR_X * 2, depth: FLOOR_Z * 2, halfWidth: FLOOR_X, halfDepth: FLOOR_Z,
};
export const ROOM_FOOTPRINTS: Record<RoomItem['kind'], [number, number]> = {
  sofa: [2.1, 1.05], table: [1.36, .94], bed: [2, 1.84],
  fridge: [.75, .88], washer: [.76, .82], tv: [1.15, .52], other: [.57, .53],
};
export const ROOM_OBSTACLES: Array<{ x: number; z: number; width: number; depth: number }> = [
  { x: -2.78, z: 2.1, width: .6, depth: .6 },
  { x: 2.8, z: 2.29, width: .32, depth: .32 },
  { x: -2.79, z: -2.39, width: .42, depth: .42 },
];
const preferred: Record<RoomItem['kind'], [number, number]> = {
  sofa: [-1.6, -.8], table: [-1.25, .9], fridge: [2.55, -2.15],
  bed: [1.9, .8], washer: [1.25, -2.15], tv: [-.2, -2.1], other: [-2.5, .75],
};

function emptyLayout(): RoomLayout {
  // A product ID is external data, so even "__proto__" must remain a data key.
  return Object.create(null) as RoomLayout;
}

function orderedItems(items: RoomItem[]) {
  const unique = [...new Map(items.map(item => [item.id, item])).values()];
  return unique.sort((a, b) => {
    const [ax, az] = ROOM_FOOTPRINTS[a.kind];
    const [bx, bz] = ROOM_FOOTPRINTS[b.kind];
    return bx * bz - ax * az;
  });
}

function normalized(candidate: Placement): Placement | undefined {
  if (![candidate.x, candidate.z, candidate.rotation].every(Number.isFinite)) return;
  const x = Math.round(candidate.x * 10) / 10;
  const z = Math.round(candidate.z * 10) / 10;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  const quarter = ((Math.round(candidate.rotation / QUARTER_TURN) % 4) + 4) % 4;
  return { x: x || 0, z: z || 0, rotation: quarter * QUARTER_TURN };
}

function dimensions(item: RoomItem, placement: Placement): [number, number] {
  const [width, depth] = ROOM_FOOTPRINTS[item.kind];
  const turned = Math.round(placement.rotation / QUARTER_TURN) % 2 !== 0;
  return turned ? [depth, width] : [width, depth];
}

function inside(item: RoomItem, placement: Placement) {
  const [width, depth] = dimensions(item, placement);
  return Math.abs(placement.x) + width / 2 <= FLOOR_X + EPSILON
    && Math.abs(placement.z) + depth / 2 <= FLOOR_Z + EPSILON;
}

function overlaps(item: RoomItem, placement: Placement, other: RoomItem, otherPlacement: Placement) {
  const [width, depth] = dimensions(item, placement);
  const [otherWidth, otherDepth] = dimensions(other, otherPlacement);
  return Math.abs(placement.x - otherPlacement.x) < (width + otherWidth) / 2 - EPSILON
    && Math.abs(placement.z - otherPlacement.z) < (depth + otherDepth) / 2 - EPSILON;
}

function blockedByDecor(item: RoomItem, placement: Placement) {
  const [width, depth] = dimensions(item, placement);
  return ROOM_OBSTACLES.some(obstacle =>
    Math.abs(placement.x - obstacle.x) < (width + obstacle.width) / 2 - EPSILON
    && Math.abs(placement.z - obstacle.z) < (depth + obstacle.depth) / 2 - EPSILON);
}

function available(layout: RoomLayout, itemsById: Map<string, RoomItem>, item: RoomItem, placement: Placement) {
  if (!inside(item, placement) || blockedByDecor(item, placement)) return false;
  for (const [id, otherPlacement] of Object.entries(layout)) {
    const other = itemsById.get(id);
    if (id !== item.id && other && overlaps(item, placement, other, otherPlacement)) return false;
  }
  return true;
}

function closestFree(layout: RoomLayout, itemsById: Map<string, RoomItem>, item: RoomItem, origin?: Placement, rotations = [0, QUARTER_TURN]): Placement | undefined {
  const [x, z] = preferred[item.kind];
  const start = normalized(origin ?? { x, z, rotation: 0 })!;
  if (available(layout, itemsById, item, start)) return start;
  let best: Placement | undefined;
  let bestScore = Infinity;
  for (const rotation of rotations) {
    const [width, depth] = dimensions(item, { ...start, rotation });
    const minX = Math.ceil((-FLOOR_X + width / 2) * 10);
    const maxX = Math.floor((FLOOR_X - width / 2) * 10);
    const minZ = Math.ceil((-FLOOR_Z + depth / 2) * 10);
    const maxZ = Math.floor((FLOOR_Z - depth / 2) * 10);
    for (let gridX = minX; gridX <= maxX; gridX++) {
      for (let gridZ = minZ; gridZ <= maxZ; gridZ++) {
        const candidate = { x: gridX / 10, z: gridZ / 10, rotation };
        const score = (candidate.x - start.x) ** 2 + (candidate.z - start.z) ** 2 + (rotation !== start.rotation ? .1 : 0);
        if (score < bestScore && available(layout, itemsById, item, candidate)) {
          best = candidate;
          bestScore = score;
        }
      }
    }
  }
  return best;
}

function fillMissing(layout: RoomLayout, items: RoomItem[], itemsById: Map<string, RoomItem>) {
  for (const item of items) {
    if (Object.hasOwn(layout, item.id)) continue;
    const free = closestFree(layout, itemsById, item);
    // Omitted IDs remain in the inventory, ready for a later valid placement.
    if (free) layout[item.id] = free;
  }
  return layout;
}

export function defaultRoomLayout(items: RoomItem[]): RoomLayout {
  const ordered = orderedItems(items);
  return fillMissing(emptyLayout(), ordered, new Map(ordered.map(item => [item.id, item])));
}

function savedPlacement(value: unknown, id: string): Placement | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  try {
    const candidate = Object.getOwnPropertyDescriptor(value, id)?.value;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return;
    const x = Object.getOwnPropertyDescriptor(candidate, 'x')?.value;
    const z = Object.getOwnPropertyDescriptor(candidate, 'z')?.value;
    const rotation = Object.getOwnPropertyDescriptor(candidate, 'rotation')?.value;
    if (typeof x !== 'number' || typeof z !== 'number' || typeof rotation !== 'number') return;
    return normalized({ x, z, rotation });
  } catch {
    return;
  }
}

export function validateRoomLayout(value: unknown, items: RoomItem[], fill = true): RoomLayout {
  const ordered = orderedItems(items);
  const itemsById = new Map(ordered.map(item => [item.id, item]));
  const layout = emptyLayout();
  // Accept saved positions together before filling defaults, so valid swaps
  // survive reload instead of colliding with another object's default position.
  for (const item of ordered) {
    const candidate = savedPlacement(value, item.id);
    if (candidate && available(layout, itemsById, item, candidate)) layout[item.id] = candidate;
  }
  return fill ? fillMissing(layout, ordered, itemsById) : layout;
}

export function placeRoomItem(layout: RoomLayout, items: RoomItem[], id: string, candidate: Placement): PlacementResult {
  const itemsById = new Map(items.map(item => [item.id, item]));
  const item = itemsById.get(id);
  if (!item) return { layout, ok: false, reason: 'Ese objeto ya no está en el hogar.' };
  const placement = normalized(candidate);
  if (!placement) return { layout, ok: false, reason: 'La posición no es válida.' };
  if (!inside(item, placement)) return { layout, ok: false, reason: 'El objeto debe quedar dentro del cuarto.' };
  if (blockedByDecor(item, placement)) {
    return { layout, ok: false, reason: 'Ese lugar está ocupado por una planta o la lámpara.' };
  }
  if (!available(layout, itemsById, item, placement)) {
    return { layout, ok: false, reason: 'No hay espacio: el objeto se cruza con otro mueble.' };
  }
  return { layout: { ...layout, [id]: placement }, ok: true };
}

export function stepRoomItem(layout: RoomLayout, items: RoomItem[], id: string, dx: number, dz: number): PlacementResult {
  const current = Object.hasOwn(layout, id) ? layout[id] : defaultRoomLayout(items)[id];
  if (!current) return {
    layout, ok: false,
    reason: items.some(item => item.id === id) ? 'No hay espacio para ese objeto. Elige un lugar libre.' : 'Ese objeto ya no está en el hogar.',
  };
  return placeRoomItem(layout, items, id, { x: current.x + dx, z: current.z + dz, rotation: current.rotation });
}

/** Rotate one item only; move it to the nearest free grid position if needed. */
export function rotateRoomItem(layout: RoomLayout, items: RoomItem[], id: string, quarterTurns = 1): PlacementResult & { adjusted?: boolean; message?: string } {
  const itemsById = new Map(items.map(item => [item.id, item]));
  const item = itemsById.get(id);
  if (!item) return { layout, ok: false, reason: 'Ese objeto ya no está en el hogar.' };
  const current = Object.hasOwn(layout, id) ? layout[id] : undefined;
  if (!current) return { layout, ok: false, reason: 'Primero coloca el mueble en el cuarto.' };
  const target = normalized({ ...current, rotation: current.rotation + quarterTurns * QUARTER_TURN });
  if (!target) return { layout, ok: false, reason: 'El giro no es válido.' };
  // Searching with the requested orientation prevents an apparent successful
  // rotation that silently falls back to the item's original orientation.
  const placement = closestFree(layout, itemsById, item, target, [target.rotation]);
  if (!placement) return { layout, ok: false, reason: 'No hay espacio para girarlo. Mueve otro mueble y vuelve a intentar.' };
  const adjusted = placement.x !== current.x || placement.z !== current.z;
  return {
    layout: { ...layout, [id]: placement }, ok: true, adjusted,
    message: adjusted ? 'Mueble girado; se movió al espacio libre más cercano.' : 'Mueble girado sin cambiar su posición.',
  };
}
