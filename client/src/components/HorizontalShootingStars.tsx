import React, { useEffect, useRef } from 'react';

interface HorizontalShootingStar {
  id: number;
  y: number;
  width: number;
  speed: number;
  delay: number;
  color: string;
  blur: number;
  opacity: number;
  sparkleSize: number;
  active: boolean;
  height: number;
  glowIntensity: number;
}

/**
 * High-Performance Horizontal Shooting Stars component that uses optimized Canvas
 * rendering for smooth, realistic star animations with proper physics
 */
const HorizontalShootingStars: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stars = useRef<HorizontalShootingStar[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  
  // Initialize stars on component mount
  useEffect(() => {
    const generateStars = () => {
      const newStars: HorizontalShootingStar[] = [];
      const starCount = 4; // Reduced for better performance
      
      // Refined colors without red for more realistic appearance
      const colors = [
        'rgb(255, 255, 255)', // Pure white
        'rgb(220, 240, 255)', // Light blue-white
        'rgb(51, 195, 189)',  // Teal
        'rgb(130, 180, 255)', // Sky blue
        'rgb(168, 150, 255)', // Soft purple
        'rgb(200, 200, 255)'  // Pale blue
      ];
      
      for (let i = 0; i < starCount; i++) {
        newStars.push({
          id: i,
          y: Math.random() * 70 + 10, // % position vertically (in middle portion of screen)
          width: Math.random() * 150 + 180, // Longer width for better trails
          speed: Math.random() * 200 + 250, // Faster for more realistic movement
          delay: Math.random() * 6 * 1000, // Less delay between stars
          color: colors[i % colors.length],
          blur: Math.random() * 3 + 1.5, // Less blur for sharper appearance
          opacity: Math.random() * 0.5 + 0.5, // Higher opacity
          sparkleSize: Math.random() * 2 + 1.5, // Slightly smaller sparkles
          active: false,
          height: Math.random() * 1.5 + 0.7, // Variable height for trail
          glowIntensity: Math.random() * 0.4 + 0.6 // Variable glow
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
  
  // Optimized animation function
  const animate = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    
    // Calculate delta time for smooth animation
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    
    // Track frame count
    frameCountRef.current++;
    
    // Clear canvas using fade effect for smooth trails
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Fade trail effect
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Use lighter blend mode for additive blending
    ctx.globalCompositeOperation = 'lighter';
    
    // Draw each star
    stars.current.forEach(star => {
      // Calculate position based on time
      const elapsedTime = Math.max(0, timestamp - star.delay);
      
      if (elapsedTime > 0) {
        // Mark star as active
        if (!star.active) {
          star.active = true;
        }
        
        // Calculate distance moved
        const distance = (star.speed * elapsedTime / 1000);
        
        // Calculate x position with wrap-around
        const totalDistance = canvas.width + star.width + 200;
        const x = (canvas.width - (distance % totalDistance));
        
        // Only draw if star is visible on screen
        if (x < canvas.width + 100 && x > -star.width - 100) {
          const y = star.y * canvas.height / 100;
          drawStar(star, x, y, ctx, canvas);
        }
        
        // Reset star with new properties once it goes offscreen
        if (x < -star.width - 100) {
          star.y = Math.random() * 70 + 10;
          star.width = Math.random() * 150 + 180;
          star.speed = Math.random() * 200 + 250;
          star.opacity = Math.random() * 0.5 + 0.5;
          star.blur = Math.random() * 3 + 1.5;
          star.sparkleSize = Math.random() * 2 + 1.5;
          star.height = Math.random() * 1.5 + 0.7;
          star.glowIntensity = Math.random() * 0.4 + 0.6;
          star.delay = timestamp + Math.random() * 3000;
          star.active = false;
        }
      }
    });
    
    // Continue animation
    animationFrameId.current = requestAnimationFrame(animate);
  };
  
  // Enhanced star drawing with realistic effects
  const drawStar = (
    star: HorizontalShootingStar, 
    x: number, 
    y: number, 
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    // Parse the RGB values from the color
    const rgbMatch = star.color.match(/\d+/g);
    if (!rgbMatch || rgbMatch.length < 3) return;
    
    const r = parseInt(rgbMatch[0]);
    const g = parseInt(rgbMatch[1]);
    const b = parseInt(rgbMatch[2]);
    
    // Calculate visually pleasing gradient stops
    const gradient = ctx.createLinearGradient(x, y, x + star.width, y);
    
    // Enhanced gradient with more stops for realistic meteor trail
    // Head of the shooting star (brightest)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity * star.glowIntensity})`);
    
    // Near head - bright core
    gradient.addColorStop(0.01, `rgba(255, 255, 255, ${star.opacity * 0.9})`);
    
    // Middle front - transition to color
    gradient.addColorStop(0.03, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.8})`);
    
    // Middle core - full color
    gradient.addColorStop(0.15, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.6})`);
    
    // Middle back - starting to fade
    gradient.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.4})`);
    
    // Tail - more fade
    gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.2})`);
    
    // End of the trail - completely fades out
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    // Draw the main trail - only use blur for larger stars to improve performance
    ctx.save();
    if (star.height > 1.3) {
      ctx.filter = `blur(${star.blur}px)`;
    }
    
    // Draw main trail with custom thickness
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + star.width, y);
    ctx.lineWidth = star.height * 2; // Adjust for desired thickness
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
    
    // Add a brighter core at the leading edge
    ctx.save();
    
    // Create a radial gradient for the head glow
    const glowRadius = star.height * 5 * star.glowIntensity;
    const glowGradient = ctx.createRadialGradient(
      x, y, 0,
      x, y, glowRadius
    );
    
    glowGradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity * star.glowIntensity})`);
    glowGradient.addColorStop(0.4, `rgba(255, 255, 255, ${star.opacity * 0.5})`);
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    ctx.restore();
    
    // Add small sparkles around the head for realism
    // Only add these for larger stars to maintain performance
    if (star.height > 1 && Math.random() > 0.5) {
      const sparkleCount = Math.floor(Math.random() * 2) + 1;
      
      for (let i = 0; i < sparkleCount; i++) {
        const offsetX = (Math.random() * 15 - 5);
        const offsetY = (Math.random() * 6 - 3) * star.height;
        const size = Math.random() * star.sparkleSize * 0.6 + 0.3;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.7 + 0.3})`;
        ctx.fill();
        ctx.closePath();
        ctx.restore();
      }
    }
  };
  
  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ opacity: 0.9 }} // Higher opacity for better visibility
    />
  );
};

export default HorizontalShootingStars;