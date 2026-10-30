import { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { CityRepo } from './types';
import { buildCity, CELL, TOWER_FILL, type Building } from './layout';
import { InfoPanel } from './InfoPanel';
import './ContributionCity.css';

const ACCOUNT_PALETTE = ['#2dd4bf', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c'];
const FALLBACK_LANG = '#8b949e';

/** Camera elevation above the horizon: 90 = straight down, 0 = side-on. */
const ELEVATION_DEG = 50;

export interface ContributionCityProps {
  repos: CityRepo[];
  /** CSS height of the scene. Default 600. */
  height?: number | string;
  /** Tower colour: by owning account (default) or by main language. */
  colorBy?: 'account' | 'language';
  /** Open repos in a new tab (default) or navigate the current one. */
  openInNewTab?: boolean;
  /** OrbitControls autoRotateSpeed; 0.5 is roughly one turn per two minutes. */
  rotateSpeed?: number;
  className?: string;
}

interface TowerProps {
  building: Building;
  color: string;
  active: boolean;
  onOver: (repo: CityRepo) => void;
  onOut: (repo: CityRepo) => void;
  onOpen: (repo: CityRepo) => void;
}

function Tower({ building, color, active, onOver, onOut, onOpen }: TowerProps) {
  const { repo, x, z, height, index } = building;
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const done = useRef(false);

  const tint = useMemo(() => {
    const c = new THREE.Color(color);
    if (repo.isArchived) c.offsetHSL(0, -0.45, -0.18);
    return c;
  }, [color, repo.isArchived]);

  // Archived: heavily dimmed. Private: slightly faded.
  const opacity = repo.isArchived ? 0.4 : repo.isPrivate ? 0.78 : 1;

  // Grow-in animation, rippling outwards from the centre.
  useFrame((_, dt) => {
    const g = group.current;
    if (done.current || !g) return;
    elapsed.current += Math.min(dt, 0.05);
    const p = THREE.MathUtils.clamp((elapsed.current - index * 0.015) / 0.9, 0, 1);
    g.scale.y = Math.max(1 - Math.pow(1 - p, 3), 0.001);
    if (p >= 1) done.current = true;
  });

  const r = CELL * TOWER_FILL;

  return (
    <group ref={group} position={[x, 0, z]} scale={[1, 0.001, 1]}>
      <mesh
        position={[0, height / 2, 0]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onOver(repo);
        }}
        onPointerOut={() => onOut(repo)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 5) return; // it was a drag, not a click
          e.stopPropagation();
          onOpen(repo);
        }}
      >
        <cylinderGeometry args={[r, r, height, 6]} />
        <meshStandardMaterial
          color={tint}
          flatShading
          roughness={0.55}
          metalness={0.15}
          transparent={opacity < 1}
          opacity={opacity}
          emissive={tint}
          emissiveIntensity={active ? 0.55 : 0.06}
        />
      </mesh>
    </group>
  );
}

export default function ContributionCity({
  repos,
  height = 600,
  colorBy = 'account',
  openInNewTab = true,
  rotateSpeed = 0.6,
  className,
}: ContributionCityProps) {
  const city = useMemo(() => buildCity(repos), [repos]);
  const accounts = useMemo(() => [...new Set(repos.map((r) => r.account))], [repos]);
  const accountColor = useMemo(
    () => new Map(accounts.map((a, i) => [a, ACCOUNT_PALETTE[i % ACCOUNT_PALETTE.length]])),
    [accounts],
  );
  const totals = useMemo(
    () => ({ repos: repos.length, commits: repos.reduce((s, r) => s + r.commits, 0), accounts }),
    [repos, accounts],
  );

  const [hovered, setHovered] = useState<CityRepo | null>(null);

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const handleOver = useCallback((repo: CityRepo) => setHovered(repo), []);
  const handleOut = useCallback(
    (repo: CityRepo) => setHovered((h) => (h?.id === repo.id ? null : h)),
    [],
  );
  const handleOpen = useCallback(
    (repo: CityRepo) => {
      if (!repo.url) return;
      if (openInNewTab) window.open(repo.url, '_blank', 'noopener,noreferrer');
      else window.location.href = repo.url;
    },
    [openInNewTab],
  );

  const colorFor = (repo: CityRepo) =>
    colorBy === 'language'
      ? (repo.languages[0]?.color ?? FALLBACK_LANG)
      : (accountColor.get(repo.account) ?? ACCOUNT_PALETTE[0]);

  // Bird's-eye camera, tilted down at ELEVATION_DEG, framed to fit the plate.
  const distance = city.radius * 2.6 + city.maxHeight * 0.5;
  const el = (ELEVATION_DEG * Math.PI) / 180;
  const cameraPosition: [number, number, number] = [0, distance * Math.sin(el), distance * Math.cos(el)];

  return (
    <div
      className={`cc-root${className ? ` ${className}` : ''}`}
      style={{ height, cursor: hovered?.url ? 'pointer' : 'default' }}
      role="img"
      aria-label={`Contribution city: ${totals.repos} repositories, ${totals.commits} commits`}
    >
      <div className="cc-canvas">
        <Canvas camera={{ position: cameraPosition, fov: 35, near: 0.1, far: 500 }} dpr={[1, 2]}>
          <ambientLight intensity={0.55} />
          <directionalLight position={[8, 14, 6]} intensity={1.6} />
          <directionalLight position={[-8, 6, -6]} intensity={0.45} color="#5eead4" />

          {/* Ground plate: every cell of the hexagon, built or empty */}
          {city.cells.map((c) => (
            <mesh key={`${c.q},${c.r}`} position={[c.x, -0.05, c.z]}>
              <cylinderGeometry args={[CELL * 0.97, CELL * 0.97, 0.1, 6]} />
              <meshStandardMaterial color="#0c3b37" flatShading roughness={0.9} />
            </mesh>
          ))}

          {city.buildings.map((b) => (
            <Tower
              key={b.repo.id}
              building={b}
              color={colorFor(b.repo)}
              active={hovered?.id === b.repo.id}
              onOver={handleOver}
              onOut={handleOut}
              onOpen={handleOpen}
            />
          ))}

          <OrbitControls
            target={[0, 1.5, 0]}
            enablePan={false}
            enableDamping
            autoRotate={!hovered && !reducedMotion}
            autoRotateSpeed={rotateSpeed}
            minDistance={distance * 0.5}
            maxDistance={distance * 1.6}
            maxPolarAngle={Math.PI * 0.48}
          />
        </Canvas>
      </div>

      <InfoPanel repo={hovered} totals={totals} />

      {colorBy === 'account' && accounts.length > 1 && (
        <div className="cc-legend">
          {accounts.map((a) => (
            <span key={a}>
              <i className="cc-dot" style={{ background: accountColor.get(a) }} />@{a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}