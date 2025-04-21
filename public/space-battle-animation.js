/**
 * Space Battle Animation
 * 
 * This script creates an immersive space battle background animation
 * with opposing spaceships, laser beams, explosions, and particle effects.
 */

// Use a function to initialize the animation that can be called multiple times
function initSpaceBattle() {
  console.log('Initializing space battle animation');
  
  // Target the specific background div to apply the space battle to
  const targetBackground = document.getElementById('space-battle-container');
  
  if (!targetBackground) {
    console.error('Space battle animation: Target background element not found');
    console.log('Will retry in 500ms...');
    // Retry after a delay
    setTimeout(initSpaceBattle, 500);
    return;
  }
  
  console.log('Found space-battle-container, setting up animation');
  
  // Create canvas element for the animation
  const canvas = document.createElement('canvas');
  canvas.className = 'absolute inset-0 w-full h-full';
  canvas.style.zIndex = '1';
  canvas.style.pointerEvents = 'none'; // Make sure users can still interact with elements behind it
  
  // Set canvas to fill the parent element
  canvas.width = targetBackground.offsetWidth;
  canvas.height = targetBackground.offsetHeight;
  
  // Insert canvas before the first child of the target background
  targetBackground.insertBefore(canvas, targetBackground.firstChild);
  
  const ctx = canvas.getContext('2d');
  
  // Handle window resizing
  window.addEventListener('resize', function() {
    canvas.width = targetBackground.offsetWidth;
    canvas.height = targetBackground.offsetHeight;
  });
  
  // Animation variables
  let frameCount = 0;
  const stars = [];
  const ships = [];
  const lasers = [];
  const explosions = [];
  const debris = [];
  
  // Star particles for background
  class Star {
    constructor() {
      this.reset();
    }
    
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 1.5;
      this.opacity = Math.random() * 0.8 + 0.2;
      this.speed = Math.random() * 0.15 + 0.05;
      this.pulseSpeed = Math.random() * 0.02 + 0.01;
      this.pulseOffset = Math.random() * Math.PI * 2;
    }
    
    update() {
      // Slow parallax movement
      this.y += this.speed;
      
      // Pulsating effect
      this.currentOpacity = this.opacity * (0.7 + 0.3 * Math.sin(frameCount * this.pulseSpeed + this.pulseOffset));
      
      // Reset if out of canvas
      if (this.y > canvas.height) {
        this.y = 0;
        this.x = Math.random() * canvas.width;
      }
    }
    
    draw() {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${this.currentOpacity})`;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Ship classes
  class Ship {
    constructor(type, x, y) {
      this.type = type; // 'rebel' or 'imperial'
      this.x = x;
      this.y = y;
      this.width = type === 'rebel' ? 40 : 30;
      this.height = type === 'rebel' ? 30 : 30;
      this.speed = type === 'rebel' ? 0.5 + Math.random() * 0.5 : 0.3 + Math.random() * 0.3;
      this.health = 3;
      this.fireRate = type === 'rebel' ? 80 + Math.random() * 60 : 100 + Math.random() * 70;
      this.lastFire = Math.random() * this.fireRate;
      this.targetX = Math.random() * canvas.width;
      this.targetY = Math.random() * (canvas.height / 2) + (type === 'rebel' ? canvas.height / 2 : 0);
      this.movementCounter = 0;
      this.movementUpdateRate = 240 + Math.random() * 120;
      this.thrusterParticles = [];
      this.scale = 0.8 + Math.random() * 0.4;
      this.rotation = type === 'rebel' ? 0 : Math.PI;
      this.state = 'flying'; // 'flying', 'damaged', 'destroyed'
      this.damageTime = 0;
    }
    
    update() {
      if (this.state === 'destroyed') return false;
      
      // Movement logic
      this.movementCounter++;
      if (this.movementCounter >= this.movementUpdateRate) {
        this.targetX = Math.random() * canvas.width;
        this.targetY = Math.random() * (canvas.height / 2) + (this.type === 'rebel' ? canvas.height / 2 : 0);
        this.movementCounter = 0;
      }
      
      // Move towards target with easing
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      
      this.x += dx * 0.01;
      this.y += dy * 0.01;
      
      // Update rotation to face movement direction
      const targetRotation = Math.atan2(dy, dx) + (this.type === 'imperial' ? Math.PI : 0);
      
      // Smoothly rotate towards target direction
      let rotDiff = targetRotation - this.rotation;
      
      // Handle angle wrapping
      if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      
      this.rotation += rotDiff * 0.02;
      
      // Add thruster particles
      if (frameCount % 3 === 0) {
        this.addThrusterParticle();
      }
      
      // Update thruster particles
      for (let i = this.thrusterParticles.length - 1; i >= 0; i--) {
        const particle = this.thrusterParticles[i];
        particle.life -= 0.02;
        
        if (particle.life <= 0) {
          this.thrusterParticles.splice(i, 1);
          continue;
        }
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.size *= 0.95;
      }
      
      // Weapon firing logic
      this.lastFire++;
      if (this.lastFire >= this.fireRate) {
        this.fire();
        this.lastFire = 0;
      }
      
      // Check if damaged
      if (this.state === 'damaged') {
        this.damageTime++;
        if (this.damageTime > 20) {
          this.state = 'flying';
          this.damageTime = 0;
        }
      }
      
      return true;
    }
    
    addThrusterParticle() {
      // Calculate thruster position based on ship position and rotation
      const thrusterDist = this.type === 'rebel' ? -this.width/2 * this.scale : this.width/2 * this.scale;
      const thrusterX = this.x + Math.cos(this.rotation) * thrusterDist;
      const thrusterY = this.y + Math.sin(this.rotation) * thrusterDist;
      
      const angle = this.rotation + Math.PI + (Math.random() * 0.5 - 0.25);
      
      this.thrusterParticles.push({
        x: thrusterX,
        y: thrusterY,
        vx: Math.cos(angle) * (0.5 + Math.random() * 1),
        vy: Math.sin(angle) * (0.5 + Math.random() * 1),
        size: 2 + Math.random() * 2,
        life: 1.0,
        color: this.type === 'rebel' ? 'rgba(0, 150, 255, ' : 'rgba(255, 0, 0, '
      });
    }
    
    fire() {
      const laserSpeed = this.type === 'rebel' ? -6 : 6; // Increased speed
      const laserColor = this.type === 'rebel' ? '#00AAFF' : '#FF0000';
      
      // Calculate laser starting position based on ship position and rotation
      const laserDist = this.type === 'rebel' ? this.width/2 * this.scale : -this.width/2 * this.scale;
      const laserX = this.x + Math.cos(this.rotation) * laserDist;
      const laserY = this.y + Math.sin(this.rotation) * laserDist;
      
      lasers.push({
        x: laserX,
        y: laserY,
        vx: Math.cos(this.rotation) * laserSpeed * -1,
        vy: Math.sin(this.rotation) * laserSpeed * -1,
        width: 16, // Increased size
        height: 4, // Increased size
        color: laserColor,
        type: this.type,
        rotation: this.rotation,
        life: 1.0
      });
    }
    
    hit() {
      this.health--;
      this.state = 'damaged';
      this.damageTime = 0;
      
      if (this.health <= 0) {
        this.explode();
        return false;
      }
      
      return true;
    }
    
    explode() {
      // Create explosion
      explosions.push({
        x: this.x,
        y: this.y,
        size: this.width * this.scale * 2.5, // Larger explosion
        life: 1.0,
        type: this.type
      });
      
      // Create debris
      for (let i = 0; i < 25; i++) { // More debris particles
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2;
        
        debris.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1 + Math.random() * 3,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: Math.random() * 0.1 - 0.05,
          life: 1.0,
          type: this.type
        });
      }
      
      this.state = 'destroyed';
      return false;
    }
    
    draw() {
      if (this.state === 'destroyed') return;
      
      ctx.save();
      
      // Move to ship position and apply rotation
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(this.scale, this.scale);
      
      // Apply damage flasher
      if (this.state === 'damaged') {
        if (Math.floor(this.damageTime / 3) % 2 === 0) {
          ctx.globalAlpha = 0.7;
        }
      }
      
      // Draw ship based on type
      if (this.type === 'rebel') {
        // X-Wing style ship
        ctx.fillStyle = '#CCCCCC';
        
        // Main body
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-20, -10);
        ctx.lineTo(-15, 0);
        ctx.lineTo(-20, 10);
        ctx.closePath();
        ctx.fill();
        
        // Wings
        ctx.fillStyle = '#AAAAAA';
        
        // Top wings
        ctx.beginPath();
        ctx.moveTo(10, -5);
        ctx.lineTo(-15, -15);
        ctx.lineTo(-20, -15);
        ctx.lineTo(0, -5);
        ctx.closePath();
        ctx.fill();
        
        // Bottom wings
        ctx.beginPath();
        ctx.moveTo(10, 5);
        ctx.lineTo(-15, 15);
        ctx.lineTo(-20, 15);
        ctx.lineTo(0, 5);
        ctx.closePath();
        ctx.fill();
        
        // Cockpit
        ctx.fillStyle = '#3399CC';
        ctx.beginPath();
        ctx.ellipse(5, 0, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Engine glow
        ctx.fillStyle = 'rgba(0, 150, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(-18, -12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-18, 12, 3, 0, Math.PI * 2);
        ctx.fill();
        
      } else {
        // TIE Fighter style ship
        ctx.fillStyle = '#333333';
        
        // Main body (center pod)
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Cockpit window
        ctx.fillStyle = '#CC0000';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Wings (hexagonal panels)
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        
        // Left wing
        ctx.beginPath();
        ctx.moveTo(-8, -15);
        ctx.lineTo(-23, -8);
        ctx.lineTo(-23, 8);
        ctx.lineTo(-8, 15);
        ctx.lineTo(-8, -15);
        ctx.stroke();
        
        // Right wing
        ctx.beginPath();
        ctx.moveTo(8, -15);
        ctx.lineTo(23, -8);
        ctx.lineTo(23, 8);
        ctx.lineTo(8, 15);
        ctx.lineTo(8, -15);
        ctx.stroke();
        
        // Engine glow
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
      
      // Draw thruster particles
      for (const particle of this.thrusterParticles) {
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size
        );
        gradient.addColorStop(0, particle.color + particle.life.toFixed(1) + ')');
        gradient.addColorStop(1, particle.color + '0)');
        
        ctx.fillStyle = gradient;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Initialize stars (more than typical star field for a denser look)
  for (let i = 0; i < 200; i++) {
    stars.push(new Star());
  }
  
  // Periodically spawn ships
  function spawnShips() {
    if (ships.length < 18) { // Increased maximum number of ships
      if (Math.random() < 0.5) {
        // Spawn rebel ship
        ships.push(new Ship('rebel', 
          Math.random() * canvas.width,
          canvas.height - 50 - Math.random() * 150
        ));
      } else {
        // Spawn imperial ship
        ships.push(new Ship('imperial',
          Math.random() * canvas.width,
          50 + Math.random() * 150
        ));
      }
    }
  }
  
  // Check for laser collisions with ships
  function checkCollisions() {
    for (let i = lasers.length - 1; i >= 0; i--) {
      const laser = lasers[i];
      
      for (let j = ships.length - 1; j >= 0; j--) {
        const ship = ships[j];
        
        // Skip if ship is already destroyed or if laser and ship are the same type
        if (ship.state === 'destroyed' || laser.type === ship.type) continue;
        
        // Simple distance-based collision detection
        const dx = ship.x - laser.x;
        const dy = ship.y - laser.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < ship.width * ship.scale / 2) {
          // Create impact effect
          explosions.push({
            x: laser.x,
            y: laser.y,
            size: 10,
            life: 0.5,
            type: 'impact'
          });
          
          // Remove laser
          lasers.splice(i, 1);
          
          // Damage ship
          ship.hit();
          
          // We've already removed this laser, so break to avoid checking it again
          break;
        }
      }
    }
  }
  
  // Animation loop
  function animate() {
    // Clear canvas with translucent black to create trailing effect
    ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw stars
    for (const star of stars) {
      star.update();
      star.draw();
    }
    
    // Periodically spawn ships
    if (frameCount % 60 === 0) {
      spawnShips();
    }
    
    // Update and draw ships
    for (let i = ships.length - 1; i >= 0; i--) {
      if (!ships[i].update()) {
        ships.splice(i, 1);
        continue;
      }
      ships[i].draw();
    }
    
    // Update and draw lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
      const laser = lasers[i];
      
      laser.x += laser.vx;
      laser.y += laser.vy;
      laser.life -= 0.005;
      
      // Remove lasers that are off-screen or expired
      if (laser.x < -50 || laser.x > canvas.width + 50 || 
          laser.y < -50 || laser.y > canvas.height + 50 ||
          laser.life <= 0) {
        lasers.splice(i, 1);
        continue;
      }
      
      // Draw laser
      ctx.save();
      ctx.translate(laser.x, laser.y);
      ctx.rotate(laser.rotation + Math.PI/2);
      
      // Laser beam with glow effect
      const glowSize = 10 + Math.sin(frameCount * 0.2) * 3;
      
      // Outer glow
      ctx.shadowBlur = glowSize;
      ctx.shadowColor = laser.color;
      
      // Add a second stronger glow layer
      ctx.globalAlpha = 0.7;
      
      // Main beam
      ctx.fillStyle = laser.color;
      ctx.fillRect(-laser.height/2, -laser.width/2, laser.height, laser.width);
      
      ctx.restore();
    }
    
    // Check for collisions
    checkCollisions();
    
    // Update and draw explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      const explosion = explosions[i];
      
      explosion.life -= explosion.type === 'impact' ? 0.05 : 0.01;
      
      if (explosion.life <= 0) {
        explosions.splice(i, 1);
        continue;
      }
      
      // Draw explosion based on type
      if (explosion.type === 'impact') {
        const size = explosion.size * (1 - explosion.life);
        
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          explosion.x, explosion.y, 0, 
          explosion.x, explosion.y, size
        );
        
        const color = explosion.type === 'rebel' ? 'rgba(0, 150, 255,' : 
                      explosion.type === 'imperial' ? 'rgba(255, 0, 0,' : 
                      'rgba(255, 255, 100,';
        
        gradient.addColorStop(0, color + '0.8)');
        gradient.addColorStop(0.5, color + '0.4)');
        gradient.addColorStop(1, color + '0)');
        
        ctx.fillStyle = gradient;
        ctx.arc(explosion.x, explosion.y, size, 0, Math.PI * 2);
        ctx.fill();
        
      } else {
        // Ship destruction explosion
        const size = explosion.size * (1 - explosion.life * 0.5);
        const innerSize = size * 0.6;
        
        // Outer explosion
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          explosion.x, explosion.y, 0, 
          explosion.x, explosion.y, size
        );
        
        const color = explosion.type === 'rebel' ? 'rgba(0, 150, 255,' : 'rgba(255, 0, 0,';
        
        gradient.addColorStop(0, 'rgba(255, 255, 200, ' + explosion.life.toFixed(1) + ')');
        gradient.addColorStop(0.3, 'rgba(255, 120, 0, ' + (explosion.life * 0.8).toFixed(1) + ')');
        gradient.addColorStop(0.7, color + (explosion.life * 0.6).toFixed(1) + ')');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.arc(explosion.x, explosion.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core
        ctx.beginPath();
        const innerGradient = ctx.createRadialGradient(
          explosion.x, explosion.y, 0, 
          explosion.x, explosion.y, innerSize
        );
        
        innerGradient.addColorStop(0, 'rgba(255, 255, 255, ' + explosion.life.toFixed(1) + ')');
        innerGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
        
        ctx.fillStyle = innerGradient;
        ctx.arc(explosion.x, explosion.y, innerSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add lens flare
        if (explosion.life > 0.7) {
          ctx.fillStyle = 'rgba(255, 255, 255, ' + ((explosion.life - 0.7) * 3).toFixed(1) + ')';
          
          // Horizontal flare
          ctx.beginPath();
          ctx.ellipse(explosion.x, explosion.y, size * 1.5, size * 0.1, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Vertical flare
          ctx.beginPath();
          ctx.ellipse(explosion.x, explosion.y, size * 0.1, size * 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    // Update and draw debris
    for (let i = debris.length - 1; i >= 0; i--) {
      const piece = debris[i];
      
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.rotation += piece.rotSpeed;
      piece.life -= 0.005;
      
      if (piece.life <= 0 || 
          piece.x < -50 || piece.x > canvas.width + 50 || 
          piece.y < -50 || piece.y > canvas.height + 50) {
        debris.splice(i, 1);
        continue;
      }
      
      // Draw debris
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      
      ctx.fillStyle = piece.type === 'rebel' ? 
                      `rgba(100, 150, 200, ${piece.life.toFixed(1)})` : 
                      `rgba(100, 100, 100, ${piece.life.toFixed(1)})`;
      
      ctx.fillRect(-piece.size/2, -piece.size/2, piece.size, piece.size);
      
      ctx.restore();
    }
    
    frameCount++;
    requestAnimationFrame(animate);
  }
  
  // Start animation
  animate();
}

// Start the initialization process when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, starting space battle initialization');
  // Start the initialization process
  initSpaceBattle();
});

// Additionally, try to initialize when the window loads
// This helps when the script is loaded after the DOM content event
window.addEventListener('load', function() {
  console.log('Window loaded, starting space battle initialization');
  initSpaceBattle();
});