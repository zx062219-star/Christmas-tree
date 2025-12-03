import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../types';

interface FoliageProps {
  count: number;
  morphProgress: React.MutableRefObject<number>;
}

// Custom Shader for performance (thousands of particles)
const FoliageShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uMorph: { value: 0 }, // 0 = Scatter, 1 = Tree
    uColorHigh: { value: new THREE.Color(THEME.gold) },
    uColorLow: { value: new THREE.Color(THEME.emerald) },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uMorph;
    uniform float uPixelRatio;
    
    attribute vec3 aScatterPos;
    attribute vec3 aTreePos;
    attribute float aRandom;
    
    varying float vAlpha;
    varying vec3 vColor;
    
    // Ease out cubic
    float easeOut(float t) {
      return 1.0 - pow(1.0 - t, 3.0);
    }

    void main() {
      // Add individual offset to morph for organic transition
      float localProgress = smoothstep(0.0, 1.0, uMorph); 
      
      vec3 pos = mix(aScatterPos, aTreePos, localProgress);
      
      // Idle Animation (Breathing)
      float breath = sin(uTime * 2.0 + aRandom * 10.0) * 0.05;
      if (uMorph > 0.8) {
         pos += normal * breath; // Expand slightly when in tree form
      }
      
      // Wind/Float effect in scatter mode
      if (uMorph < 0.2) {
         pos.y += sin(uTime * 0.5 + aRandom * 10.0) * 0.2;
         pos.x += cos(uTime * 0.3 + aRandom * 10.0) * 0.2;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      gl_PointSize = (4.0 * aRandom + 2.0) * uPixelRatio * (50.0 / -mvPosition.z);
      
      // Sparkle logic
      float sparkle = sin(uTime * 3.0 + aRandom * 20.0);
      vAlpha = 0.6 + 0.4 * sparkle;
    }
  `,
  fragmentShader: `
    uniform vec3 uColorHigh;
    uniform vec3 uColorLow;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      // Circular particle
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      if (dist > 0.5) discard;
      
      // Gradient glow from center
      float glow = 1.0 - (dist * 2.0);
      glow = pow(glow, 1.5);
      
      vec3 color = mix(uColorLow, uColorHigh, glow * 0.5);
      
      gl_FragColor = vec4(color, vAlpha * glow);
    }
  `
};

export const Foliage: React.FC<FoliageProps> = ({ count, morphProgress }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  const { positions, scatterPositions, randoms } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const scat = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    
    const height = 14;
    const radiusBase = 5;

    for (let i = 0; i < count; i++) {
      // --- Tree Shape Generation (Cone) ---
      // Normalized height (0 bottom, 1 top)
      const yNorm = Math.pow(Math.random(), 0.8); // Bias towards bottom slightly
      const y = yNorm * height - (height / 2);
      
      const r = (1 - yNorm) * radiusBase; // Radius at this height
      const theta = Math.random() * Math.PI * 2;
      // Volume distribution (random point inside circle at height y)
      const rad = Math.sqrt(Math.random()) * r; 
      
      const x = rad * Math.cos(theta);
      const z = rad * Math.sin(theta);
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // --- Scatter Shape Generation (Sphere Cloud) ---
      const sr = 15 + Math.random() * 10;
      const sTheta = Math.random() * Math.PI * 2;
      const sPhi = Math.acos(2 * Math.random() - 1);
      
      scat[i * 3] = sr * Math.sin(sPhi) * Math.cos(sTheta);
      scat[i * 3 + 1] = sr * Math.sin(sPhi) * Math.sin(sTheta);
      scat[i * 3 + 2] = sr * Math.cos(sPhi);

      rnd[i] = Math.random();
    }
    
    return { positions: pos, scatterPositions: scat, randoms: rnd };
  }, [count]);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      shaderRef.current.uniforms.uMorph.value = morphProgress.current;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position" // Used as aTreePos actually in shader logic but needed for frustum culling
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTreePos"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPos"
          count={scatterPositions.length / 3}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        args={[FoliageShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};