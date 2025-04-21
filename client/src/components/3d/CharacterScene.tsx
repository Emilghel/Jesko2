import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Group, Mesh } from 'three';

// Define profession type
type Profession = 
  | 'real-estate'
  | 'ecommerce'
  | 'content-creator'
  | 'law-firm'
  | 'marketing-agency'
  | 'insurance'
  | 'crypto'
  | 'event-planner'
  | string; // Fallback for other values

interface CharacterModelProps {
  profession: Profession;
  scale?: number;
  position?: [number, number, number];
}

// Character model component
// Define animation types that can be triggered
export type CharacterAnimation = 
  | 'idle'
  | 'happy'
  | 'thinking'
  | 'confused'
  | 'celebrating'
  | 'working';

interface CharacterModelProps {
  profession: Profession;
  scale?: number;
  position?: [number, number, number];
  animation?: CharacterAnimation;
}

const CharacterModel: React.FC<CharacterModelProps> = ({ 
  profession, 
  scale = 1, 
  position = [0, 0, 0],
  animation = 'idle'
}) => {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  
  // Log render info for debugging
  useEffect(() => {
    console.log('CharacterModel rendering:', { profession, animation, scale });
  }, [profession, animation, scale]);
  
  // Animation state
  const [currentAnimation, setCurrentAnimation] = useState<CharacterAnimation>(animation);
  const animationStartTime = useRef(0);
  const animationDuration = useRef(3); // default animation duration in seconds
  const previousAnimation = useRef<CharacterAnimation>('idle');
  
  // Animation transition progress (0 to 1)
  const transitionProgress = useRef(0);
  
  // Update animation when prop changes
  useEffect(() => {
    if (animation !== currentAnimation) {
      previousAnimation.current = currentAnimation;
      setCurrentAnimation(animation);
      transitionProgress.current = 0;
      animationStartTime.current = Date.now() / 1000; // Current time in seconds
      
      // Set animation duration based on animation type
      switch(animation) {
        case 'happy': 
          animationDuration.current = 1.5;
          break;
        case 'thinking':
          animationDuration.current = 3.0;
          break;
        case 'confused':
          animationDuration.current = 2.0;
          break;
        case 'celebrating':
          animationDuration.current = 2.5;
          break;
        case 'working':
          animationDuration.current = 4.0;
          break;
        default:
          animationDuration.current = 3.0;
      }
    }
  }, [animation, currentAnimation]);
  
  // Enhanced 3D models with complex geometries
  // These are more visually interesting representations for each profession
  const getGeometry = (prof: Profession): THREE.BufferGeometry => {
    switch(prof) {
      case 'real-estate':
        // House-like structure
        return new THREE.BoxGeometry(1.2, 1, 1.2);
      
      case 'ecommerce':
        // Shopping cart-inspired shape
        return new THREE.TorusKnotGeometry(0.8, 0.3, 128, 16, 2, 3);
      
      case 'content-creator':
        // Camera-inspired shape
        return new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 1.5);
      
      case 'law-firm':
        // Column/gavel inspired
        return new THREE.CapsuleGeometry(0.7, 1.5, 8, 16);
      
      case 'marketing-agency':
        // Abstract shape representing creativity
        return new THREE.TorusGeometry(0.7, 0.3, 16, 100, Math.PI * 1.5);
      
      case 'insurance':
        // Shield-like shape
        return new THREE.OctahedronGeometry(1, 2);
      
      case 'crypto':
        // Complex crystal-like structure
        return new THREE.IcosahedronGeometry(1, 1);
      
      case 'event-planner':
        // Star-shaped geometry
        return new THREE.DodecahedronGeometry(1, 2);
      
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  };
  
  const getColor = (prof: Profession): string => {
    const colorMap: Record<Profession, string> = {
      'real-estate': '#FF5733',
      'ecommerce': '#33A1FF',
      'content-creator': '#FF33A1',
      'law-firm': '#3361FF',
      'marketing-agency': '#A133FF',
      'insurance': '#33FFA1',
      'crypto': '#FFD700',
      'event-planner': '#FF33F5'
    };
    
    return colorMap[prof] || '#33C3BD';
  };

  // Enhanced animation system with different reactions based on character animation state
  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const deltaTime = state.clock.getDelta();
    const now = Date.now() / 1000;
    const animElapsed = now - animationStartTime.current;
    
    // Update transition progress
    if (transitionProgress.current < 1) {
      transitionProgress.current = Math.min(1, animElapsed / 0.5); // 0.5s transition
    }
    
    // Apply animation based on current state
    switch(currentAnimation) {
      case 'idle':
        // Gentle floating and rotation
        meshRef.current.scale.y = scale * (1 + Math.sin(time * 0.5) * 0.03);
        meshRef.current.rotation.y = time * 0.3;
        groupRef.current.position.y = position[1] + Math.sin(time) * 0.1;
        break;
        
      case 'happy':
        // Quick bouncy movement
        meshRef.current.scale.y = scale * (1 + Math.sin(time * 4) * 0.1);
        meshRef.current.scale.x = scale * (1 + Math.sin(time * 4 + 1) * 0.05);
        meshRef.current.rotation.y = time * 0.8;
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(time * 3)) * 0.2;
        break;
        
      case 'thinking':
        // Slow pulsing and gentle tilting
        meshRef.current.scale.y = scale * (1 + Math.sin(time * 0.3) * 0.05);
        meshRef.current.rotation.y = time * 0.1;
        meshRef.current.rotation.z = Math.sin(time * 0.2) * 0.1;
        groupRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.05;
        break;
        
      case 'confused':
        // Erratic movement
        meshRef.current.scale.y = scale * (1 + Math.sin(time * 2) * 0.02);
        meshRef.current.rotation.y = time * 0.5 + Math.sin(time * 3) * 0.2;
        meshRef.current.rotation.x = Math.sin(time * 2) * 0.1;
        groupRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.1;
        groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.05;
        break;
        
      case 'celebrating':
        // Energetic spinning and bouncing
        meshRef.current.scale.y = scale * (1 + Math.sin(time * 5) * 0.15);
        meshRef.current.scale.x = scale * (1 + Math.cos(time * 5) * 0.15);
        meshRef.current.rotation.y = time * 2;
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(time * 4)) * 0.3;
        break;
        
      case 'working':
        // Methodical movement
        meshRef.current.scale.y = scale * (1 + Math.sin(time * 8) * 0.03);
        meshRef.current.rotation.y = time * 0.2;
        meshRef.current.rotation.x = Math.sin(time * 4) * 0.1;
        groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.05;
        // Add a slight side-to-side movement
        groupRef.current.position.x = Math.sin(time * 1.5) * 0.1;
        break;
    }
    
    // Auto-revert to idle after animation duration ends
    if (currentAnimation !== 'idle' && animElapsed > animationDuration.current) {
      previousAnimation.current = currentAnimation;
      setCurrentAnimation('idle');
      transitionProgress.current = 0;
      animationStartTime.current = now;
    }
  });

  // Enhanced material getter with more visual appeal for each profession
  const getMaterial = (prof: Profession) => {
    const baseColor = getColor(prof);
    
    switch(prof) {
      case 'real-estate':
        // Glass-like material for real estate
        return (
          <meshPhysicalMaterial 
            color={baseColor}
            metalness={0.9}
            roughness={0.1}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
            envMapIntensity={1.5}
          />
        );
      
      case 'ecommerce':
        // Shiny metal material
        return (
          <meshStandardMaterial 
            color={baseColor}
            metalness={0.9}
            roughness={0.1}
            emissive={baseColor}
            emissiveIntensity={0.2}
          />
        );
      
      case 'content-creator':
        // Glossy plastic-like material
        return (
          <meshPhysicalMaterial 
            color={baseColor}
            metalness={0.3}
            roughness={0.2}
            clearcoat={0.8}
            envMapIntensity={1.2}
          />
        );
        
      case 'crypto':
        // Gold-like material with high reflectivity
        return (
          <meshStandardMaterial 
            color={baseColor}
            metalness={1.0}
            roughness={0.1}
            emissive={baseColor}
            emissiveIntensity={0.3}
            envMapIntensity={2.0}
          />
        );
        
      default:
        // Default enhanced material
        return (
          <meshPhysicalMaterial 
            color={baseColor}
            metalness={0.7}
            roughness={0.2}
            envMapIntensity={1.0}
            clearcoat={0.5}
            emissive={baseColor}
            emissiveIntensity={0.1}
          />
        );
    }
  };

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <primitive object={getGeometry(profession)} attach="geometry" />
        {getMaterial(profession)}
      </mesh>
      
      {/* Add particle effects around the model */}
      {profession === 'crypto' && (
        <pointLight 
          position={[0, 0, 0]} 
          distance={1.5}
          intensity={1.5} 
          color={getColor(profession)} 
        />
      )}
    </group>
  );
};

