import type { CityRepo } from './types';

/** Circumradius of one hex cell (world units). */
export const CELL = 1;
export const SQRT3 = Math.sqrt(3);

/** Fraction of a cell a tower fills; the rest is the street gap. */
export const TOWER_FILL = 0.86;

/** City is never smaller than 3 rings (37 cells), so a tiny list still looks like a city plate. */
const MIN_CELLS = 37;

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
function spiral(minCount: number): Cell[] {
  const out: Cell[] = [toWorld(0, 0)];
  for (let k = 1; out.length < minCount; k++) {
    let q = -k;
    let r = k;
    for (let side = 0; side < 6; side++) {
      for (let step = 0; step < k; step++) {
        out.push(toWorld(q, r));
        q += DIRS[side][0];
        r += DIRS[side][1];
      }
    }
  }
  return out;
}

const MIN_H = 0.25;
const MAX_H = 7;

/** Log scale so one monster repo doesn't flatten everything else. */
export function heightFor(commits: number, maxCommits: number): number {
  if (maxCommits <= 0) return MIN_H;
  return MIN_H + (MAX_H - MIN_H) * (Math.log1p(commits) / Math.log1p(maxCommits));
}

export function buildCity(repos: CityRepo[]): City {
  const sorted = [...repos].sort((a, b) => b.commits - a.commits);
  const cells = spiral(Math.max(sorted.length, MIN_CELLS));
  const maxCommits = sorted[0]?.commits ?? 0;

  // Busiest repos sit in the middle, so the skyline peaks at the centre.
  const buildings: Building[] = sorted.map((repo, index) => ({
    repo,
    index,
    x: cells[index].x,
    z: cells[index].z,
    height: heightFor(repo.commits, maxCommits),
  }));

  const last = cells[cells.length - 1];
  const rings = Math.max(Math.abs(last.q), Math.abs(last.r), Math.abs(last.q + last.r));
  return {
    cells,
    buildings,
    rings,
    radius: rings * CELL * SQRT3 + CELL,
    maxHeight: buildings.reduce((m, b) => Math.max(m, b.height), MIN_H),
  };
}