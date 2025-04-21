import React, { useEffect, useRef } from 'react';

interface ShootingStar {
  id: number;
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  delay: number;
  color: string;
  blur: number;
  width: number;
  opacity: number;
  active: boolean;
  tailLength: number;
  glowIntensity: number;
}

/**
 * High-Performance Shooting Stars component with realistic physics and
 * superior visual effects using optimized Canvas-based rendering
 */
const AdvancedShootingStars: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stars = useRef<ShootingStar[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  
  // Initialize stars on component mount
  useEffect(() => {
    const generateStars = () => {
      const newStars: ShootingStar[] = [];
      const starCount = 6; // Reduced count for better performance
      
      // Refined colors for more realistic appearance (no red)
      const colors = [
        'rgb(255, 255, 255)', // Pure white
        'rgb(220, 240, 255)', // Light blue-white
        'rgb(51, 195, 189)',  // Teal
        'rgb(100, 180, 255)', // Sky blue
        'rgb(168, 150, 255)', // Soft purple
        'rgb(200, 200, 255)'  // Pale blue
      ];
      
      for (let i = 0; i < starCount; i++) {
        const speed = Math.random() * 300 + 400; // Faster speed for more realistic movement
        newStars.push({
          id: i,
          x: Math.random() * 100, // % starting position
          y: Math.random() * 40,  // % starting position (higher in sky)
          length: Math.random() * 150 + 120, // Length of trail
          speed: speed,
          angle: Math.random() * 15 + 30, // More consistent downward angle
          delay: Math.random() * 8 * 1000, // Less delay for more frequent stars
          color: colors[i % colors.length],
          blur: Math.random() * 3 + 2, // Less blur for sharper appearance
          width: Math.random() * 1.5 + 1, // Thinner for more realism
          opacity: Math.random() * 0.4 + 0.6, // Higher opacity for more visibility
          active: false,
          tailLength: Math.random() * 0.4 + 0.6, // Variation in tail length
          glowIntensity: Math.random() * 0.3 + 0.7 // Variation in glow brightness
        });
      }
      
      return newStars;
    };
    
    stars.current = generateStars();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Set display size (css pixels)
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        // Set actual size in memory (scaled to account for extra pixel density)
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Normalize coordinate system to use css pixels
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    };
    
    // Set initial size
    resizeCanvas();
    
    // Update canvas size on window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Start animation
    lastTimeRef.current = performance.now();
    animationFrameId.current = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);
  
  // Animation function with performance optimizations
  const animate = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    
    // Calculate delta time for smooth animation
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    
    // Only clear and redraw every frame (no skipping)
    frameCountRef.current++;
    
    // Clear canvas using composite operation instead of clearRect for better performance
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Fade trail effect
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Use lighter blend mode for additive blending of star trails
    ctx.globalCompositeOperation = 'lighter';
    
    // Draw each star
    stars.current.forEach(star => {
      // Calculate position based on time
      const elapsedTime = Math.max(0, timestamp - star.delay);
      
      if (elapsedTime > 0) {
        // Mark star as active after delay
        if (!star.active) {
          star.active = true;
        }
        
        // Calculate dynamic progress
        const diagonalLength = Math.sqrt(
          Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2)
        );
        
        const distance = (star.speed * elapsedTime / 1000) % (diagonalLength * 1.5);
        const progress = distance / (diagonalLength * 1.5);
        
        if (progress < 1) {
          // Calculate trail positions
          const angleRad = (star.angle * Math.PI) / 180;
          const startX = (star.x / 100) * canvas.width;
          const startY = (star.y / 100) * canvas.height;
          
          drawShootingStar(star, progress, startX, startY, angleRad, ctx, canvas);
        } else {
          // Reset star for reuse with new properties
          star.x = Math.random() * 100;
          star.y = Math.random() * 40;
          star.length = Math.random() * 150 + 120;
          star.speed = Math.random() * 300 + 400;
          star.angle = Math.random() * 15 + 30;
          star.opacity = Math.random() * 0.4 + 0.6;
          star.blur = Math.random() * 3 + 2;
          star.width = Math.random() * 1.5 + 1;
          star.tailLength = Math.random() * 0.4 + 0.6;
          star.glowIntensity = Math.random() * 0.3 + 0.7;
          star.delay = timestamp + Math.random() * 3000; // Shorter delay
          star.active = false;
        }
      }
    });
    
    // Continue animation
    animationFrameId.current = requestAnimationFrame(animate);
  };
  
  const drawShootingStar = (
    star: ShootingStar, 
    progress: number, 
    startX: number, 
    startY: number, 
    angleRad: number,
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement
  ) => {
    // Calculate current position with easing for more natural motion
    // Quadratic easing for acceleration
    const easing = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    const distance = easing * Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2));
    const headX = startX + Math.cos(angleRad) * distance;
    const headY = startY + Math.sin(angleRad) * distance;
    
    // Parse RGB values from the color string
    const rgbMatch = star.color.match(/\d+/g);
    if (!rgbMatch || rgbMatch.length < 3) return;
    
    const r = parseInt(rgbMatch[0]);
    const g = parseInt(rgbMatch[1]);
    const b = parseInt(rgbMatch[2]);
    
    // Dynamic trail length based on speed and progress
    const speedFactor = (star.speed - 300) / 400; // Normalize speed to 0-1 range
    const trailLength = star.length * star.tailLength * (0.5 + progress * 0.5) * (0.8 + speedFactor * 0.4);
    
    // Calculate trail start position
    const trailStartX = headX - Math.cos(angleRad) * trailLength;
    const trailStartY = headY - Math.sin(angleRad) * trailLength;
    
    // Create gradient for the trail with more color stops for better gradient
    const gradient = ctx.createLinearGradient(
      headX, headY, 
      trailStartX, trailStartY
    );
    
    // Enhanced gradient with more stops for realistic meteor trail
    // Head of the shooting star (brightest)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity * star.glowIntensity})`);
    
    // Near head - bright core
    gradient.addColorStop(0.02, `rgba(255, 255, 255, ${star.opacity * 0.9})`);
    
    // Middle front - transition to color
    gradient.addColorStop(0.05, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.8})`);
    
    // Middle core - full color
    gradient.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.6})`);
    
    // Middle back - starting to fade
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.4})`);
    
    // Tail - more fade
    gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.2})`);
    
    // End of the trail - completely fades out
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    // Draw the main trail with optimized blur
    ctx.save();
    // Only apply blur filter if the star is large enough to warrant it
    if (star.width > 1.2) {
      ctx.filter = `blur(${star.blur}px)`;
    }
    
    // Main trail with variable width
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(trailStartX, trailStartY);
    ctx.lineWidth = star.width * (1 + progress * 0.5); // Trail gets slightly thinner as it moves
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
    
    // Add an enhanced glow at the head for realism
    ctx.save();
    ctx.beginPath();
    
    // Larger, more intense glow
    const glowRadius = star.width * (2 + star.glowIntensity * 2);
    const glowGradient = ctx.createRadialGradient(
      headX, headY, 0,
      headX, headY, glowRadius
    );
    
    glowGradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity * star.glowIntensity})`);
    glowGradient.addColorStop(0.4, `rgba(255, 255, 255, ${star.opacity * 0.5})`);
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = glowGradient;
    ctx.arc(headX, headY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    ctx.restore();
    
    // Add subtle particle effects for more realistic meteor appearance
    // Only do this occasionally to maintain performance
    if (star.width > 1.3 && Math.random() > 0.6) {
      const particleCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < particleCount; i++) {
        // Particles appear near the head of the meteor
        const particleDistance = Math.random() * (trailLength * 0.15);
        const particleX = headX - Math.cos(angleRad) * particleDistance;
        const particleY = headY - Math.sin(angleRad) * particleDistance;
        
        // Add slight random offset perpendicular to trail direction
        const perpAngle = angleRad + Math.PI/2;
        const offsetDistance = (Math.random() * 6 - 3) * star.width;
        
        const finalX = particleX + Math.cos(perpAngle) * offsetDistance;
        const finalY = particleY + Math.sin(perpAngle) * offsetDistance;
        
        // Random particle size
        const particleSize = Math.random() * star.width * 0.8 + 0.3;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(finalX, finalY, particleSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`;
        ctx.fill();
        ctx.closePath();
        ctx.restore();
      }
    }
  };
  
  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-5"
      style={{ opacity: 0.9 }} // Higher opacity for better visibility
    />
  );
};

export default AdvancedShootingStars;