import { ISLAND, PEAKS, islandEdgeDistance, mountainFootDistance, terrainHeight } from './terrain';

export const TOWER_RADIUS = 0.8;
const GAP = 1.18;
const EDGE_MARGIN = 2.4;   // keeps every tower (incl. its hex corners) inside the slab
const PEAK_CLEARANCE = 3.6; // keep the summits free for the floating hexagons
const TERRACE = 2.2;        // towers prefer ground near these height steps, so they line up along contours

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export type GroundFn = (x: number, z: number) => number;

/** Lowest ground under the tower's hexagonal footprint, so the base touches the terrain and never floats on a slope. */
function groundUnder(x: number, z: number, groundAt: GroundFn): number {
  let lowest = groundAt(x, z);
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    lowest = Math.min(lowest, groundAt(x + Math.cos(a) * TOWER_RADIUS, z + Math.sin(a) * TOWER_RADIUS));
  }
  return lowest;
}

/**
 * Hex-packed cells over the whole mountain and the flat ring around its foot.
 * Towers climb the slopes: cells whose ground height sits near a terrace step are preferred, which
 * strings them along contour lines at different elevations. Cells outside the foot are penalised the
 * further they are, so the city stays attached to the mountain. Each slot's `y` is measured against
 * `groundAt` (pass the real mountain mesh so towers meet the facets, not the smooth formula).
 */
export function citySlots(count: number, groundAt: GroundFn = terrainHeight): { x: number; y: number; z: number }[] {
  const sx = Math.sqrt(3) * TOWER_RADIUS * GAP;
  const sz = 1.5 * TOWER_RADIUS * GAP;

  const cells: { x: number; z: number; score: number }[] = [];
  const xMax = ISLAND.w / 2;
  for (let row = 0; ; row += 1) {
    const z = ISLAND.zMin + 2 + row * sz;
    if (z > ISLAND.zMax - 2) break;
    const offset = row % 2 ? sx / 2 : 0;
    for (let x = -xMax + offset; x <= xMax; x += sx) {
      if (islandEdgeDistance(x, z) < EDGE_MARGIN) continue;
      if (PEAKS.some((p) => Math.hypot(x - p.x, z - p.z) < PEAK_CLEARANCE)) continue;
      const gap = mountainFootDistance(x, z); // < 0 means on the mountain
      if (gap > 14) continue;
      const y = groundAt(x, z);
      const nearest = Math.round(y / TERRACE) * TERRACE;
      const terracePenalty = Math.abs(y - nearest) / (TERRACE / 2); // 0 on a terrace .. 1 midway
      const outsidePenalty = Math.max(0, gap) / 5;
      cells.push({ x, z, score: hash(x, z) * 0.8 + terracePenalty * 0.35 + outsidePenalty });
    }
  }
  cells.sort((a, b) => a.score - b.score);
  if (cells.length < count) console.warn(`[contribution-city] island holds ${cells.length} towers, ${count} repos given`);
  return cells.slice(0, count).map(({ x, z }) => ({ x, y: groundUnder(x, z, groundAt) - 0.05, z }));
}