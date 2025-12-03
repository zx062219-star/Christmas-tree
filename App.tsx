import React, { useState, useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Foliage } from './components/Foliage';
import { Ornaments } from './components/Ornaments';
import { THEME, TreeMode } from './types';

// --- Top Star Component ---
const TopStar = ({ morphProgress }: { morphProgress: React.MutableRefObject<number> }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Custom 5-Point Star Geometry
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 1.4;
    const innerRadius = 0.6;
    const angleStep = Math.PI / points;

    shape.moveTo(0, outerRadius);
    for (let i = 1; i < 2 * points; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const a = i * angleStep;
      shape.lineTo(Math.sin(a) * r, Math.cos(a) * r);
    }
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.1,
      bevelSegments: 4
    });
    
    geom.center(); // Ensure pivot is at center
    return geom;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const t = morphProgress.current;
    const time = state.clock.elapsedTime;
    
    // Position: Float high when scattered (y=20), settle at top when tree (y=7.5)
    // Add some random wobble when scattered
    const scatterY = 20 + Math.sin(time) * 2;
    const treeY = 7.6; // Slightly adjusted for the star shape
    const currentY = THREE.MathUtils.lerp(scatterY, treeY, t);
    
    // Scatter X/Z randomly
    const scatterOffset = 5;
    const currentX = THREE.MathUtils.lerp(Math.sin(time * 0.5) * scatterOffset, 0, t);
    const currentZ = THREE.MathUtils.lerp(Math.cos(time * 0.5) * scatterOffset, 0, t);

    groupRef.current.position.set(currentX, currentY, currentZ);
    
    // Rotation: Spin continuously
    groupRef.current.rotation.y = time * 0.4;
    // Slight tilt wobble
    groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.05;

    // Scale: Pulse based on music/time
    const scaleBase = THREE.MathUtils.lerp(0.5, 1.0, t); // Smaller when scattered
    const pulse = 1 + Math.sin(time * 2.5) * 0.05;
    groupRef.current.scale.setScalar(scaleBase * pulse);
  });

  return (
    <group ref={groupRef}>
      {/* Core Gold Star */}
      <mesh geometry={starGeometry}>
        <meshStandardMaterial 
          color={THEME.gold} 
          emissive={THEME.gold}
          emissiveIntensity={2.5}
          roughness={0.1}
          metalness={1.0}
          toneMapped={false}
        />
      </mesh>
      
      {/* Outer Halo Star (Wireframe Echo) */}
      <mesh geometry={starGeometry} scale={1.3} rotation={[0, 0, Math.PI / 10]}>
        <meshStandardMaterial 
          color={THEME.champagne} 
          emissive={THEME.champagne}
          emissiveIntensity={0.8}
          wireframe
          transparent
          opacity={0.3}
          toneMapped={false}
        />
      </mesh>
      
       {/* Point Light attached to Star */}
       <pointLight intensity={3} distance={15} color={THEME.gold} decay={2} />
    </group>
  );
};

// --- Scene Logic Component ---
const SceneContent = ({ mode }: { mode: TreeMode }) => {
  const morphProgress = useRef(0);
  
  // Smoothly interpolate morph value based on mode
  useFrame((state, delta) => {
    const target = mode === 'TREE_SHAPE' ? 1 : 0;
    // Damp for smooth transition: current, target, smoothTime, delta
    morphProgress.current = THREE.MathUtils.damp(morphProgress.current, target, 2.5, delta);
  });

  return (
    <>
      <group position={[0, -2, 0]}>
        {/* The Needle/Leaf System */}
        <Foliage count={14000} morphProgress={morphProgress} />
        
        {/* The Star */}
        <TopStar morphProgress={morphProgress} />

        {/* --- Ornament Layers (Increased Count) --- */}
        
        {/* Heavy Gold Boxes */}
        <Ornaments 
          count={350} 
          morphProgress={morphProgress} 
          type="box" 
          color={THEME.gold} 
          scaleBase={0.5}
        />
        
        {/* Bronze Spheres */}
        <Ornaments 
          count={400} 
          morphProgress={morphProgress} 
          type="sphere" 
          color={THEME.bronze} 
          scaleBase={0.4}
        />
        
        {/* Red Accents */}
         <Ornaments 
          count={100} 
          morphProgress={morphProgress} 
          type="sphere" 
          color="#8a1c1c" // Deeper luxury red
          scaleBase={0.55}
        />

        {/* Silver/Diamond Crystals */}
        <Ornaments 
          count={200} 
          morphProgress={morphProgress} 
          type="octahedron" 
          color="#ffffff" 
          scaleBase={0.35}
          emissive
        />
      </group>

      {/* Floating Sparkles for ambience */}
      <Sparkles count={300} scale={25} size={5} speed={0.4} opacity={0.6} color={THEME.champagne} />
    </>
  );
};

