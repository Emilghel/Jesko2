import React, { useEffect, useRef } from 'react';
import { AgentSettings } from './AgentSettings';
import './agent-settings-effects.css';

export function EnhancedAgentSettings() {
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const hoverSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize sound effects with absolute URLs to ensure they're found
    const baseUrl = window.location.origin;
    clickSoundRef.current = new Audio(`${baseUrl}/sounds/click.mp3`);
    clickSoundRef.current.volume = 0.2;
    clickSoundRef.current.preload = 'auto';
    
    hoverSoundRef.current = new Audio(`${baseUrl}/sounds/hover.mp3`);
    hoverSoundRef.current.volume = 0.1;
    hoverSoundRef.current.preload = 'auto';
    
    // Set up event listeners for sound effects
    const addSoundEffects = () => {
      // Get all tab triggers and buttons
      const interactiveElements = document.querySelectorAll('.AgentSettings .TabsTrigger, .AgentSettings button');
      
      // Add hover sound effect
      interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
          if (hoverSoundRef.current) {
            hoverSoundRef.current.currentTime = 0;
            hoverSoundRef.current.play().catch(err => console.error("Error playing hover sound:", err));
          }
        });
        
        // Add click sound effect to buttons and tabs
        element.addEventListener('click', () => {
          if (clickSoundRef.current) {
            clickSoundRef.current.currentTime = 0;
            clickSoundRef.current.play().catch(err => console.error("Error playing click sound:", err));
          }
        });
      });
    };
    
    // Add glow effects to various elements
    const addGlowEffects = () => {
      // Select all the card elements
      const cards = document.querySelectorAll('.AgentSettings .Card');
      
      // Add glow container and effect to each card
      cards.forEach(card => {
        card.classList.add('glow-container');
        const glowEffect = document.createElement('div');
        glowEffect.classList.add('glow-effect');
        card.appendChild(glowEffect);
      });
      
      // Add glow to important buttons
      const importantButtons = document.querySelectorAll('.AgentSettings button[type="submit"]');
      importantButtons.forEach(button => {
        button.classList.add('pulse-animation');
      });
    };
    
    // Call the functions with a short delay to ensure DOM is fully loaded
    setTimeout(() => {
      addSoundEffects();
      addGlowEffects();
    }, 1000);
    
    // Cleanup event listeners on component unmount
    return () => {
      // Clean up will be handled by component unmount
    };
  }, []);
  
  return (
    <div className="AgentSettings">
      <style dangerouslySetInnerHTML={{ __html: `
          .AgentSettings {
            position: relative;
          }
          
          /* Add any global styles needed here */
          .AgentSettings::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: -1;
            opacity: 0.1;
            background: radial-gradient(circle at top right, rgba(0, 210, 255, 0.3), transparent 70%);
          }
        `}} />
      <AgentSettings />
    </div>
  );
}