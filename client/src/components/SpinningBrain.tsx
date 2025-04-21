import { useEffect, useState, useRef } from 'react';

export default function SpinningBrain({ 
  width = 150, 
  height = 150
}: { 
  width?: number, 
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [neurons, setNeurons] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    pulse: number;
    color: string;
  }>>([]);
  
  const [connections, setConnections] = useState<Array<{
    id: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    opacity: number;
    animationDuration: string;
  }>>([]);
  
  // 3D effect animation
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    let requestId: number;
    let angle = 0;
    
    const animate = () => {
      angle += 0.005;
      
      // Update container with subtle 3D rotation effect
      if (container) {
        container.style.transform = `rotateY(${Math.sin(angle) * 15}deg) rotateX(${Math.cos(angle) * 8}deg)`;
      }
      
      requestId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(requestId);
    };
  }, []);

  // Generate random neurons and connections in a 3D brain structure
  useEffect(() => {
    // Create random neurons
    const newNeurons = Array.from({ length: 24 }, (_, i) => {
      // Create a more brain-like structure with clusters of neurons
      // Using parametric equations to create a brain-like shape
      let angle, distance, x, y;
      
      if (i < 8) {
        // Front lobe neurons
        angle = (i / 8) * Math.PI + Math.PI/4;
        distance = 25 + Math.random() * 12;
        x = Math.cos(angle) * distance + (Math.random() * 6 - 3) + width * 0.5;
        y = Math.sin(angle) * distance * 0.8 + (Math.random() * 6 - 3) + height * 0.35;
      } else if (i < 16) {
        // Back lobe neurons
        angle = ((i - 8) / 8) * Math.PI + Math.PI/4;
        distance = 25 + Math.random() * 12;
        x = Math.cos(angle) * distance + (Math.random() * 6 - 3) + width * 0.5;
        y = Math.sin(angle) * distance * 0.8 + (Math.random() * 6 - 3) + height * 0.65;
      } else {
        // Central brain neurons
        angle = (i / 8) * Math.PI * 2;
        distance = 15 + Math.random() * 20;
        x = Math.cos(angle) * distance + (Math.random() * 8 - 4) + width * 0.5;
        y = Math.sin(angle) * distance + (Math.random() * 8 - 4) + height * 0.5;
      }
      
      // Use different sizes and colors for visual depth
      const depth = Math.random(); // 0-1 value for z-axis simulation
      
      return {
        id: i,
        x,
        y,
        size: 1.5 + Math.random() * 3.5 + depth * 2, // Larger neurons appear closer
        pulse: 1 + Math.random() * 3, // Animation pulse speed
        color: depth > 0.6 ? '#00ffff' : 
               depth > 0.3 ? '#8a2be2' : 
               '#b612ff' // Color varies by depth
      };
    });
    
    setNeurons(newNeurons);
    
    // Create connections between neurons
    const newConnections = [];
    
    // Connect each neuron to at least 2 other neurons
    for (let i = 0; i < newNeurons.length; i++) {
      const neuron = newNeurons[i];
      
      // Find closest neighbors
      const neighbors = [...newNeurons]
        .filter(n => n.id !== neuron.id)
        .sort((a, b) => {
          const distA = Math.sqrt(Math.pow(a.x - neuron.x, 2) + Math.pow(a.y - neuron.y, 2));
          const distB = Math.sqrt(Math.pow(b.x - neuron.x, 2) + Math.pow(b.y - neuron.y, 2));
          return distA - distB;
        })
        .slice(0, 3); // Connect to 3 closest neighbors
      
      for (const neighbor of neighbors) {
        newConnections.push({
          id: newConnections.length,
          x1: neuron.x,
          y1: neuron.y,
          x2: neighbor.x,
          y2: neighbor.y,
          opacity: 0.3 + Math.random() * 0.5,
          animationDuration: `${1 + Math.random() * 4}s`
        });
      }
    }
    
    setConnections(newConnections);
  }, [width, height]);
  
  return (
    <div 
      className="relative mx-auto" 
      style={{ 
        width, 
        height,
        perspective: '800px',
        perspectiveOrigin: 'center center',
      }}
    >
      {/* 3D Container with transform-style for 3D space */}
      <div 
        ref={containerRef}
        className="relative w-full h-full"
        style={{ 
          transformStyle: 'preserve-3d',
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Background sphere with gradient and 3D effects */}
        <div 
          className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-900/30 to-indigo-900/30 animate-pulse" 
          style={{ 
            animationDuration: '3s',
            boxShadow: 'inset 0 0 20px rgba(138, 43, 226, 0.4), 0 0 15px rgba(138, 43, 226, 0.3)',
          }} 
        />

        {/* 3D depth layer - back hemisphere (slightly smaller and positioned behind) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(77, 0, 153, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
            transform: 'translateZ(-10px) scale(0.95)',
            opacity: 0.7,
          }}
        />
        
        {/* SVG content with neurons and connections */}
        <svg width={width} height={height} className="absolute top-0 left-0" style={{ pointerEvents: 'none' }}>
          {/* Enhanced outer glow */}
          <filter id="brain-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -7" result="glow" />
            <feBlend in="SourceGraphic" in2="glow" mode="normal" />
          </filter>
          
          {/* 3D enhancement filter */}
          <filter id="brain-3d-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feSpecularLighting in="blur" specularExponent="20" lightingColor="#ffffff" surfaceScale="2" result="specular">
              <fePointLight x="100" y="100" z="150" />
            </feSpecularLighting>
            <feComposite in="SourceGraphic" in2="specular" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
          
          {/* Enhanced gradient for brain elements */}
          <defs>
            <linearGradient id="brain-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9C00FF" />
              <stop offset="50%" stopColor="#8A2BE2" />
              <stop offset="100%" stopColor="#00BFFF" />
            </linearGradient>
            
            <radialGradient id="brain-radial" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#b612ff" />
              <stop offset="70%" stopColor="#8a2be2" />
              <stop offset="100%" stopColor="#00ffff" />
            </radialGradient>
            
            {/* Animation for connection pulsing with 3D depth */}
            <filter id="connection-glow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0.6  0 1 0 0 0.2  0 0 1 0 1  0 0 0 18 -7" result="glow" />
              <feBlend in="SourceGraphic" in2="glow" mode="normal" />
            </filter>
          </defs>
          
          {/* Brain outline spheres - multiple layers for 3D depth */}
          <circle 
            cx={width / 2} 
            cy={height / 2} 
            r={width / 2 - 5} 
            fill="none" 
            stroke="url(#brain-gradient)" 
            strokeWidth="0.7" 
            strokeOpacity="0.7"
            style={{ filter: 'url(#brain-glow)' }}
            className="animate-pulse"
          />
          
          <circle 
            cx={width / 2} 
            cy={height / 2} 
            r={width / 2 - 15} 
            fill="none" 
            stroke="url(#brain-gradient)" 
            strokeWidth="0.5" 
            strokeOpacity="0.5"
            style={{ filter: 'url(#brain-glow)' }}
            className="animate-pulse"
          />
          
          {/* Neural connections */}
          {connections.map(conn => (
            <line 
              key={conn.id}
              x1={conn.x1}
              y1={conn.y1}
              x2={conn.x2}
              y2={conn.y2}
              stroke="url(#brain-gradient)"
              strokeWidth="0.8"
              strokeOpacity={conn.opacity}
              className="animate-pulse"
              style={{ 
                animationDuration: conn.animationDuration,
                filter: 'url(#connection-glow)'
              }}
            />
          ))}
          
          {/* Neurons with improved 3D appearance */}
          {neurons.map(neuron => (
            <g key={neuron.id}>
              {/* Neuron glow halo for 3D depth */}
              <circle
                cx={neuron.x}
                cy={neuron.y}
                r={neuron.size + 2}
                fill={neuron.color}
                opacity={0.3}
                className="animate-pulse"
                style={{ 
                  animationDuration: `${neuron.pulse * 1.5}s`,
                }}
              />
              
              {/* Main neuron */}
              <circle
                cx={neuron.x}
                cy={neuron.y}
                r={neuron.size}
                fill={neuron.color}
                className="animate-pulse"
                style={{ 
                  animationDuration: `${neuron.pulse}s`,
                  filter: 'url(#brain-glow)'
                }}
              />
              
              {/* Highlight for 3D effect */}
              <circle
                cx={neuron.x - neuron.size/3}
                cy={neuron.y - neuron.size/3}
                r={neuron.size/3}
                fill="rgba(255,255,255,0.3)"
                className="animate-pulse"
                style={{ 
                  animationDuration: `${neuron.pulse}s`,
                }}
              />
            </g>
          ))}
        </svg>
        
        {/* Multiple rotating rings for 3D depth effect */}
        <div 
          className="absolute inset-0 rounded-full border border-purple-500/40 animate-spin"
          style={{ 
            animationDuration: '15s', 
            borderStyle: 'dashed',
            transform: 'translateZ(5px) rotateX(75deg) scale(0.9)',
          }}
        />
        
        <div 
          className="absolute inset-0 rounded-full border border-cyan-500/30 animate-spin"
          style={{ 
            animationDuration: '25s', 
            borderStyle: 'dashed',
            transform: 'translateZ(-5px) rotateX(-65deg) scale(0.9)',
            animationDirection: 'reverse',
          }}
        />
      </div>
    </div>
  );
}