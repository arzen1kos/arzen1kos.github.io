import * as THREE from 'three';
import type { PeakKey } from './types';

/**
 * Octagonal island (a regular octagon stretched to w × d), centred at (0, cz).
 * The mountain stands in the centre; the city forms a ring around its foot.
 * Every consumer (slab, grid, terrain, towers) uses this one definition.
 */
const W = 43;
const D = 38;
const CZ = 0;
export const ISLAND = { w: W, d: D, cz: CZ, zMin: CZ - D / 2, zMax: CZ + D / 2 };

/** Corner cut of a regular octagon, as a fraction of the half-extent: √2 − 1. */
export const OCT_CUT = Math.SQRT2 - 1;

export const PEAKS: readonly { key: PeakKey; label: string; x: number; z: number; h: number }[] = [
  { key: 'skills', label: 'Skills', x: -11, z: 3, h: 10.5 },
  { key: 'experience', label: 'Experience', x: 0, z: -4, h: 13.5 },
  { key: 'projects', label: 'Projects', x: 11, z: 3, h: 11.5 },
];

/** Mountain footprint: an irregular ellipse centred on the island. */
export const MOUNTAIN = { rx: 22, rz: 18 };

export const MAX_PEAK = 13.5;

const ss = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** The 8 corners as [x, z], counter-clockwise from the back-right. */
export function octagonPoints(): [number, number][] {
  const A = W / 2, B = D / 2, k = OCT_CUT;
  return [
    [A * k, CZ - B], [A, CZ - B * k], [A, CZ + B * k], [A * k, CZ + B],
    [-A * k, CZ + B], [-A, CZ + B * k], [-A, CZ - B * k], [-A * k, CZ - B],
  ];
}

/** Approximate distance (world units) from (x, z) to the island edge. Positive inside, negative outside. */
export function islandEdgeDistance(x: number, z: number): number {
  const A = W / 2, B = D / 2;
  const nx = Math.abs(x) / A;
  const nz = Math.abs(z - CZ) / B;
  const diagonal = ((1 + OCT_CUT - nx - nz) * Math.min(A, B)) / Math.SQRT2;
  return Math.min(A * (1 - nx), B * (1 - nz), diagonal);
}

/** Normalised radius of (x, z) inside the mountain footprint: < 1 inside, 1 on the foot line. Outline is slightly lumpy. */
function mountainRn(x: number, z: number): number {
  const th = Math.atan2(z, x);
  const lump = 1 + 0.07 * Math.sin(3 * th + 0.8) + 0.04 * Math.sin(5 * th + 2);
  return Math.hypot(x / MOUNTAIN.rx, z / MOUNTAIN.rz) / lump;
}

/** Approximate distance in world units from the mountain's foot line: negative inside, positive outside. */
export function mountainFootDistance(x: number, z: number): number {
  const rn = mountainRn(x, z);
  if (rn < 1e-6) return -Math.min(MOUNTAIN.rx, MOUNTAIN.rz);
  const r = Math.hypot(x, z);
  return r - r / rn;
}

export function terrainHeight(x: number, z: number): number {
  const rn = mountainRn(x, z);
  if (rn >= 1) return 0;

  // Pointed cones, not round hills: reads as folded paper.
  let peaks = 0;
  for (const p of PEAKS) {
    const r = Math.hypot((x - p.x) / 11, (z - p.z) / 10);
    peaks = Math.max(peaks, p.h * Math.pow(Math.max(0, 1 - r), 1.5));
  }
  // Shoulder that ties the peaks together and slopes down to the foot on every side.
  const dome = 5 * (1 - ss(0.3, 0.95, rn)) * (1 + 0.12 * Math.sin(x * 0.5) + 0.08 * Math.sin(z * 0.7 + 1));
  const h = Math.max(peaks, dome) * (1 - ss(0.82, 1, rn));
  return Math.max(0, h * ss(0, 6, islandEdgeDistance(x, z)));
}