interface SceneProps {
  profession: Profession;
  isLarge?: boolean;
  animation?: CharacterAnimation;
}

// Scene setup with camera and lighting
const Scene: React.FC<SceneProps> = ({ profession, isLarge = false, animation = 'idle' }) => {
  const { camera, scene, gl } = useThree();
  
  // Debug helper function for scene with proper type safety
  const debugScene = () => {
    console.log('Scene debug info:', {
      children: scene.children.length,
      lights: scene.children.filter(c => c.type && c.type.includes('Light')).length,
      cameras: scene.children.filter(c => c.type && c.type.includes('Camera')).length,
      // Safely check for materials
      background: scene.background ? 'set' : 'none',
      fog: scene.fog ? 'set' : 'none',
      renderer: gl ? 'available' : 'missing',
      rendererProps: gl ? {
        size: { width: gl.domElement.width, height: gl.domElement.height },
        isVisible: gl.domElement.style.visibility !== 'hidden',
        domElement: gl.domElement ? 'exists' : 'missing'
      } : 'n/a'
    });
  };
  
  // Set up the scene once with immediate debug output
  useEffect(() => {
    // Clear any previous scene settings that might interfere
    scene.background = new THREE.Color('#FF00FF'); // Bright magenta for visibility during debug
    scene.fog = null; // Temporarily remove fog for debugging
    
    console.log('Scene setup effect running', { profession, isLarge, animation });
    
    // Set a timeout to log the scene state after everything has rendered
    setTimeout(debugScene, 500);
    
    return () => {
      console.log('Scene cleanup called');
    };
  }, [scene, profession, isLarge, animation]);
  
  // Camera positioning with explicit logging
  useEffect(() => {
    // Set camera position with explict values
    if (isLarge) {
      camera.position.set(0, 1, 4);
    } else {
      camera.position.set(0, 0.5, 2.5);
    }
    // Always ensure the camera is looking at the origin
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix(); // Important for camera changes to take effect
    
    // Simplified camera properties logging to avoid type errors
    console.log('Camera positioned:', {
      position: camera.position,
      isLarge,
      type: camera.type || 'unknown',
      near: camera.near,
      far: camera.far
    });
    
    // Check if we have a PerspectiveCamera by type checking
    if (camera.type === 'PerspectiveCamera') {
      // It's safe to cast now that we've checked the type
      const perspCamera = camera as unknown as THREE.PerspectiveCamera;
      console.log('Perspective camera details:', {
        fov: perspCamera.fov,
        aspect: perspCamera.aspect,
        zoom: perspCamera.zoom
      });
    }
  }, [camera, isLarge]);
  
  // Simplified environment preset for debugging
  const getEnvironmentPreset = () => "city"; // Use a single preset during debug
  
  return (
    <>
      {/* Basic test cube for visibility verification */}
      <mesh position={[0, 0, -1]} scale={0.5}>
        <boxGeometry />
        <meshStandardMaterial color="red" />
      </mesh>
      
      {/* Simplified lighting setup for debugging */}
      <ambientLight intensity={1.0} /> {/* Increased intensity for better visibility */}
      
      {/* Main directional light with simplified props */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1.5} 
        castShadow={false} // Disable shadows during debug
      />
      
      {/* Reduced number of lights for debugging */}
      <pointLight position={[0, 5, 0]} intensity={1.0} color="#FFFFFF" />
      
      {/* Character model with animation - wrapped in error boundary*/}
      <ErrorBoundary fallback={<mesh position={[0, 0, 0]}><sphereGeometry args={[1, 16, 16]} /><meshStandardMaterial color="yellow" /></mesh>}>
        <CharacterModel 
          profession={profession} 
          scale={isLarge ? 1.5 : 1} 
          position={[0, 0, 0]} 
          animation={animation}
        />
      </ErrorBoundary>
      
      {/* Simplified ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow={false}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#162033" /> {/* Using basic material for reliability */}
      </mesh>
      
      {/* Orbit controls with simplified settings */}
      {isLarge && (
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          enableDamping={false} // Disable damping for more reliable behavior
        />
      )}
      
      {/* Optional environment map - comment out if causing issues */}
      {/* <Environment preset={getEnvironmentPreset()} background={false} /> */}
    </>
  );
};

