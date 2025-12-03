import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PositionData } from '../types';

interface OrnamentsProps {
  count: number;
  morphProgress: React.MutableRefObject<number>;
  type: 'box' | 'sphere' | 'octahedron';
  color: string;
  scaleBase: number;
  emissive?: boolean;
}

export const Ornaments: React.FC<OrnamentsProps> = ({ count, morphProgress, type, color, scaleBase, emissive = false }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-calculate positions
  const data = useMemo(() => {
    const items: PositionData[] = [];
    const height = 13;
    const radiusBase = 4.8; // Slightly inside the foliage

    for (let i = 0; i < count; i++) {
      // Tree position (spiral distribution looks nice)
      const yNorm = Math.random(); 
      const y = yNorm * height - (height / 2);
      const r = (1 - yNorm) * radiusBase;
      
      // Add spiral offset + random jitter
      const theta = y * 2.0 + (i * 1.618 * Math.PI * 2); // Golden angle
      
      // Place on surface of cone mainly
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      // Scatter position
      const sr = 12 + Math.random() * 12;
      const sTheta = Math.random() * Math.PI * 2;
      const sPhi = Math.acos(2 * Math.random() - 1);
      
      const sx = sr * Math.sin(sPhi) * Math.cos(sTheta);
      const sy = sr * Math.sin(sPhi) * Math.sin(sTheta);
      const sz = sr * Math.cos(sPhi);

      items.push({
        tree: [x, y, z],
        scatter: [sx, sy, sz],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        scale: 0.5 + Math.random() * 0.5,
      });
    }
    return items;
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const t = morphProgress.current; // 0 to 1
    const time = state.clock.elapsedTime;
    
    // Ease function for smoother heavy object movement
    const easedT = 1 - Math.pow(1 - t, 3);

    data.forEach((item, i) => {
      // Interpolate Position
      const cx = THREE.MathUtils.lerp(item.scatter[0], item.tree[0], easedT);
      const cy = THREE.MathUtils.lerp(item.scatter[1], item.tree[1], easedT);
      const cz = THREE.MathUtils.lerp(item.scatter[2], item.tree[2], easedT);

      // Add floating noise when scattered
      const floatAmp = (1 - t) * 0.5;
      const fx = cx + Math.sin(time + i) * floatAmp;
      const fy = cy + Math.cos(time * 0.8 + i) * floatAmp;
      const fz = cz; // keep Z relatively stable for depth perception

      dummy.position.set(fx, fy, fz);

      // Rotation: Spin faster when scattering
      dummy.rotation.set(
        item.rotation[0] + time * (1 - t) * 0.5,
        item.rotation[1] + time * (0.2 + (1-t)),
        item.rotation[2]
      );

      // Scale: Pop in slightly when forming tree
      const s = item.scale * scaleBase * (0.8 + 0.2 * Math.sin(time + i));
      dummy.scale.set(s, s, s);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    switch (type) {
      case 'box': return new THREE.BoxGeometry(1, 1, 1);
      case 'octahedron': return new THREE.OctahedronGeometry(1, 0);
      case 'sphere': default: return new THREE.SphereGeometry(1, 16, 16);
    }
  }, [type]);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} castShadow receiveShadow>
      <meshStandardMaterial 
        color={color} 
        roughness={0.15} 
        metalness={0.9} 
        envMapIntensity={1.5}
        emissive={emissive ? color : undefined}
        emissiveIntensity={emissive ? 2 : 0}
      />
    </instancedMesh>
  );
};