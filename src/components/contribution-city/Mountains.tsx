import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ExperienceEntry, ExperienceMountain } from '@/components/contribution-city/types';
import type { TerrainData } from '@/components/contribution-city/portfolio-types';
import { WORLD } from '@/components/contribution-city/world.config';

interface MountainsProps {
  mountains: ExperienceMountain[];
  terrain: TerrainData;
  selectedId: number | null;
  onSelectFlag: (entry: ExperienceEntry, position: [number, number, number]) => void;
  onOpenMountain: (mountain: ExperienceMountain, position: [number, number, number]) => void;
  onHover: (key: string | null, label?: string) => void;
}

interface Surface {
  geometry: THREE.BufferGeometry;
  creases: THREE.BufferGeometry;
  heightAt: (x: number, z: number) => number;
  x: number;
  z: number;
}

/* ------------------------------------------------------------------ */
/* Shared resources (created once, reused by every mountain / flag)    */
/* ------------------------------------------------------------------ */

// Lambert is cheaper than Standard; normals are baked per face so it reads as flat paper.
const PAPER_MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
const CREASE_MATERIAL = new THREE.LineBasicMaterial({ color: '#fffaf0', transparent: true, opacity: 0.38 });
const TRAIL_MATERIAL = new THREE.MeshBasicMaterial({ color: '#c8342b', transparent: true, opacity: 0.85 });

const POLE_GEOMETRY = new THREE.CylinderGeometry(0.035, 0.035, 1.24, 5);
// Origami-style triangular pennant
const PENNANT_GEOMETRY = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0.16, 0, 0, -0.16, 0, 0.5, 0, 0.04], 3),
  );
  g.computeVertexNormals();
  return g;
})();
const HIT_GEOMETRY = new THREE.BoxGeometry(0.85, 1.35, 0.5);

