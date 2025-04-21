/**
 * Feature Box Particle Effects
 * 
 * This script adds dynamic floating particles inside feature boxes
 * for a modern, interactive appearance.
 */

document.addEventListener('DOMContentLoaded', function() {
  // Find all feature boxes
  const featureBoxes = document.querySelectorAll('.feature-box');
  
  // For each box, create and add particles
  featureBoxes.forEach(box => {
    // Add between 3-5 particles to each box
    const particleCount = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < particleCount; i++) {
      createParticle(box);
    }
    
    // Add hover event to intensify the glow effect
    box.addEventListener('mouseenter', () => {
      // Make existing particles more visible on hover
      box.querySelectorAll('.particle').forEach(particle => {
        particle.style.opacity = '0.8';
        particle.style.filter = 'blur(6px)';
      });
    });
    
    box.addEventListener('mouseleave', () => {
      // Reset particles on mouse leave
      box.querySelectorAll('.particle').forEach(particle => {
        particle.style.opacity = '';
        particle.style.filter = '';
      });
    });
  });
  
  // Function to create a single particle
  function createParticle(parentElement) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random size between 10px and 30px
    const size = Math.floor(Math.random() * 20) + 10;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Random position within the parent element
    const xPos = Math.random() * 100;  // percentage
    const yPos = Math.random() * 100;  // percentage
    particle.style.left = `${xPos}%`;
    particle.style.top = `${yPos}%`;
    
    // Add some randomness to the animation
    const delay = Math.random() * 5;  // seconds
    particle.style.animationDelay = `${delay}s`;
    
    // Add a bit of randomness to the animation duration
    const duration = 6 + Math.random() * 4;  // 6-10 seconds
    particle.style.animationDuration = `${duration}s`;
    
    // Append the particle to the parent
    parentElement.appendChild(particle);
    
    return particle;
  }
});