// --- Main App Component ---
export default function App() {
  const [mode, setMode] = useState<TreeMode>('SCATTERED');
  const [audioStarted, setAudioStarted] = useState(false);

  const toggleMode = () => {
    setMode((prev) => (prev === 'SCATTERED' ? 'TREE_SHAPE' : 'SCATTERED'));
    if (!audioStarted) setAudioStarted(true);
  };

  return (
    <div className="w-full h-screen bg-[#050505] text-white overflow-hidden relative selection:bg-yellow-500/30">
      
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.2 }}>
          <PerspectiveCamera makeDefault position={[0, 0, 28]} fov={35} />
          
          <Suspense fallback={null}>
            <SceneContent mode={mode} />
            
            {/* Cinematic Lighting */}
            <ambientLight intensity={0.4} color={THEME.deepGreen} />
            
            {/* Main Key Light */}
            <spotLight 
              position={[15, 20, 15]} 
              angle={0.4} 
              penumbra={1} 
              intensity={2.5} 
              color={THEME.champagne} 
              castShadow 
              shadow-bias={-0.0001}
            />
            
            {/* Fill Light - Blue/Cool for contrast */}
            <pointLight position={[-10, 5, -10]} intensity={1} color="#1a2b3c" />
            
            {/* Bottom Glow */}
            <pointLight position={[0, -10, 0]} intensity={0.8} color={THEME.emerald} />

            {/* TOP Light to fix dark shadow at apex */}
            <pointLight position={[0, 8, 2]} intensity={1.5} distance={10} color={THEME.gold} />

            {/* Environment Reflection */}
            <Environment preset="city" />
            
            {/* Floor Reflections */}
            <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.5} far={10} color="#000000" />
            
            {/* Post Processing for the "Glow" */}
            <EffectComposer disableNormalPass>
              <Bloom luminanceThreshold={1.1} mipmapBlur intensity={1.2} radius={0.5} />
              {/* Reduced darkness to fix the black shadow issue at the top */}
              <Vignette eskil={false} offset={0.1} darkness={0.7} /> 
              <Noise opacity={0.02} />
            </EffectComposer>
            
            <OrbitControls 
              enablePan={false} 
              // Removed restrictions for 360 degree view (minPolarAngle/maxPolarAngle)
              minDistance={10}
              maxDistance={45}
              autoRotate
              autoRotateSpeed={0.5}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8 md:p-12">
        {/* Header */}
        <header className="flex flex-col items-center md:items-start gap-2">
          <h1 className="text-3xl md:text-5xl font-display tracking-widest text-[#F7E7CE] drop-shadow-[0_0_10px_rgba(247,231,206,0.3)]">
            ARIX
          </h1>
          <p className="text-xs md:text-sm font-serif-lux tracking-[0.2em] text-white/60 uppercase">
            Signature Holiday Experience
          </p>
        </header>

        {/* Controls */}
        <div className="flex flex-col items-center pointer-events-auto pb-12">
          <button
            onClick={toggleMode}
            className="group relative px-8 py-3 bg-transparent overflow-hidden transition-all duration-500 ease-out"
          >
            {/* Button Background/Border Effect */}
            <div className={`absolute inset-0 border border-[#F7E7CE]/30 transition-all duration-500 ${mode === 'TREE_SHAPE' ? 'scale-x-100' : 'scale-x-75 opacity-50'}`}></div>
            <div className={`absolute inset-0 bg-[#004225] transform origin-bottom transition-transform duration-700 ${mode === 'TREE_SHAPE' ? 'scale-y-100 opacity-20' : 'scale-y-0 opacity-0'}`}></div>
            
            {/* Button Text */}
            <span className="relative z-10 font-serif-lux text-sm tracking-[0.2em] uppercase text-[#F7E7CE] group-hover:text-white transition-colors duration-300">
              {mode === 'SCATTERED' ? 'Assemble Signature' : 'Release to Chaos'}
            </span>
            
            {/* Glow line */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          <div className="mt-4 text-[10px] text-white/30 tracking-widest font-sans">
            RENDER MODE: WEBGL 2.0 / LUXURY
          </div>
        </div>
      </div>
      
      {/* Decorative Corners */}
      <div className="absolute top-0 left-0 p-8 opacity-30 pointer-events-none">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M0 40V0H40" stroke="#F7E7CE" strokeWidth="1"/>
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 p-8 opacity-30 pointer-events-none rotate-180">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M0 40V0H40" stroke="#F7E7CE" strokeWidth="1"/>
        </svg>
      </div>
    </div>
  );
}