import type { CityRepo } from '@/components/contribution-city/types';
import { WORLD } from '@/components/contribution-city/world.config';

/** Circumradius of one hex cell (world units). Change it in world.config.ts. */
export const CELL = WORLD.cell;
export const SQRT3 = Math.sqrt(3);

/** Fraction of a cell a tower fills; the rest is the street gap. */
export const TOWER_FILL = WORLD.towerFill;

const DIRS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export interface Cell {
  q: number;
  r: number;
  x: number;
  z: number;
}

export interface Building {
  repo: CityRepo;
  index: number;
  x: number;
  z: number;
  height: number;
}

export interface City {
  cells: Cell[];
  buildings: Building[];
  /** Number of rings around the centre cell */
  rings: number;
  /** World-space radius of the plate */
  radius: number;
  maxHeight: number;
}

/** Pointy-along-z hex grid (matches three's 6-sided CylinderGeometry). */
function toWorld(q: number, r: number): Cell {
  return { q, r, x: CELL * SQRT3 * (q + r / 2), z: CELL * 1.5 * r };
}

/** Centre cell first, then ring by ring outwards. Always returns whole rings. */
export function spiral(minCount: number): Cell[] {
  const out: Cell[] = [toWorld(0, 0)];
  for (let k = 1; out.length < minCount; k++) {
    let q = -k;
    let r = k;
    for (let side = 0; side < 6; side++) {
      const [dq, dr] = DIRS[side] ?? [0, 0];
      for (let step = 0; step < k; step++) {
        out.push(toWorld(q, r));
        q += dq;
        r += dr;
      }
    }
  }
  return out;
}

/** Cells of an island with the given number of rings (0 = 1 cell, 1 = 7, 2 = 19 ...). */
export function islandCells(rings: number): Cell[] {
  return spiral(1 + 3 * rings * (rings + 1));
}

/** Approximate world radius of a hex grid with this many rings. */
export function islandRadius(rings: number): number {
  return (rings * SQRT3 + 1) * CELL;
}

const MIN_H = WORLD.minTowerHeight;
const MAX_H = WORLD.maxTowerHeight;

/** Log scale so one monster repo doesn't flatten everything else. */
export function heightFor(commits: number, maxCommits: number): number {
  if (maxCommits <= 0) return MIN_H;
  return MIN_H + (MAX_H - MIN_H) * (Math.log1p(commits) / Math.log1p(maxCommits));
}

export function buildCity(repos: CityRepo[]): City {
  const sorted = [...repos].sort((a, b) => b.commits - a.commits);
  const cells = spiral(Math.max(sorted.length, WORLD.minCityCells));
  const maxCommits = sorted[0]?.commits ?? 0;

  // Busiest repos sit in the middle, so the skyline peaks at the centre.
  const buildings: Building[] = [];
  sorted.forEach((repo, index) => {
    const cell = cells[index];
    if (!cell) return;
    buildings.push({ repo, index, x: cell.x, z: cell.z, height: heightFor(repo.commits, maxCommits) });
  });

  const last = cells[cells.length - 1] ?? { q: 0, r: 0 };
  const rings = Math.max(Math.abs(last.q), Math.abs(last.r), Math.abs(last.q + last.r));
  return {
    cells,
    buildings,
    rings,
    radius: rings * CELL * SQRT3 + CELL,
    maxHeight: buildings.reduce<number>((m, b) => Math.max(m, b.height), MIN_H),
  };
}