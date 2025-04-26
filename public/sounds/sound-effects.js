// Sound effect functions for the "What You Get" section
// These functions create and play simple audio tones with different frequencies
// to represent each benefit

function createOscillator(context, frequency, type = 'sine') {
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  return oscillator;
}

// Switch toggle sound effect - swoosh sound when toggled on/off
export function playSwitchToggleSound(isOn = true) {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = context.createGain();
    gainNode.connect(context.destination);
    
    // Set volume
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    
    // Create different sounds for on/off states
    if (isOn) {
      // Toggle ON - higher pitch swoosh (rising)
      const oscillator = createOscillator(context, 400, 'sine');
      oscillator.connect(gainNode);
      oscillator.frequency.linearRampToValueAtTime(2000, context.currentTime + 0.15);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.2);
    } else {
      // Toggle OFF - lower pitch swoosh (falling)
      const oscillator = createOscillator(context, 1500, 'sine');
      oscillator.connect(gainNode);
      oscillator.frequency.linearRampToValueAtTime(300, context.currentTime + 0.15);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.2);
    }
  } catch (error) {
    console.error("Error playing switch toggle sound:", error);
  }
}

// 1. Income Sound - Cash register/success sound (higher pitched with quick ramp)
export function playIncomeSound() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = context.createGain();
  gainNode.connect(context.destination);
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.7, context.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.8);

  // Create high pitched "success" tone
  const oscillator1 = createOscillator(context, 1200, 'sine');
  oscillator1.connect(gainNode);
  oscillator1.start(context.currentTime);
  oscillator1.stop(context.currentTime + 0.2);

  // Add secondary "cash" sound
  setTimeout(() => {
    const oscillator2 = createOscillator(context, 800, 'triangle');
    oscillator2.connect(gainNode);
    oscillator2.start(context.currentTime);
    oscillator2.stop(context.currentTime + 0.15);
  }, 150);

  // Add final tone
  setTimeout(() => {
    const oscillator3 = createOscillator(context, 1500, 'sine');
    oscillator3.connect(gainNode);
    oscillator3.start(context.currentTime);
    oscillator3.stop(context.currentTime + 0.1);
  }, 300);
}

// 2. Ownership Sound - Power-up sound (rising pitch)
export function playOwnershipSound() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = context.createGain();
  gainNode.connect(context.destination);
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.7);

  const oscillator = createOscillator(context, 300, 'sine');
  oscillator.connect(gainNode);
  oscillator.frequency.linearRampToValueAtTime(900, context.currentTime + 0.4);
  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.5);
}

// 3. Freedom Sound - Light chime/bell (airy and pleasant)
export function playFreedomSound() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = context.createGain();
  gainNode.connect(context.destination);
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.5);

  // Create a chime-like sound 
  const oscillator = createOscillator(context, 1000, 'sine');
  oscillator.connect(gainNode);
  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 1);
  
  // Add harmonic
  setTimeout(() => {
    const oscillator2 = createOscillator(context, 1500, 'sine');
    oscillator2.connect(gainNode);
    oscillator2.start(context.currentTime);
    oscillator2.stop(context.currentTime + 0.7);
  }, 100);
}

// 4. Support Sound - Supportive affirming sound (solid and reassuring)
export function playSupportSound() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = context.createGain();
  gainNode.connect(context.destination);
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1);

  // Create a solid "support" tone
  const oscillator1 = createOscillator(context, 350, 'triangle');
  oscillator1.connect(gainNode);
  oscillator1.start(context.currentTime);
  oscillator1.stop(context.currentTime + 0.5);
  
  // Add second tone for harmony
  setTimeout(() => {
    const oscillator2 = createOscillator(context, 500, 'sine');
    oscillator2.connect(gainNode);
    oscillator2.start(context.currentTime);
    oscillator2.stop(context.currentTime + 0.3);
  }, 200);
}