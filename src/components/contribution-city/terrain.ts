import * as THREE from 'three';
import type { PeakKey } from './types';

/** Rectangular island, long on X. Mountain fills the back (−z) half; the city sits at its foot. */
export const ISLAND = { w: 72, d: 34, zMin: -22, zMax: 12 } as const;

export const PEAKS: readonly { key: PeakKey; label: string; x: number; z: number; h: number }[] = [
  { key: 'skills', label: 'Skills', x: -5, z: -14, h: 10.5 },
  { key: 'experience', label: 'Experience', x: 13, z: -16, h: 13.5 },
  { key: 'projects', label: 'Projects', x: 31, z: -14, h: 11.5 },
];

export const MAX_PEAK = 13.5;

const ss = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function terrainHeight(x: number, z: number): number {
  // Pointed cones, not round hills: reads as folded paper.
  let peaks = 0;
  for (const p of PEAKS) {
    const r = Math.hypot((x - p.x) / 12, (z - p.z) / 10);
    peaks = Math.max(peaks, p.h * Math.pow(Math.max(0, 1 - r), 1.5));
  }
  const back = ss(-1, -11, z) * (4.4 + 0.8 * Math.sin(x * 0.35) + 0.5 * Math.sin(x * 0.9 + 1));
  // Arms that curve toward the viewer at both ends so the town is cradled.
  const arms = ss(22, 30, Math.abs(x)) * ss(2, -8, z) * 5;
  const h = Math.max(peaks, back, arms);
  // Close the footprint at the slab edges.
  const edge = ss(ISLAND.w / 2, ISLAND.w / 2 - 6, Math.abs(x)) * ss(ISLAND.zMin, ISLAND.zMin + 5, z);
  return Math.max(0, h * edge);
}
