import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticlesProps {
  count?: number;
  color?: string;
  size?: number;
  speed?: number;
  radius?: number;
  opacity?: number;
}

const Particles = ({
  count = 100,
  color = '#33C3BD',
  size = 0.05,
  speed = 0.3,
  radius = 3,
  opacity = 0.5
}: ParticlesProps) => {
  const points = useRef<THREE.Points>(null);
  
  // Generate random positions for particles
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Random positions in a sphere
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius * Math.random();
      const y = (Math.random() - 0.5) * radius;
      const z = Math.sin(angle) * radius * Math.random();
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    
    return positions;
  }, [count, radius]);
  
  // Generate random sizes for particles
  const particleSizes = useMemo(() => {
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      sizes[i] = Math.random() * size;
    }
    
    return sizes;
  }, [count, size]);
  
  // Animation for particles
  useFrame((state) => {
    if (!points.current) return;
    
    const time = state.clock.getElapsedTime();
    const positions = points.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      // Apply different speeds to particles for more natural movement
      const speedFactor = 0.5 + Math.random() * 0.5;
      const i3 = i * 3;
      
      // Move particles up and add slight lateral movement
      positions[i3 + 1] += Math.sin(time * speed * speedFactor + i) * 0.01;
      positions[i3] += Math.cos(time * speed * 0.5 + i) * 0.01;
      positions[i3 + 2] += Math.sin(time * speed * 0.7 + i) * 0.01;
      
      // Reset particles that move too far
      if (positions[i3 + 1] > radius / 2) {
        positions[i3 + 1] = -radius / 2;
      }
    }
    
    points.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleSizes.length}
          array={particleSizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        transparent
        opacity={opacity}
      />
    </points>
  );
};

export default Particles;