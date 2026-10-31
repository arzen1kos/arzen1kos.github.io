import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { citySlots, TOWER_RADIUS } from './layout';
import { ISLAND, MAX_PEAK, MOUNTAIN, OCT_CUT, PEAKS, octagonPoints, terrainHeight } from './terrain';
import type { PeakKey, Repo } from './types';

/* ------------------------------------------------------------------ */
/* Palette + shared resources (one copy for the whole scene = low RAM) */
/* ------------------------------------------------------------------ */

const BLUE = { line: '#7fd8ff', slab: '#0b2a52', deep: '#12315e', mid: '#1f64b0', snow: '#d6f1ff', amber: '#ffd166' };
const TARGET = new THREE.Vector3(-7, 2, 0); // x offset leaves room for the panel; the mountain is at the island centre
const FIT = 0.78; // share of screen width the island spans at launch

const HEX = (() => {
  const g = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
  g.translate(0, 0.5, 0);
  return g;
})();
const HEX_EDGES = new THREE.EdgesGeometry(HEX);
const PRISM = new THREE.CylinderGeometry(1, 1, 0.9, 6, 1);
const PRISM_EDGES = new THREE.EdgesGeometry(PRISM);
const RING = new THREE.RingGeometry(0.95, 1.12, 6);
const RING_MAT = new THREE.MeshBasicMaterial({ color: BLUE.amber, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
const HIT_MAT = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const HIT_GEO = new THREE.SphereGeometry(1.8, 8, 6);
const PEAK_FILL = new THREE.MeshBasicMaterial({ color: BLUE.amber, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
const PEAK_LINE = new THREE.LineBasicMaterial({ color: BLUE.amber });

type Mode = 'normal' | 'private' | 'archived';
const OPACITY: Record<Mode, [fill: number, line: number]> = {
  normal: [0.2, 0.9],
  private: [0.12, 0.55],   // slightly faded
  archived: [0.05, 0.2],   // dimmed
};
const materialCache = new Map<string, { fill: THREE.MeshLambertMaterial; line: THREE.LineBasicMaterial }>();

function towerMaterials(color: string, mode: Mode, active: boolean) {
  const key = `${color}|${mode}|${active ? 1 : 0}`;
  let entry = materialCache.get(key);
  if (!entry) {
    const [fill, line] = OPACITY[mode];
    entry = {
      fill: new THREE.MeshLambertMaterial({
        color, emissive: color, emissiveIntensity: active ? 0.55 : 0.25,
        transparent: true, opacity: active ? Math.min(fill + 0.3, 0.55) : fill, depthWrite: false, side: THREE.DoubleSide,
      }),
      line: new THREE.LineBasicMaterial({ color: active ? '#ffffff' : color, transparent: true, opacity: active ? 1 : line, depthWrite: false }),
    };
    materialCache.set(key, entry);
  }
  return entry;
}

const modeOf = (r: Repo): Mode => (r.isArchived ? 'archived' : r.isPrivate ? 'private' : 'normal');

function towerColor(r: Repo): string {
  const lang = r.languages[0]?.color;
  const c = new THREE.Color(BLUE.line);
  if (lang) c.lerp(new THREE.Color(lang), 0.4);
  return `#${c.getHexString()}`;
}

/* ------------------------------------------------------------------ */
/* Camera: tilted bird's-eye, island spans ~80% of the width           */
/* ------------------------------------------------------------------ */

function Rig() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const dist = Math.min(300, ISLAND.w / (FIT * 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * aspect));
    const elevation = THREE.MathUtils.degToRad(42);
    cam.position.set(TARGET.x, TARGET.y + Math.sin(elevation) * dist, TARGET.z + Math.cos(elevation) * dist);
    cam.lookAt(TARGET);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Octagonal island slab + blueprint grid (clipped to the octagon)     */
/* ------------------------------------------------------------------ */

const SLAB_THICKNESS = 0.8;

function Island() {
  const parts = useMemo(() => {
    // Slab: extrude the octagon outline. Shape space is (x, −z) so that after rotateX(−90°) it lands on (x, z).
    const outline = octagonPoints();
    const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
    const slab = new THREE.ExtrudeGeometry(shape, { depth: SLAB_THICKNESS, bevelEnabled: false });
    slab.rotateX(-Math.PI / 2);
    slab.translate(0, -SLAB_THICKNESS, 0); // top face sits at y = 0
    const edges = new THREE.EdgesGeometry(slab);

    // Grid lines every 4 units, each trimmed to where it crosses the octagon.
    const A = ISLAND.w / 2, B = ISLAND.d / 2, limit = 1 + OCT_CUT;
    const pts: number[] = [];
    for (let x = -A; x <= A + 0.01; x += 4) {
      const reach = B * Math.min(1, limit - Math.abs(x) / A);
      if (reach > 0) pts.push(x, 0.03, ISLAND.cz - reach, x, 0.03, ISLAND.cz + reach);
    }
    for (let z = ISLAND.zMin; z <= ISLAND.zMax + 0.01; z += 4) {
      const reach = A * Math.min(1, limit - Math.abs(z - ISLAND.cz) / B);
      if (reach > 0) pts.push(-reach, 0.03, z, reach, 0.03, z);
    }
    const grid = new THREE.BufferGeometry();
    grid.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return { slab, edges, grid };
  }, []);
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts]);

  const swallow = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation();
  return (
    <group>
      <mesh geometry={parts.slab} onPointerOver={swallow} onClick={swallow}>
        <meshBasicMaterial color={BLUE.slab} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      <lineSegments geometry={parts.edges}><lineBasicMaterial color={BLUE.line} transparent opacity={0.9} /></lineSegments>
      <lineSegments geometry={parts.grid}><lineBasicMaterial color={BLUE.line} transparent opacity={0.2} /></lineSegments>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Origami mountain: jittered grid, flat facets, banded paper tones    */
/* ------------------------------------------------------------------ */

const LIGHT = new THREE.Vector3(-0.5, 0.82, 0.3).normalize();
const hash2 = (x: number, z: number) => {
  const s = Math.sin(x * 127.1 + z * 311.7 + 17 * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

function buildMountain() {
  // Grid only covers the mountain footprint (plus a margin); terrainHeight() is zero outside the foot line.
  const cols = 40, rows = 34;
  const x0 = -MOUNTAIN.rx * 1.14, z0 = -MOUNTAIN.rz * 1.14, z1 = MOUNTAIN.rz * 1.14;
  const cw = (-x0 * 2) / cols, ch = (z1 - z0) / rows;
  const n = cols + 1;
  const gx = new Float32Array(n * (rows + 1));
  const gy = new Float32Array(n * (rows + 1));
  const gz = new Float32Array(n * (rows + 1));
  for (let r = 0; r <= rows; r += 1) {
    for (let c = 0; c <= cols; c += 1) {
      const i = r * n + c;
      let x = x0 + c * cw;
      let z = z0 + r * ch;
      if (r > 0 && r < rows && c > 0 && c < cols) {
        x += (hash2(c, r) - 0.5) * cw * 0.6;
        z += (hash2(r, c + 3) - 0.5) * ch * 0.6;
      }
      gx[i] = x; gz[i] = z; gy[i] = terrainHeight(x, z);
    }
  }

  const low = new THREE.Color(BLUE.deep), mid = new THREE.Color(BLUE.mid), high = new THREE.Color(BLUE.snow);
  const tint = new THREE.Color();
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nrm = new THREE.Vector3();
  const pos: number[] = [], nor: number[] = [], col: number[] = [];

  const tri = (i0: number, i1: number, i2: number) => {
    A.set(gx[i0]!, gy[i0]!, gz[i0]!); B.set(gx[i1]!, gy[i1]!, gz[i1]!); C.set(gx[i2]!, gy[i2]!, gz[i2]!);
    if (Math.max(A.y, B.y, C.y) < 0.05) return; // flat ground: the slab already covers it
    nrm.crossVectors(e1.subVectors(B, A), e2.subVectors(C, A)).normalize();
    if (nrm.y < 0) nrm.negate();
    const hN = THREE.MathUtils.clamp(((A.y + B.y + C.y) / 3) / MAX_PEAK, 0, 1);
    if (hN < 0.5) tint.copy(low).lerp(mid, hN / 0.5);
    else tint.copy(mid).lerp(high, Math.pow((hN - 0.5) / 0.5, 1.3));
    const band = Math.floor(THREE.MathUtils.clamp(nrm.dot(LIGHT), 0, 1) * 4) / 4; // four paper tones
    tint.multiplyScalar(0.55 + band * 0.6 + (hash2(A.x, A.z) - 0.5) * 0.06);
    for (const p of [A, B, C]) { pos.push(p.x, p.y, p.z); nor.push(nrm.x, nrm.y, nrm.z); col.push(tint.r, tint.g, tint.b); }
  };

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const a = r * n + c, b = a + 1, d = a + n, e = d + 1;
      if ((r + c) % 2 === 0) { tri(a, d, b); tri(b, d, e); } else { tri(a, d, e); tri(a, e, b); }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const creases = new THREE.EdgesGeometry(geometry, 5);

  // Dashed trail linking the three peaks, grounded on the terrain. Saddle points sit midway between peaks.
  const middle = (a: (typeof PEAKS)[number], b: (typeof PEAKS)[number]) => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
  const mid1 = middle(PEAKS[0]!, PEAKS[1]!);
  const mid2 = middle(PEAKS[1]!, PEAKS[2]!);
  const ctrl = [PEAKS[0]!, mid1, PEAKS[1]!, mid2, PEAKS[2]!].map((p) => new THREE.Vector3(p.x, 0, p.z));
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  const trailPts = curve.getPoints(110).map((p) => new THREE.Vector3(p.x, terrainHeight(p.x, p.z) + 0.55, p.z));
  const trail = new THREE.BufferGeometry().setFromPoints(trailPts);
  const trailLine = new THREE.Line(trail, new THREE.LineDashedMaterial({ color: BLUE.amber, dashSize: 0.8, gapSize: 0.5, transparent: true, opacity: 0.95 }));
  trailLine.computeLineDistances();

  return { geometry, creases, trail, trailLine };
}

function Mountain() {
  const m = useMemo(buildMountain, []);
  useEffect(() => () => { m.geometry.dispose(); m.creases.dispose(); m.trail.dispose(); (m.trailLine.material as THREE.Material).dispose(); }, [m]);
  const swallow = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation(); // also blocks hovering towers hidden behind it
  return (
    <group>
      <mesh geometry={m.geometry} onPointerOver={swallow} onClick={swallow}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.4} depthWrite={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      <lineSegments geometry={m.creases}><lineBasicMaterial color={BLUE.line} transparent opacity={0.95} /></lineSegments>
      <primitive object={m.trailLine} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Floating spinning hexagons on the peaks                             */
/* ------------------------------------------------------------------ */

function PeakHex({ peak, active, onHover, onSelect }: {
  peak: (typeof PEAKS)[number]; active: boolean;
  onHover: (key: PeakKey | null) => void; onSelect: (key: PeakKey) => void;
}) {
  const bob = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const baseY = peak.h + 2.8;
  useFrame((state, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.9;
    if (bob.current) {
      bob.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 1.3 + peak.x) * 0.35;
      bob.current.scale.setScalar(THREE.MathUtils.damp(bob.current.scale.x, active ? 1.3 : 1, 8, dt));
    }
  });
  return (
    <group
      ref={bob}
      position={[peak.x, baseY, peak.z]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(peak.key); }}
      onPointerOut={() => onHover(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => { if (e.delta > 5) return; e.stopPropagation(); onSelect(peak.key); }}
    >
      <group rotation={[0.45, 0, 0]}>
        <group ref={spin} scale={[1.15, 1.15, 1.15]}>
          <mesh geometry={PRISM} material={PEAK_FILL} />
          <lineSegments geometry={PRISM_EDGES} material={PEAK_LINE} />
        </group>
      </group>
      <mesh geometry={HIT_GEO} material={HIT_MAT} />
      <Html position={[0, -2.1, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
        <div className={`cc-peak-tag${active ? ' is-active' : ''}`}>{peak.label}</div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Towers                                                              */
/* ------------------------------------------------------------------ */

interface Placed { repo: Repo; x: number; z: number; h: number; color: string }

function Reticle({ x, y, z }: { x: number; y: number; z: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z += dt * 1.6; });
  return <mesh ref={ref} geometry={RING} material={RING_MAT} position={[x, y + 0.15, z]} rotation={[-Math.PI / 2, 0, 0]} scale={TOWER_RADIUS * 1.5} />;
}

function Towers({ placed, activeId, onHover, onSelect }: {
  placed: Placed[]; activeId: string | null;
  onHover: (repo: Repo | null) => void; onSelect: (repo: Repo) => void;
}) {
  return (
    <>
      {placed.map(({ repo, x, z, h, color }) => {
        const mats = towerMaterials(color, modeOf(repo), repo.id === activeId);
        return (
          <group
            key={repo.id}
            position={[x, 0, z]}
            scale={[TOWER_RADIUS, h, TOWER_RADIUS]}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(repo); }}
            onPointerOut={() => onHover(null)}
            onClick={(e: ThreeEvent<MouseEvent>) => { if (e.delta > 5) return; e.stopPropagation(); onSelect(repo); }}
          >
            <mesh geometry={HEX} material={mats.fill} />
            <lineSegments geometry={HEX_EDGES} material={mats.line} />
          </group>
        );
      })}
    </>
  );
}

function SpyLabel({ item }: { item: Placed }) {
  const { repo } = item;
  const status = repo.isArchived ? 'archived' : repo.isPrivate ? 'private' : 'public';
  return (
    <Html position={[item.x, item.h + 0.4, item.z]} style={{ pointerEvents: 'none' }} zIndexRange={[30, 0]}>
      <div className="cc-spy">
        <span className="cc-spy-name">{repo.name}</span>
        <span className="cc-spy-sub">{repo.primaryLanguage ?? 'no language'} / {repo.commits} commits / {status}</span>
      </div>
    </Html>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export interface CitySceneProps {
  repos: Repo[];
  pinnedId: string | null;
  hoverRepo: Repo | null;
  hoverPeak: PeakKey | null;
  onHoverRepo: (repo: Repo | null) => void;
  onSelectRepo: (repo: Repo) => void;
  onHoverPeak: (key: PeakKey | null) => void;
  onSelectPeak: (key: PeakKey) => void;
  onMiss: (event: MouseEvent) => void;
}

export function CityScene(p: CitySceneProps) {
  const placed = useMemo<Placed[]>(() => {
    const sorted = [...p.repos].sort((a, b) => b.commits - a.commits);
    const slots = citySlots(sorted.length);
    const max = Math.max(1, ...sorted.map((r) => r.commits));
    return slots.map((slot, i) => {
      const repo = sorted[i]!;
      return { repo, x: slot.x, z: slot.z, h: 1.4 + (7.5 * Math.log1p(repo.commits)) / Math.log1p(max), color: towerColor(repo) };
    });
  }, [p.repos]);

  const activeId = p.hoverRepo?.id ?? p.pinnedId;
  const hovered = placed.find((t) => t.repo.id === p.hoverRepo?.id);
  const pinned = placed.find((t) => t.repo.id === p.pinnedId);
  const reticle = hovered ?? pinned;

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ fov: 40, near: 0.5, far: 500, position: [0, 60, 60] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      onPointerMissed={p.onMiss}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[-20, 30, 15]} intensity={1.4} />
      <Rig />
      <OrbitControls
        enablePan={false}
        enableDamping
        target={[TARGET.x, TARGET.y, TARGET.z]}
        autoRotate={!p.hoverRepo && !p.hoverPeak}
        autoRotateSpeed={0.45}
        minPolarAngle={0.3}
        maxPolarAngle={1.3}
        minDistance={25}
        maxDistance={260}
      />
      <Island />
      <Mountain />
      <Towers placed={placed} activeId={activeId} onHover={p.onHoverRepo} onSelect={p.onSelectRepo} />
      {PEAKS.map((peak) => (
        <PeakHex key={peak.key} peak={peak} active={p.hoverPeak === peak.key} onHover={p.onHoverPeak} onSelect={p.onSelectPeak} />
      ))}
      {reticle && <Reticle x={reticle.x} y={reticle.h} z={reticle.z} />}
      {hovered && <SpyLabel item={hovered} />}
    </Canvas>
  );
}