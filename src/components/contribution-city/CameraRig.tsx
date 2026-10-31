import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface FocusTarget {
  target: [number, number, number];
  distance: number;
}

export function CameraRig({ focus }: { focus: FocusTarget | null }) {
  const { camera, controls } = useThree();
  const current = useRef<FocusTarget | null>(null);

  useEffect(() => {
    if (focus) current.current = focus;
  }, [focus]);

  useEffect(() => {
    const control = controls as unknown as {
      target?: THREE.Vector3;
      update?: () => void;
    } | null;
    const destination = current.current;
    if (!control?.target || !destination) return;

    const target = new THREE.Vector3(...destination.target);
    control.target.copy(target);
    const direction = camera.position.clone().sub(control.target).normalize();
    camera.position.copy(target).add(direction.multiplyScalar(destination.distance));
    camera.lookAt(target);
    control.update?.();
  }, [camera, controls, focus]);

  return null;
}