// Simple error boundary component for Three.js components
class ErrorBoundary extends React.Component<{fallback: React.ReactNode, children: React.ReactNode}> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: any) {
    console.error('Three.js component error caught by boundary:', error);
    return { hasError: true, error };
  }
  
  componentDidCatch(error: any, errorInfo: any) {
    console.error('Error details:', { error, errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      console.log('Rendering error fallback');
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface CharacterSceneProps {
  profession: Profession;
  isLarge?: boolean;
  className?: string;
  animation?: CharacterAnimation;
}

// Main component that exports the 3D character scene
const CharacterScene: React.FC<CharacterSceneProps> = ({ 
  profession, 
  isLarge = false, 
  className = "",
  animation = 'idle'
}) => {
  // Debug flag for visibility troubleshooting
  const [canvasErr, setCanvasErr] = useState<string | null>(null);
  
  // Add debug effect
  useEffect(() => {
    console.log('CharacterScene mounted:', {
      profession,
      isLarge,
      animation,
      containerHeight: isLarge ? '400px' : '200px'
    });
    
    // Debug size of canvas container after render
    setTimeout(() => {
      const container = document.querySelector('.character-scene-container');
      if (container) {
        const rect = (container as HTMLElement).getBoundingClientRect();
        console.log('Canvas container dimensions:', {
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0
        });
      } else {
        console.warn('Canvas container not found in DOM');
      }
    }, 100);
  }, [profession, isLarge, animation]);
  
  return (
    <div 
      className={`relative overflow-hidden rounded-xl character-scene-container ${className}`} 
      style={{ 
        height: isLarge ? '400px' : '200px',
        minHeight: isLarge ? '400px' : '200px',
        visibility: 'visible',
        position: 'relative'
      }}
    >
      {canvasErr ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-red-500 p-4 text-sm">
          {canvasErr}
        </div>
      ) : (
        <Canvas 
          shadows 
          dpr={[1, 2]}
          style={{ background: '#0A0F1D' }}
          gl={{ 
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
          }}
          onCreated={({ gl, scene }) => {
            console.log('Canvas created successfully', { gl, scene });
            // Set a bright background for visibility testing
            scene.background = new THREE.Color('#FF00FF');
          }}
          onError={(error: any) => {
            console.error('Canvas error:', error);
            setCanvasErr(error?.message || 'Canvas rendering error');
          }}
        >
          {/* Debug cube to verify rendering */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#00FF00" />
          </mesh>
          
          <Scene profession={profession} isLarge={isLarge} animation={animation} />
          
          {/* Always include a camera */}
          <PerspectiveCamera 
            makeDefault 
            position={[0, isLarge ? 1 : 0.5, isLarge ? 4 : 2.5]} 
            fov={30} 
          />
          
          {/* Add basic lighting for visibility */}
          <ambientLight intensity={1.0} />
          <directionalLight position={[5, 5, 5]} intensity={1.0} />
        </Canvas>
      )}
    </div>
  );
};

export default CharacterScene;