import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ISLAND, islandEdgeDistance, terrainHeight } from './terrain';

interface TowerFlightTarget {
  x: number;
  y: number;
  z: number;
  h: number;
}

interface CursorDragonProps {
  towers: TowerFlightTarget[];
}

function createShape(points: (shape: THREE.Shape) => void) {
  const shape = new THREE.Shape();
  points(shape);
  return new THREE.ShapeGeometry(shape, 4);
}

function createDragonGeometry() {
  const wing = createShape((shape) => {
    shape.moveTo(0.02, 0.08);
    shape.bezierCurveTo(-0.02, 0.43, 0.13, 0.84, 0.58, 1.02);
    shape.lineTo(0.37, 0.61);
    shape.lineTo(0.84, 0.78);
    shape.bezierCurveTo(0.69, 0.31, 0.38, 0.07, 0.02, 0.08);
  });
  const body = createShape((shape) => {
    shape.moveTo(0.99, 0.19);
    shape.lineTo(0.79, 0.32);
    shape.bezierCurveTo(0.73, 0.5, 0.52, 0.47, 0.43, 0.35);
    shape.bezierCurveTo(0.29, 0.3, 0.2, 0.28, 0.06, 0.31);
    shape.lineTo(-0.18, 0.39);
    shape.lineTo(-0.56, 0.61);
    shape.lineTo(-0.43, 0.34);
    shape.bezierCurveTo(-0.68, 0.34, -0.83, 0.2, -1.02, 0.29);
    shape.bezierCurveTo(-0.86, 0.08, -0.7, -0.02, -0.48, 0.04);
    shape.bezierCurveTo(-0.29, -0.15, -0.04, -0.16, 0.18, -0.09);
    shape.lineTo(0.45, -0.2);
    shape.lineTo(0.37, -0.02);
    shape.bezierCurveTo(0.58, -0.06, 0.76, 0.02, 0.99, 0.19);
    shape.closePath();
  });
  const horn = createShape((shape) => {
    shape.moveTo(0.63, 0.39);
    shape.lineTo(0.72, 0.62);
    shape.lineTo(0.75, 0.4);
    shape.lineTo(0.84, 0.52);
    shape.lineTo(0.82, 0.33);
    shape.closePath();
  });
  const legs = new THREE.BufferGeometry();
  legs.setAttribute('position', new THREE.Float32BufferAttribute([
    0.23, -0.07, 0.02, 0.14, -0.28, 0.02, 0.31, -0.25, 0.02,
    -0.12, -0.08, 0.02, -0.2, -0.27, 0.02, -0.03, -0.24, 0.02,
  ], 3));
  const wingVein = new THREE.BufferGeometry();
  wingVein.setAttribute('position', new THREE.Float32BufferAttribute([
    0.07, 0.13, 0.025, 0.5, 0.77, 0.025,
    0.08, 0.12, 0.025, 0.69, 0.62, 0.025,
  ], 3));
  return { wing, body, horn, legs, wingVein };
}

