import { ISLAND, islandEdgeDistance, mountainFootDistance, terrainHeight } from './terrain';

export const TOWER_RADIUS = 0.5;
const GAP = 1.03;
const EDGE_MARGIN = 0.001;  // keeps every tower (incl. its hex corners) inside the slab
const FOOT_MARGIN = 0.01;  // clear space between the mountain's foot and the first towers

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Hex-packed free cells on flat ground, ordered by closeness to the mountain's foot so towers form a ring around it. */
export function citySlots(count: number): { x: number; z: number }[] {
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
      const gap = mountainFootDistance(x, z);
      if (gap < FOOT_MARGIN || terrainHeight(x, z) > 0.6) continue;
      cells.push({ x, z, score: gap + hash(x, z) * 0.6 });
    }
  }
  cells.sort((a, b) => a.score - b.score);
  if (cells.length < count) console.warn(`[contribution-city] island holds ${cells.length} towers, ${count} repos given`);
  return cells.slice(0, count).map(({ x, z }) => ({ x, z }));
}