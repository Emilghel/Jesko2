/**
 * Enhanced UFO Motion Effects
 * 
 * This script adds dynamic motion-based effects to UFO elements:
 * - Motion trails during fast movements
 * - Dynamic hover effects
 * - Random path variations
 */

document.addEventListener('DOMContentLoaded', function() {
  // Select all UFO elements
  const ufos = document.querySelectorAll('.premium-ufo-container');
  
  if (ufos.length === 0) {
    console.log('No UFO elements found on this page');
    return;
  }
  
  console.log(`Found ${ufos.length} UFO elements`);
  
  // Initialize effects for each UFO
  ufos.forEach((ufo, index) => {
    // Add base styles with unique animation delay for each UFO
    ufo.style.animationDelay = `${index * -15}s`;
    
    // Initialize motion tracking data
    const motionData = {
      lastPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      speed: 0,
      pathVariationStrength: Math.random() * 0.2 + 0.1, // Random path variation strength
      lastUpdateTime: Date.now()
    };
    
    // Store motion data on the element
    ufo._motionData = motionData;
    
    // Create motion trail elements for high-speed movement
    const trailCount = 3;
    for (let i = 0; i < trailCount; i++) {
      const trail = document.createElement('div');
      trail.className = 'ufo-motion-trail';
      trail.style.opacity = 0;
      trail.style.position = 'absolute';
      trail.style.pointerEvents = 'none';
      trail.style.transition = 'opacity 0.2s ease-out';
      trail.style.zIndex = -1;
      
      // Clone the SVG inside the UFO
      const svg = ufo.querySelector('svg').cloneNode(true);
      trail.appendChild(svg);
      
      // Add trail to UFO container and store reference
      document.body.appendChild(trail);
      
      // Store trail reference
      if (!ufo._trails) ufo._trails = [];
      ufo._trails.push(trail);
    }
    
    // Add random path variation
    addPathVariation(ufo);
  });
  
  // Set up motion tracking
  let animationFrame;
  function updateMotionEffects() {
    ufos.forEach(ufo => {
      const rect = ufo.getBoundingClientRect();
      const motionData = ufo._motionData;
      const currentTime = Date.now();
      const deltaTime = (currentTime - motionData.lastUpdateTime) / 1000;
      
      // Store previous position
      motionData.lastPosition = { ...motionData.currentPosition };
      
      // Update current position
      motionData.currentPosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      
      // Calculate speed (pixels per second)
      const dx = motionData.currentPosition.x - motionData.lastPosition.x;
      const dy = motionData.currentPosition.y - motionData.lastPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      motionData.speed = distance / deltaTime;
      
      // Update trails based on speed
      if (motionData.speed > 200) { // Only show trails when moving fast
        // Update trail positions and opacity
        if (ufo._trails) {
          ufo._trails.forEach((trail, i) => {
            const trailFactor = (i + 1) / (ufo._trails.length + 1);
            
            // Position the trail behind the UFO based on movement direction
            const trailX = motionData.currentPosition.x - dx * trailFactor;
            const trailY = motionData.currentPosition.y - dy * trailFactor;
            
            // Scale the trail to create fade effect
            const scale = 1 - trailFactor * 0.2;
            
            // Set trail position and styles
            trail.style.left = `${trailX}px`;
            trail.style.top = `${trailY}px`;
            trail.style.transform = `translate(-50%, -50%) scale(${scale})`;
            
            // Set opacity based on speed
            const opacity = Math.min(motionData.speed / 1000, 0.5) * (1 - trailFactor);
            trail.style.opacity = opacity;
            
            // Add blur effect
            const blurAmount = Math.min(motionData.speed / 200, 5) * trailFactor;
            trail.style.filter = `blur(${blurAmount}px) brightness(${1 + trailFactor})`;
          });
        }
      } else {
        // Hide trails when moving slowly
        if (ufo._trails) {
          ufo._trails.forEach(trail => {
            trail.style.opacity = 0;
          });
        }
      }
      
      // Update timestamp
      motionData.lastUpdateTime = currentTime;
    });
    
    // Continue animation loop
    animationFrame = requestAnimationFrame(updateMotionEffects);
  }
  
  // Start motion tracking
  updateMotionEffects();
  
  // Add random path variations to UFO animations
  function addPathVariation(ufo) {
    const strength = ufo._motionData.pathVariationStrength;
    
    // Create subtle random movement variation
    setInterval(() => {
      // Get current computed transform
      const style = window.getComputedStyle(ufo);
      const transform = style.getPropertyValue('transform');
      
      // Don't modify transform if it's 'none' or during hover
      if (transform === 'none' || ufo.matches(':hover')) return;
      
      // Add small random translation
      const randomX = (Math.random() - 0.5) * 15 * strength;
      const randomY = (Math.random() - 0.5) * 15 * strength;
      const randomRotate = (Math.random() - 0.5) * 5 * strength;
      
      // Apply variation with transition
      ufo.style.transition = 'transform 3s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
      
      // Apply random variation to current animation position
      ufo.style.animationPlayState = 'paused';
      ufo.style.transform = `${transform} translate(${randomX}px, ${randomY}px) rotate(${randomRotate}deg)`;
      
      // Reset after variation completes
      setTimeout(() => {
        ufo.style.transition = '';
        ufo.style.transform = '';
        ufo.style.animationPlayState = 'running';
      }, 3000);
    }, 8000 + Math.random() * 5000); // Random interval between variations
  }
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    
    // Remove all trail elements
    ufos.forEach(ufo => {
      if (ufo._trails) {
        ufo._trails.forEach(trail => {
          if (trail.parentNode) {
            trail.parentNode.removeChild(trail);
          }
        });
      }
    });
  });
});