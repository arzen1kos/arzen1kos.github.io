import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityIsland } from '@/components/contribution-city/portfolio-types';
import { islandCells } from '@/components/contribution-city/layout';
import { WORLD } from '@/components/contribution-city/world.config';

function FloatingCube({
  island,
  reducedMotion,
}: {
  island: CityIsland;
  reducedMotion: boolean;
}) {
  const cube = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (reducedMotion || !cube.current) return;
    cube.current.rotation.y += delta * island.rotationSpeed;
    cube.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25) * 0.08;
    cube.current.position.y = 2.1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.16;
  });

  return (
    <group ref={cube} position={[0, 2.1, 0]}>
      <mesh>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial
          color={island.color}
          emissive={island.color}
          emissiveIntensity={0.28}
          metalness={0.22}
          roughness={0.32}
        />
      </mesh>
      <mesh position={[0, 0, 0.76]}>
        <planeGeometry args={[1.05, 0.25]} />
        <meshBasicMaterial color="#eafffb" transparent opacity={0.78} />
      </mesh>
    </group>
  );
}

export function Islands({
  islands,
  hoveredSlug,
  reducedMotion,
  onHover,
  onSelect,
}: {
  islands: CityIsland[];
  hoveredSlug: string | null;
  reducedMotion: boolean;
  onHover: (slug: string | null) => void;
  onSelect: (island: CityIsland) => void;
}) {
  return (
    <>
      {islands.map((island) => (
        <Island
          key={island.id}
          island={island}
          hovered={hoveredSlug === island.slug}
          reducedMotion={reducedMotion}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function Island({
  island,
  hovered,
  reducedMotion,
  onHover,
  onSelect,
}: {
  island: CityIsland;
  hovered: boolean;
  reducedMotion: boolean;
  onHover: (slug: string | null) => void;
  onSelect: (island: CityIsland) => void;
}) {
  const cells = useMemo(() => islandCells(island.rings), [island.rings]);
  const onClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 5) return;
    event.stopPropagation();
    onSelect(island);
  };

  return (
    <group
      position={island.position}
      scale={island.scale}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onHover(island.slug);
      }}
      onPointerOut={() => onHover(null)}
      onClick={onClick}
    >
      {cells.map((cell) => (
        <mesh key={`${cell.q},${cell.r}`} position={[cell.x, 0, cell.z]}>
          <cylinderGeometry args={[WORLD.cell * 0.96, WORLD.cell * 0.96, 0.22, 6]} />
          <meshStandardMaterial
            color={hovered ? '#16645c' : '#0c403c'}
            emissive={island.color}
            emissiveIntensity={hovered ? 0.24 : 0.06}
            flatShading
            roughness={0.8}
          />
        </mesh>
      ))}
      <FloatingCube island={island} reducedMotion={reducedMotion} />
      <Html position={[0, 3.2, 0]} center distanceFactor={34} zIndexRange={[20, 0]} pointerEvents="none">
        <div className={`cc-island-label${hovered ? ' is-active' : ''}`}>{island.name}</div>
      </Html>
    </group>
  );
}
