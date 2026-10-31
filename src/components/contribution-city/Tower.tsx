import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Building } from '@/components/contribution-city/layout';
import { WORLD } from '@/components/contribution-city/world.config';
import type { CityRepo } from '@/components/contribution-city/types';

interface TowerProps {
  building: Building;
  color: string;
  active: boolean;
  onOver: (repo: CityRepo) => void;
  onOut: (repo: CityRepo) => void;
  onOpen: (repo: CityRepo) => void;
}

export function Tower({ building, color, active, onOver, onOut, onOpen }: TowerProps) {
  const radius = WORLD.cell * WORLD.towerFill;
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: active ? 0.65 : 0.12,
      roughness: 0.48,
      metalness: 0.12,
    }),
    [active, color],
  );

  return (
    <group
      position={[building.x, 0, building.z]}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onOver(building.repo);
      }}
      onPointerOut={() => onOut(building.repo)}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (event.delta > 5 || !building.repo.url) return;
        event.stopPropagation();
        onOpen(building.repo);
      }}
    >
      <mesh position={[0, building.height / 2, 0]} material={material}>
        <cylinderGeometry args={[radius, radius * 1.04, building.height, 6]} />
      </mesh>
      {active && (
        <Html position={[0, building.height + 0.5, 0]} center distanceFactor={26} zIndexRange={[20, 0]}>
          <div className="cc-tag">{building.repo.name}</div>
        </Html>
      )}
    </group>
  );
}
