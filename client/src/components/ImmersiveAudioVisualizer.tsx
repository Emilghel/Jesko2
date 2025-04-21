import React, { useEffect, useRef, useState } from 'react';

interface ImmersiveAudioVisualizerProps {
  /** Whether audio is actively playing/recording */
  isActive?: boolean;
  /** The audio level from 0 to 1 */
  audioLevel?: number;
  /** The visualization style */
  visualizationType?: 'circular' | 'wave' | 'bars' | 'particles';
  /** The primary color for the visualization */
  primaryColor?: string;
  /** The secondary color for the visualization */
  secondaryColor?: string;
  /** Whether the visualization should respond to mouse interactions */
  interactive?: boolean;
  /** Optional CSS class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

const ImmersiveAudioVisualizer: React.FC<ImmersiveAudioVisualizerProps> = ({
  isActive = false,
  audioLevel = 0,
  visualizationType = 'circular',
  primaryColor = '#33C3BD',
  secondaryColor = '#0075FF',
  interactive = true,
  className = '',
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const audioLevelRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const frequencyDataRef = useRef<number[]>([]);

  // Simulates frequency data for visualization
  useEffect(() => {
    // Simulate frequency data when active
    if (isActive) {
      const generateFrequencyData = () => {
        const simulatedLevel = 0.2 + (audioLevel * 0.8);
        audioLevelRef.current = simulatedLevel;
        
        // Generate simulated frequency data
        const freqCount = 128;
        const newFreqData: number[] = [];
        
        for (let i = 0; i < freqCount; i++) {
          // Create a natural frequency distribution curve
          const baseCurve = Math.sin((i / freqCount) * Math.PI);
          // Add randomness scaled by the audio level
          const randomFactor = Math.random() * 0.3 * simulatedLevel;
          // Calculate final value with time-based variation
          const timeVariation = Math.sin(Date.now() / 500 + i * 0.1) * 0.15 * simulatedLevel;
          
          newFreqData.push(
            (baseCurve * 0.6 + randomFactor + timeVariation) * simulatedLevel
          );
        }
        
        frequencyDataRef.current = newFreqData;
      };
      
      // Update frequency data every 50ms
      const intervalId = setInterval(generateFrequencyData, 50);
      return () => clearInterval(intervalId);
    } else {
      // Gradually reduce audio level when inactive
      const fadeOut = () => {
        audioLevelRef.current *= 0.95;
        if (audioLevelRef.current < 0.01) {
          audioLevelRef.current = 0;
          return;
        }
        requestAnimationFrame(fadeOut);
      };
      
      fadeOut();
      frequencyDataRef.current = frequencyDataRef.current.map(v => v * 0.95);
    }
  }, [isActive, audioLevel]);

  // Handle mouse interaction
  useEffect(() => {
    if (!interactive || !canvasRef.current) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };
    
    const handleMouseLeave = () => {
      setMousePosition(null);
    };
    
    const canvas = canvasRef.current;
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [interactive]);

  // Particle class for particle visualization
  interface Particle {
    x: number;
    y: number;
    size: number;
    speed: number;
    color: string;
    angle: number;
    life: number;
    maxLife: number;
    gravity: number;
  }

  // Main rendering function
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set up high-resolution canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Only resize when dimensions change to avoid performance issues
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }
    
    // Initialize particles once
    if (particlesRef.current.length === 0 && visualizationType === 'particles') {
      const particleCount = 100;
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          size: Math.random() * 3 + 1,
          speed: Math.random() * 1 + 0.5,
          color: Math.random() > 0.5 ? primaryColor : secondaryColor,
          angle: Math.random() * Math.PI * 2,
          life: Math.random() * 100,
          maxLife: 100 + Math.random() * 100,
          gravity: -0.01 + Math.random() * 0.02
        });
      }
    }
    
    const render = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Get the center of the canvas
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const currentAudioLevel = audioLevelRef.current;
      const frequencyData = frequencyDataRef.current;
      
      // Choose visualization type
      switch (visualizationType) {
        case 'circular':
          renderCircularVisualizer(ctx, centerX, centerY, rect.width, rect.height, currentAudioLevel, frequencyData);
          break;
        case 'wave':
          renderWaveVisualizer(ctx, centerX, centerY, rect.width, rect.height, currentAudioLevel, frequencyData);
          break;
        case 'bars':
          renderBarsVisualizer(ctx, centerX, centerY, rect.width, rect.height, currentAudioLevel, frequencyData);
          break;
        case 'particles':
          renderParticlesVisualizer(ctx, centerX, centerY, rect.width, rect.height, currentAudioLevel);
          break;
      }
      
      // Continue animation loop
      animationRef.current = requestAnimationFrame(render);
    };
    
    // Start rendering
    render();
    
    // Clean up animation frame on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [visualizationType, primaryColor, secondaryColor]);

  // Circular visualizer with spinning outer rings and nodes
  const renderCircularVisualizer = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    audioLevel: number,
    frequencyData: number[]
  ) => {
    const radius = Math.min(width, height) * 0.35;
    
    // Create radial gradient
    const gradient = ctx.createRadialGradient(
      centerX, centerY, radius * 0.2, 
      centerX, centerY, radius * 1.2
    );
    gradient.addColorStop(0, `rgba(${hexToRgb(primaryColor)}, ${0.1 + audioLevel * 0.2})`);
    gradient.addColorStop(1, `rgba(${hexToRgb(secondaryColor)}, 0)`);
    
    // Draw background glow
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw frequency circles
    const nodeCount = 32; // Number of nodes around the circle
    const time = Date.now() / 1000;
    
    // Draw 3 rotating rings
    for (let ring = 0; ring < 3; ring++) {
      const ringRadius = radius * (0.6 + ring * 0.25);
      const ringOffset = ring * (Math.PI / nodeCount / 3);
      const rotationSpeed = (3 - ring) * 0.1; // Different speeds per ring
      const ringOpacity = 0.7 - ring * 0.2;
      
      ctx.strokeStyle = ring % 2 === 0 
        ? `rgba(${hexToRgb(primaryColor)}, ${ringOpacity})` 
        : `rgba(${hexToRgb(secondaryColor)}, ${ringOpacity})`;
      
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw nodes for each ring
      for (let i = 0; i < nodeCount; i++) {
        const freqIndex = Math.floor((i / nodeCount) * frequencyData.length);
        const freqValue = frequencyData[freqIndex] || 0;
        
        // Calculate position with rotation
        const angle = ((i / nodeCount) * Math.PI * 2) + (time * rotationSpeed) + ringOffset;
        const nodeSize = 2 + freqValue * 6;
        const distance = ringRadius + (freqValue * 10);
        
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        // Draw node
        const nodeGradient = ctx.createRadialGradient(
          x, y, 0,
          x, y, nodeSize * 2
        );
        
        const color = ring % 2 === 0 ? primaryColor : secondaryColor;
        nodeGradient.addColorStop(0, `rgba(${hexToRgb(color)}, ${0.7 + freqValue * 0.3})`);
        nodeGradient.addColorStop(1, `rgba(${hexToRgb(color)}, 0)`);
        
        ctx.fillStyle = nodeGradient;
        ctx.beginPath();
        ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add connecting lines between adjacent nodes when audio is active
        if (audioLevel > 0.2 && i > 0) {
          const prevAngle = (((i - 1) / nodeCount) * Math.PI * 2) + (time * rotationSpeed) + ringOffset;
          const prevFreq = frequencyData[Math.floor(((i - 1) / nodeCount) * frequencyData.length)] || 0;
          const prevDistance = ringRadius + (prevFreq * 10);
          
          const prevX = centerX + Math.cos(prevAngle) * prevDistance;
          const prevY = centerY + Math.sin(prevAngle) * prevDistance;
          
          ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${0.2 * audioLevel})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
    }
    
    // Interactive element - draw connection to mouse position if close enough
    if (mousePosition && interactive) {
      const distance = Math.sqrt(
        Math.pow(mousePosition.x - centerX, 2) + 
        Math.pow(mousePosition.y - centerY, 2)
      );
      
      if (distance < radius * 2) {
        // Draw connection line
        const connectionOpacity = Math.max(0, 1 - (distance / (radius * 2)));
        
        ctx.strokeStyle = `rgba(${hexToRgb(primaryColor)}, ${connectionOpacity * 0.7})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(mousePosition.x, mousePosition.y);
        ctx.stroke();
        
        // Draw interaction point
        const pointGradient = ctx.createRadialGradient(
          mousePosition.x, mousePosition.y, 0,
          mousePosition.x, mousePosition.y, 10
        );
        pointGradient.addColorStop(0, `rgba(${hexToRgb(primaryColor)}, 0.7)`);
        pointGradient.addColorStop(1, `rgba(${hexToRgb(primaryColor)}, 0)`);
        
        ctx.fillStyle = pointGradient;
        ctx.beginPath();
        ctx.arc(mousePosition.x, mousePosition.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Central core
    const coreGradient = ctx.createRadialGradient(
      centerX, centerY, 0, 
      centerX, centerY, radius * 0.3
    );
    
    coreGradient.addColorStop(0, `rgba(${hexToRgb(primaryColor)}, ${0.3 + audioLevel * 0.7})`);
    coreGradient.addColorStop(0.7, `rgba(${hexToRgb(secondaryColor)}, ${0.1 + audioLevel * 0.3})`);
    coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.3 + (audioLevel * 5), 0, Math.PI * 2);
    ctx.fill();
    
    // Pulse effect when audio is active
    if (audioLevel > 0.2) {
      const pulseTime = Date.now() / 1000;
      const pulseSize = radius * (0.6 + Math.sin(pulseTime * 2) * 0.1);
      const pulseOpacity = 0.3 + Math.sin(pulseTime * 3) * 0.1;
      
      ctx.strokeStyle = `rgba(${hexToRgb(secondaryColor)}, ${pulseOpacity * audioLevel})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  // Wave visualizer with interactive ripple effect
  const renderWaveVisualizer = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    audioLevel: number,
    frequencyData: number[]
  ) => {
    // Draw background glow
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, `rgba(${hexToRgb(primaryColor)}, ${0.05 * audioLevel})`);
    bgGradient.addColorStop(1, `rgba(${hexToRgb(secondaryColor)}, ${0.02 * audioLevel})`);
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Wave parameters
    const time = Date.now() / 1000;
    const waveAmplitude = 20 + audioLevel * 50;
    const waveCount = 3;
    
    // Draw multiple waves
    for (let wave = 0; wave < waveCount; wave++) {
      // Different properties for each wave
      const waveSpeed = 1 + wave * 0.2;
      const waveFrequency = 0.02 - wave * 0.003;
      const wavePhase = time * waveSpeed;
      const waveY = centerY + 20 * wave;
      
      const isLastWave = wave === waveCount - 1;
      
      // Create wave gradient
      const waveColor = wave % 2 === 0 ? primaryColor : secondaryColor;
      const waveOpacity = 0.7 - wave * 0.15;
      
      ctx.strokeStyle = `rgba(${hexToRgb(waveColor)}, ${waveOpacity})`;
      ctx.lineWidth = isLastWave ? 3 : 2;
      
      // Start drawing the wave
      ctx.beginPath();
      
      // Use frequency data to influence the wave
      for (let x = 0; x < width; x++) {
        const freqIndex = Math.floor((x / width) * frequencyData.length);
        const freqValue = frequencyData[freqIndex] || 0;
        
        // Calculate base wave
        const baseWave = Math.sin(x * waveFrequency + wavePhase) * waveAmplitude;
        
        // Add frequency influence
        const frequencyInfluence = freqValue * 30;
        
        // Mouse interaction
        let mouseInfluence = 0;
        if (mousePosition && interactive) {
          const distance = Math.sqrt(Math.pow(mousePosition.x - x, 2) + Math.pow(mousePosition.y - waveY, 2));
          if (distance < 100) {
            const strength = (1 - distance / 100) * 30; // Strength of influence
            mouseInfluence = Math.sin((time * 5) + (distance * 0.1)) * strength;
          }
        }
        
        // Combine all influences
        const y = waveY + baseWave + frequencyInfluence + mouseInfluence;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Add glow effect to the main wave
      if (isLastWave && audioLevel > 0.3) {
        ctx.strokeStyle = `rgba(${hexToRgb(waveColor)}, ${audioLevel * 0.2})`;
        ctx.lineWidth = 8;
        ctx.stroke();
      }
    }
    
    // Interactive elements - ripple effect
    if (mousePosition && interactive && audioLevel > 0.1) {
      const rippleCount = 3;
      const time = Date.now() / 1000;
      
      for (let i = 0; i < rippleCount; i++) {
        const ripplePhase = time + i * 0.7;
        const rippleSize = ((ripplePhase * 30) % 100) + 10;
        const rippleOpacity = Math.max(0, 1 - rippleSize / 110);
        
        ctx.strokeStyle = `rgba(${hexToRgb(primaryColor)}, ${rippleOpacity * audioLevel})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mousePosition.x, mousePosition.y, rippleSize, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  // Bars visualizer with reactive height and glow
  const renderBarsVisualizer = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    audioLevel: number,
    frequencyData: number[]
  ) => {
    // Calculate number of bars based on width
    const barWidth = 8;
    const barSpacing = 2;
    const totalBarWidth = barWidth + barSpacing;
    const barCount = Math.min(Math.floor(width / totalBarWidth), frequencyData.length);
    
    // Time-based variables
    const time = Date.now() / 1000;
    
    // Draw each bar
    for (let i = 0; i < barCount; i++) {
      // Calculate frequency value for this bar
      const freqIndex = Math.floor((i / barCount) * frequencyData.length);
      const freqValue = frequencyData[freqIndex] || 0;
      
      // Calculate bar height based on frequency value and audio level
      const barMaxHeight = height * 0.8;
      let barHeight = freqValue * barMaxHeight * (0.2 + audioLevel * 0.8);
      
      // Add subtle time-based movement
      barHeight += Math.sin(time * 2 + i * 0.1) * 5 * audioLevel;
      
      // Ensure minimum height
      barHeight = Math.max(barHeight, 5);
      
      // Calculate x position
      const x = (i * totalBarWidth) + (width - barCount * totalBarWidth) / 2;
      const y = centerY + barMaxHeight / 2 - barHeight / 2;
      
      // Mouse interaction - make bars near mouse taller
      if (mousePosition && interactive) {
        const distance = Math.abs(mousePosition.x - (x + barWidth / 2));
        if (distance < 50) {
          const influence = (1 - distance / 50) * 30;
          barHeight += influence;
        }
      }
      
      // Create bar gradient
      const barGradient = ctx.createLinearGradient(x, y + barHeight, x, y);
      
      // Color varies based on position and time
      const hue1 = (i / barCount) * 40 + 180; // Blue to cyan range
      const hue2 = (i / barCount) * 40 + 140; // Blue to purple range
      
      barGradient.addColorStop(0, `rgba(${hexToRgb(secondaryColor)}, ${0.7 + audioLevel * 0.3})`);
      barGradient.addColorStop(1, `rgba(${hexToRgb(primaryColor)}, ${0.7 + audioLevel * 0.3})`);
      
      // Draw bar
      ctx.fillStyle = barGradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
      ctx.fill();
      
      // Add glow effect when audio is active
      if (audioLevel > 0.4 && freqValue > 0.5) {
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      // Add reflection
      ctx.fillStyle = `rgba(${hexToRgb(primaryColor)}, ${0.1 * audioLevel})`;
      ctx.beginPath();
      ctx.roundRect(x, y + barHeight + 2, barWidth, barHeight * 0.3, [0, 0, 3, 3]);
      ctx.fill();
    }
    
    // Add connecting lines between bars when audio is active
    if (audioLevel > 0.3) {
      ctx.beginPath();
      for (let i = 0; i < barCount; i++) {
        const freqIndex = Math.floor((i / barCount) * frequencyData.length);
        const freqValue = frequencyData[freqIndex] || 0;
        
        const barMaxHeight = height * 0.8;
        let barHeight = freqValue * barMaxHeight * (0.2 + audioLevel * 0.8);
        barHeight += Math.sin(time * 2 + i * 0.1) * 5 * audioLevel;
        barHeight = Math.max(barHeight, 5);
        
        const x = (i * totalBarWidth) + (width - barCount * totalBarWidth) / 2 + barWidth / 2;
        const y = centerY + barMaxHeight / 2 - barHeight / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.strokeStyle = `rgba(${hexToRgb(primaryColor)}, ${0.3 * audioLevel})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  // Particle system visualization with audio-reactive behavior
  const renderParticlesVisualizer = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    audioLevel: number
  ) => {
    // Create background gradient
    const bgGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, height
    );
    bgGradient.addColorStop(0, `rgba(${hexToRgb(primaryColor)}, ${0.05 * audioLevel})`);
    bgGradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    const particles = particlesRef.current;
    const time = Date.now() / 1000;
    
    // Update and draw each particle
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      // Update particle position
      p.life += 0.5;
      if (p.life >= p.maxLife) {
        // Reset particle
        p.x = centerX + (Math.random() - 0.5) * 50;
        p.y = centerY + (Math.random() - 0.5) * 50;
        p.angle = Math.random() * Math.PI * 2;
        p.life = 0;
        p.speed = 0.5 + Math.random() * 1.5;
        p.size = Math.random() * 3 + 1;
        p.color = Math.random() > 0.5 ? primaryColor : secondaryColor;
      }
      
      // Audio influence on speed and angle
      const baseSpeed = p.speed * (0.5 + audioLevel * 2);
      
      // Time-based variation and audio influence
      const angleVariation = Math.sin(time + p.life * 0.1) * 0.2 * audioLevel;
      p.angle += angleVariation;
      
      // Apply movement
      p.x += Math.cos(p.angle) * baseSpeed;
      p.y += Math.sin(p.angle) * baseSpeed + p.gravity;
      
      // Mouse interaction
      if (mousePosition && interactive) {
        const dx = mousePosition.x - p.x;
        const dy = mousePosition.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          // Attract particles to mouse
          const force = (1 - distance / 100) * 0.2;
          p.x += dx * force;
          p.y += dy * force;
        }
      }
      
      // Keep particles within bounds with soft edge behavior
      const margin = 50;
      if (p.x < -margin) p.x = width + margin;
      if (p.x > width + margin) p.x = -margin;
      if (p.y < -margin) p.y = height + margin;
      if (p.y > height + margin) p.y = -margin;
      
      // Calculate opacity based on life and audio level
      const lifeRatio = p.life / p.maxLife;
      const fadeInOut = Math.sin(lifeRatio * Math.PI);
      const opacity = fadeInOut * 0.7 * (0.3 + audioLevel * 0.7);
      
      // Draw particle
      const particleSize = p.size * (1 + audioLevel * 0.5);
      
      ctx.fillStyle = `rgba(${hexToRgb(p.color)}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow effect when audio is active
      if (audioLevel > 0.4) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      // Connect nearby particles
      if (audioLevel > 0.3) {
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 70) {
            // Calculate connection opacity based on distance and audio level
            const connectionOpacity = (1 - distance / 70) * 0.3 * audioLevel;
            
            ctx.strokeStyle = `rgba(${hexToRgb(primaryColor)}, ${connectionOpacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
    }
    
    // Draw center point that reacts to audio
    const centerSize = 5 + audioLevel * 15;
    const centerOpacity = 0.3 + audioLevel * 0.7;
    
    const centerGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, centerSize * 2
    );
    centerGradient.addColorStop(0, `rgba(${hexToRgb(primaryColor)}, ${centerOpacity})`);
    centerGradient.addColorStop(0.5, `rgba(${hexToRgb(secondaryColor)}, ${centerOpacity * 0.7})`);
    centerGradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
    
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Pulse waves emanating from center when audio is active
    if (audioLevel > 0.2) {
      const waveCount = 3;
      for (let i = 0; i < waveCount; i++) {
        const wavePhase = (time * 0.5 + i * 0.33) % 1;
        const waveSize = wavePhase * 200;
        const waveOpacity = Math.max(0, 0.5 - wavePhase) * audioLevel;
        
        ctx.strokeStyle = `rgba(${hexToRgb(secondaryColor)}, ${waveOpacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, waveSize, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  // Helper function to convert hex color to RGB
  const hexToRgb = (hex: string): string => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
  };

  return (
    <div className={`immersive-audio-visualizer ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default ImmersiveAudioVisualizer;