export function CursorDragon({ towers }: CursorDragonProps) {
  const billboard = useRef<THREE.Group>(null);
  const heading = useRef<THREE.Group>(null);
  const wing = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();
  const flight = useRef({
    pointer: new THREE.Vector2(),
    target: new THREE.Vector3(-10, 0, 0),
    position: new THREE.Vector3(-10, 17, 0),
    previous: new THREE.Vector3(-10, 17, 0),
    raycaster: new THREE.Raycaster(),
    ground: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    intersection: new THREE.Vector3(),
    cameraRight: new THREE.Vector3(),
    cameraUp: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    orbiting: false,
    orbitCenter: new THREE.Vector2(Infinity, Infinity),
    orbitAngle: 0,
  });
  const geometry = useMemo(createDragonGeometry, []);

  useEffect(() => () => {
    geometry.wing.dispose();
    geometry.body.dispose();
    geometry.horn.dispose();
    geometry.legs.dispose();
    geometry.wingVein.dispose();
  }, [geometry]);

  useEffect(() => {
    const pointer = flight.current.pointer;
    const onPointerMove = (event: PointerEvent) => {
      const bounds = gl.domElement.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;
      pointer.set(
        THREE.MathUtils.clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1),
        THREE.MathUtils.clamp(-((event.clientY - bounds.top) / bounds.height) * 2 + 1, -1, 1),
      );
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [gl]);

  useFrame((state, delta) => {
    const motion = flight.current;
    const elapsed = state.clock.elapsedTime;
    const cursorAltitude = 15 + ((motion.pointer.y + 1) / 2) * 3.4
      + Math.sin(elapsed * 1.35) * 0.45
      + Math.sin(elapsed * 0.53) * 0.2;
    motion.ground.constant = -cursorAltitude;
    motion.raycaster.setFromCamera(motion.pointer, camera);
    if (motion.raycaster.ray.intersectPlane(motion.ground, motion.intersection)) {
      let x = THREE.MathUtils.clamp(motion.intersection.x, -ISLAND.w / 2, ISLAND.w / 2);
      let z = THREE.MathUtils.clamp(motion.intersection.z, ISLAND.zMin, ISLAND.zMax);
      if (islandEdgeDistance(x, z) < 1) {
        let inside = 0;
        let outside = 1;
        for (let i = 0; i < 10; i += 1) {
          const middle = (inside + outside) / 2;
          if (islandEdgeDistance(x * middle, z * middle) >= 1) inside = middle;
          else outside = middle;
        }
        x *= inside;
        z *= inside;
      }
      motion.target.set(x, cursorAltitude, z);
    }

    let nearest: TowerFlightTarget | null = null;
    let nearestDistance = Infinity;
    for (const tower of towers) {
      const distance = Math.hypot(motion.target.x - tower.x, motion.target.z - tower.z);
      if (distance < nearestDistance) {
        nearest = tower;
        nearestDistance = distance;
      }
    }

    const orbiting = nearest !== null && nearestDistance < 4.4;
    if (orbiting && nearest) {
      if (!motion.orbiting || motion.orbitCenter.x !== nearest.x || motion.orbitCenter.y !== nearest.z) {
        motion.orbitAngle = Math.atan2(motion.target.z - nearest.z, motion.target.x - nearest.x);
        motion.orbitCenter.set(nearest.x, nearest.z);
      } else {
        motion.orbitAngle += delta * 0.8;
      }
      motion.orbiting = true;
      const angle = motion.orbitAngle;
      motion.target.set(
        nearest.x + Math.cos(angle) * 3.1,
        0,
        nearest.z + Math.sin(angle) * 3.1,
      );
      motion.target.y = Math.max(nearest.y + nearest.h, terrainHeight(motion.target.x, motion.target.z))
        + 2.2 + Math.sin(elapsed * 1.5) * 1.45;
    } else {
      motion.orbiting = false;
      motion.target.y = cursorAltitude;
    }

    motion.previous.copy(motion.position);
    motion.position.lerp(motion.target, 1 - Math.exp(-delta * (orbiting ? 2.7 : 3.2)));
    if (billboard.current) {
      billboard.current.position.copy(motion.position);
      billboard.current.quaternion.copy(camera.quaternion);
    }
    if (heading.current) {
      motion.direction.subVectors(motion.position, motion.previous);
      motion.cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
      motion.cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);
      const screenX = motion.direction.dot(motion.cameraRight);
      const screenY = motion.direction.dot(motion.cameraUp);
      const desiredHeading = Math.atan2(screenY, screenX);
      const turn = 1 - Math.exp(-delta * 5);
      const currentHeading = heading.current.rotation.z;
      const difference = THREE.MathUtils.euclideanModulo(desiredHeading - currentHeading + Math.PI, Math.PI * 2) - Math.PI;
      heading.current.rotation.z += difference * turn;
      heading.current.rotation.y = THREE.MathUtils.damp(
        heading.current.rotation.y,
        THREE.MathUtils.clamp(-motion.direction.y * 0.08, -0.35, 0.35),
        3,
        delta,
      );
    }
    if (wing.current) {
      wing.current.scale.y = 0.94 + Math.sin(elapsed * 8) * 0.12;
    }
  });

  return (
    <group ref={billboard} renderOrder={20}>
      <group ref={heading} scale={0.78}>
        <group scale={1.32}>
          <mesh geometry={geometry.wing} position={[0, 0, -0.015]} raycast={() => null}>
            <meshBasicMaterial color="#72cfff" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh geometry={geometry.body} raycast={() => null}>
            <meshBasicMaterial color="#91ddff" transparent opacity={0.24} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh geometry={geometry.horn} raycast={() => null}>
            <meshBasicMaterial color="#91ddff" transparent opacity={0.24} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh geometry={geometry.wing} position={[0, 0, 0.005]} ref={wing} raycast={() => null}>
            <meshBasicMaterial color="#e5f8ff" side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh geometry={geometry.body} position={[0, 0, 0.01]} raycast={() => null}>
            <meshBasicMaterial color="#f4fbff" side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh geometry={geometry.horn} position={[0, 0, 0.015]} raycast={() => null}>
            <meshBasicMaterial color="#f4fbff" side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <lineSegments geometry={geometry.legs} position={[0, 0, 0.02]} raycast={() => null}>
            <lineBasicMaterial color="#c5edff" transparent opacity={0.9} />
          </lineSegments>
          <lineSegments geometry={geometry.wingVein} position={[0, 0, 0.02]} raycast={() => null}>
            <lineBasicMaterial color="#9bdcff" transparent opacity={0.85} />
          </lineSegments>
          <mesh position={[0.78, 0.22, 0.035]} raycast={() => null}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#164b78" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