const POLE_MATERIAL = new THREE.MeshLambertMaterial({ color: '#f4efe6' });
const HIT_MATERIAL = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const PENNANT_IDLE = new THREE.MeshLambertMaterial({
  color: '#5eead4',
  emissive: '#5eead4',
  emissiveIntensity: 0.2,
  side: THREE.DoubleSide,
});
const PENNANT_ACTIVE = new THREE.MeshLambertMaterial({
  color: '#fbbf24',
  emissive: '#fbbf24',
  emissiveIntensity: 0.7,
  side: THREE.DoubleSide,
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const hash2 = (x: number, z: number, seed: number) => {
  const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

const LIGHT = new THREE.Vector3(-0.5, 0.82, 0.3).normalize();

function makeSurface(mountain: ExperienceMountain, terrain: TerrainData): Surface {
  const radius = mountain.radius ?? 14;
  const height = mountain.height ?? 9;
  const seed = mountain.seed ?? 17;
  const angle = ((mountain.angleDegrees ?? 35) * Math.PI) / 180;
  const distance = mountain.distance ?? 29;
  const centerX = Math.cos(angle) * distance;
  const centerZ = Math.sin(angle) * distance;

  // Low segment count = big folded facets AND a tiny memory footprint.
  const segments = 22;
  const cell = (radius * 2) / segments;

  const elevations = terrain.elevations;
  const side = terrain.samplesPerSide;
  const terrainRadius = terrain.radiusKm * WORLD.unitPerKm;
  let minElevation = 0;
  if (elevations.length) {
    minElevation = Infinity;
    for (let i = 0; i < elevations.length; i += 1) {
      const e = elevations[i] ?? 0;
      if (e < minElevation) minElevation = e;
    }
  }

  const sampleMap = (worldX: number, worldZ: number) => {
    if (elevations.length !== side * side || terrainRadius <= 0) return 0;
    const u = THREE.MathUtils.clamp((worldX / terrainRadius + 1) * 0.5, 0, 1) * (side - 1);
    const v = THREE.MathUtils.clamp((worldZ / terrainRadius + 1) * 0.5, 0, 1) * (side - 1);
    const x0 = Math.floor(u);
    const z0 = Math.floor(v);
    const x1 = Math.min(x0 + 1, side - 1);
    const z1 = Math.min(z0 + 1, side - 1);
    const tx = u - x0;
    const tz = v - z0;
    const at = (row: number, col: number) => elevations[row * side + col] ?? minElevation;
    const a = THREE.MathUtils.lerp(at(z0, x0), at(z0, x1), tx);
    const b = THREE.MathUtils.lerp(at(z1, x0), at(z1, x1), tx);
    return THREE.MathUtils.lerp(a, b, tz);
  };

  const ridges = [-0.73, -0.34, 0.08, 0.48, 0.78];

  const heightAt = (localX: number, localZ: number) => {
    const u = localX / radius;
    const v = localZ / radius;
    const radial = Math.sqrt(u * u + v * v);
    const envelope = THREE.MathUtils.smoothstep(1 - radial, 0, 0.95);

    let ridge = 0;
    for (let index = 0; index < ridges.length; index += 1) {
      const ridgeZ = ridges[index] ?? 0;
      const ridgeX = Math.sin(seed * 0.37 + ridgeZ * 5.2) * 0.2;
      const dx = (u - ridgeX) / (index === 2 ? 0.54 : 0.4);
      const dz = (v - ridgeZ) / 0.3;
      const peak = Math.exp(-(dx * dx * 1.35 + dz * dz * 1.5));
      ridge = Math.max(ridge, peak * (index === 2 ? 0.8 : 0.52 + ((index + seed) % 4) * 0.08));
    }
    // Sharpen: paper folds make pointier summits than smooth gaussians.
    ridge = Math.pow(ridge, 1.25);

    const worldX = centerX + localX * Math.cos(angle) - localZ * Math.sin(angle);
    const worldZ = centerZ + localX * Math.sin(angle) + localZ * Math.cos(angle);
    const googleHeight = elevations.length
      ? Math.max(0, sampleMap(worldX, worldZ) - minElevation) * 0.025
      : 0;
    const sculptedRelief = height * ridge * envelope;
    const googleRelief = elevations.length ? googleHeight * envelope : 0;
    return Math.max(sculptedRelief, googleRelief) + Math.min(sculptedRelief * 0.16, 1.3);
  };

  /* ---- 1. jittered grid (irregular triangles = hand-folded look) ---- */
  const n = segments + 1;
  const gx = new Float32Array(n * n);
  const gy = new Float32Array(n * n);
  const gz = new Float32Array(n * n);
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const i = row * n + col;
      let x = (col / segments) * 2 * radius - radius;
      let z = (row / segments) * 2 * radius - radius;
      const interior = row > 0 && row < segments && col > 0 && col < segments;
      if (interior) {
        x += (hash2(col, row, seed) - 0.5) * cell * 0.6;
        z += (hash2(row, col, seed + 3) - 0.5) * cell * 0.6;
      }
      gx[i] = x;
      gz[i] = z;
      gy[i] = heightAt(x, z);
    }
  }

  /* ---- 2. non-indexed triangles with baked flat normals + banded paper colours ---- */
  const base = new THREE.Color(mountain.color ?? '#267d67');
  const low = base.clone().lerp(new THREE.Color('#1c2f45'), 0.45); // deep indigo foot
  const mid = base.clone().lerp(new THREE.Color('#7fb59a'), 0.35);
  const high = new THREE.Color('#f4efe6'); // washi white summit
  const tint = new THREE.Color();

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const nrm = new THREE.Vector3();

  const pushTri = (i0: number, i1: number, i2: number) => {
    a.set(gx[i0]!, gy[i0]!, gz[i0]!);
    b.set(gx[i1]!, gy[i1]!, gz[i1]!);
    c.set(gx[i2]!, gy[i2]!, gz[i2]!);

    // Skip triangles outside the circular footprint
    const cx = (a.x + b.x + c.x) / 3;
    const cz = (a.z + b.z + c.z) / 3;
    if (cx * cx + cz * cz > radius * radius) return;

    e1.subVectors(b, a);
    e2.subVectors(c, a);
    nrm.crossVectors(e1, e2).normalize();
    if (nrm.y < 0) nrm.negate();

    // Height-based palette
    const cy = (a.y + b.y + c.y) / 3;
    const hN = THREE.MathUtils.clamp(cy / height, 0, 1);
    if (hN < 0.5) tint.copy(low).lerp(mid, hN / 0.5);
    else tint.copy(mid).lerp(high, Math.pow((hN - 0.5) / 0.5, 1.4));

    // Banded light: 4 discrete paper tones (sunlit vs shadowed folds)
    const lambert = THREE.MathUtils.clamp(nrm.dot(LIGHT), 0, 1);
    const band = Math.floor(lambert * 4) / 4;
    const paperNoise = (hash2(cx, cz, seed + 9) - 0.5) * 0.07;
    const shade = 0.58 + band * 0.55 + paperNoise;
    tint.multiplyScalar(shade);

    for (const p of [a, b, c]) {
      positions.push(p.x, p.y, p.z);
      normals.push(nrm.x, nrm.y, nrm.z);
      colors.push(tint.r, tint.g, tint.b);
    }
  };

  for (let row = 0; row < segments; row += 1) {
    for (let col = 0; col < segments; col += 1) {
      const i00 = row * n + col;
      const i10 = i00 + 1;
      const i01 = i00 + n;
      const i11 = i01 + 1;
      // Alternate diagonals -> crossing fold pattern
      if ((row + col + seed) % 2 === 0) {
        pushTri(i00, i01, i10);
        pushTri(i10, i01, i11);
      } else {
        pushTri(i00, i01, i11);
        pushTri(i00, i11, i10);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  // Crease lines only where adjacent faces differ noticeably in angle.
  const creases = new THREE.EdgesGeometry(geometry, 18);

  return { geometry, creases, heightAt, x: centerX, z: centerZ };
}

/* ------------------------------------------------------------------ */
/* Flag                                                                */
/* ------------------------------------------------------------------ */

function Flag({
  entry,
  position,
  selected,
  onSelect,
  onHover,
}: {
  entry: ExperienceEntry;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
  onHover: (active: boolean) => void;
}) {
  const cloth = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (cloth.current) cloth.current.rotation.y = Math.sin(state.clock.elapsedTime * 2 + entry.id) * 0.22;
  });

  const active = selected || entry.endDate === null;

  return (
    <group
      position={position}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (event.delta > 5) return;
        event.stopPropagation();
        onSelect();
      }}
    >
      <mesh position={[0, 0.62, 0]} geometry={POLE_GEOMETRY} material={POLE_MATERIAL} />
      <mesh
        ref={cloth}
        position={[0.03, 1.06, 0]}
        geometry={PENNANT_GEOMETRY}
        material={active ? PENNANT_ACTIVE : PENNANT_IDLE}
      />
      <mesh position={[0.25, 0.65, 0]} geometry={HIT_GEOMETRY} material={HIT_MATERIAL} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Mountain                                                            */
/* ------------------------------------------------------------------ */

function Mountain({
  mountain,
  terrain,
  selectedId,
  onSelectFlag,
  onOpenMountain,
  onHover,
}: MountainsProps & { mountain: ExperienceMountain }) {
  const surface = useMemo(() => makeSurface(mountain, terrain), [mountain, terrain]);

  const entries = useMemo(
    () => [...mountain.entries].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [mountain.entries],
  );

  const radius = mountain.radius ?? 14;

  const trail = useMemo(() => {
    const points = Array.from({ length: 28 }, (_, index) => {
      const t = index / 27;
      const x = Math.sin(t * Math.PI * 3) * radius * 0.16;
      const z = (t - 0.5) * radius * 1.45;
      return new THREE.Vector3(x, surface.heightAt(x, z) + 0.2, z);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.05, 4, false);
  }, [radius, surface]);

  // Free GPU memory when a mountain unmounts or is rebuilt.
  useEffect(
    () => () => {
      surface.geometry.dispose();
      surface.creases.dispose();
    },
    [surface],
  );
  useEffect(() => () => trail.dispose(), [trail]);

  const angle = ((mountain.angleDegrees ?? 35) * Math.PI) / 180;
  const rotation = -angle;

  return (
    <group
      position={[surface.x, 0, surface.z]}
      rotation={[0, rotation, 0]}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onHover(`mountain:${mountain.id}`, mountain.name);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (event.delta > 5) return;
        event.stopPropagation();
        onOpenMountain(mountain, [surface.x, 2, surface.z]);
      }}
    >
      <mesh geometry={surface.geometry} material={PAPER_MATERIAL} />
      <lineSegments geometry={surface.creases} material={CREASE_MATERIAL} />
      <mesh geometry={trail} material={TRAIL_MATERIAL} />

      {entries.map((entry, index) => {
        const t = entries.length === 1 ? 0.55 : 0.12 + (index / (entries.length - 1)) * 0.74;
        const localX = Math.sin(t * Math.PI * 3) * radius * 0.16;
        const localZ = (t - 0.5) * radius * 1.45;
        const y = surface.heightAt(localX, localZ);
        return (
          <Flag
            key={entry.id}
            entry={entry}
            position={[localX, y + 0.18, localZ]}
            selected={selectedId === entry.id}
            onHover={(active) => onHover(active ? `flag:${entry.id}` : null, active ? entry.title : undefined)}
            onSelect={() => onSelectFlag(entry, [surface.x + localX, y + 1, surface.z + localZ])}
          />
        );
      })}

      <Html position={[0, mountain.height ?? 9, 0]} center distanceFactor={38} pointerEvents="none" zIndexRange={[15, 0]}>
        <div className="cc-mountain-label">{mountain.name}</div>
      </Html>
    </group>
  );
}

export function Mountains(props: MountainsProps) {
  return (
    <>
      {props.mountains.map((mountain) => (
        <Mountain key={mountain.id} {...props} mountain={mountain} />
      ))}
    </>
  );
}