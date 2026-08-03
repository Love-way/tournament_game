'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ─── Subtle particle field ─── */
function ParticleField() {
  const count = 80;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 26;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, []);

  const speeds = useMemo(
    () => Array.from({ length: count }, () => (Math.random() - 0.5) * 0.003),
    []
  );

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    const p = pointsRef.current;
    if (!p) return;
    const geo = p.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const elapsed = state.clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] += speeds[i];
      pos.array[i * 3]     += Math.sin(elapsed * 0.2 + i) * 0.0005;
      if ((pos.array[i * 3 + 1] as number) > 8)  pos.array[i * 3 + 1] = -8;
      if ((pos.array[i * 3 + 1] as number) < -8)  pos.array[i * 3 + 1] = 8;
    }
    pos.needsUpdate = true;
    p.rotation.y = elapsed * 0.015;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#FF6B00" size={0.045} transparent opacity={0.18} sizeAttenuation />
    </points>
  );
}

/* ─── Thin rotating ring ─── */
function Ring({ color, radius, rotSpeed, tilt }: { color: string; radius: number; rotSpeed: number; tilt: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = meshRef.current;
    if (!m) return;
    const t = state.clock.getElapsedTime();
    m.rotation.x = tilt + t * rotSpeed * 0.6;
    m.rotation.y = t * rotSpeed;
  });
  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[radius, 0.015, 6, 80]} />
      <meshBasicMaterial color={color} transparent opacity={0.2} />
    </mesh>
  );
}

/* ─── Scene (loaded via next/dynamic, ssr: false) ─── */
export default function ThreeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 14], fov: 55 }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      gl={{ antialias: false, alpha: true }}
    >
      <color attach="background" args={['#0A0A0A']} />
      <fog attach="fog" args={['#0A0A0A', 12, 28]} />

      <ParticleField />
      <Ring color="#FF6B00" radius={4}   rotSpeed={0.18} tilt={Math.PI / 5} />
      <Ring color="#FF6B00" radius={6.5} rotSpeed={0.09} tilt={Math.PI / 3} />
    </Canvas>
  );
}
