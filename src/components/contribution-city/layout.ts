import { ISLAND, terrainHeight } from './terrain';

export const TOWER_RADIUS = 0.8;
const GAP = 1.18;

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Hex-packed free cells on flat ground, ordered nearest-the-mountain first. */
export function citySlots(count: number): { x: number; z: number }[] {
  const sx = Math.sqrt(3) * TOWER_RADIUS * GAP;
  const sz = 1.5 * TOWER_RADIUS * GAP;

  // Where the mountain's foot is for each x (last z with real height).
  const footAt = (x: number) => {
    let foot = ISLAND.zMin;
    for (let z = ISLAND.zMin; z <= ISLAND.zMax; z += 0.5) if (terrainHeight(x, z) > 0.6) foot = z;
    return foot;
  };

  const cells: { x: number; z: number; score: number }[] = [];
  const xMax = ISLAND.w / 2 - 2;
  const zMax = ISLAND.zMax - 1.4;
  for (let row = 0; ; row += 1) {
    const z = ISLAND.zMin + 4 + row * sz;
    if (z > zMax) break;
    const offset = row % 2 ? sx / 2 : 0;
    for (let x = -xMax + offset; x <= xMax; x += sx) {
      const gap = z - footAt(x);
      if (gap < 1.6 || terrainHeight(x, z) > 0.6) continue;
      cells.push({ x, z, score: gap + Math.abs(x) * 0.012 + hash(x, z) * 0.6 });
    }
  }
  cells.sort((a, b) => a.score - b.score);
  if (cells.length < count) console.warn(`[contribution-city] island holds ${cells.length} towers, ${count} repos given`);
  return cells.slice(0, count).map(({ x, z }) => ({ x, z }));
}
