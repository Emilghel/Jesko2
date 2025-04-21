/**
 * Creates and plays notification sounds using the Web Audio API
 */

// Initialize Audio Context with browser compatibility
let audioContext: AudioContext | null = null;

const initAudioContext = (): AudioContext => {
  if (audioContext === null) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
      }
    } catch (e) {
      console.error('Web Audio API is not supported in this browser', e);
    }
  }
  return audioContext as AudioContext;
};

// Helper to create and play a tone
const playTone = (
  frequency: number,
  duration: number,
  type: OscillatorType,
  fadeIn: number = 0.01,
  fadeOut: number = 0.05,
  volume: number = 0.2
) => {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;
    
    // Create oscillator
    const oscillator = ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    
    // Create gain node for volume control and fade in/out
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Start oscillator
    const startTime = ctx.currentTime;
    oscillator.start(startTime);
    
    // Fade in
    gainNode.gain.linearRampToValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + fadeIn);
    
    // Fade out
    gainNode.gain.linearRampToValueAtTime(volume, startTime + duration - fadeOut);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    
    // Stop oscillator
    oscillator.stop(startTime + duration);
    
    // Clean up
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  } catch (e) {
    console.error('Error playing tone:', e);
  }
};

// Success sound (cheerful ascending arpeggio)
export const playSuccessSound = () => {
  const ctx = initAudioContext();
  if (!ctx) return;
  
  const baseFreq = 450;
  const baseTime = ctx.currentTime;
  
  // Play a major triad with slight delays
  playTone(baseFreq, 0.15, 'sine', 0.01, 0.05, 0.15);
  setTimeout(() => playTone(baseFreq * 5/4, 0.15, 'sine', 0.01, 0.05, 0.15), 100);
  setTimeout(() => playTone(baseFreq * 6/4, 0.2, 'sine', 0.01, 0.1, 0.15), 200);
};

// Error sound (descending minor third with a slight vibrato)
export const playErrorSound = () => {
  const ctx = initAudioContext();
  if (!ctx) return;
  
  // Play a descending minor third
  playTone(380, 0.1, 'triangle', 0.01, 0.05, 0.15);
  setTimeout(() => playTone(320, 0.25, 'triangle', 0.01, 0.15, 0.15), 100);
};

// Info sound (gentle ping)
export const playInfoSound = () => {
  const ctx = initAudioContext();
  if (!ctx) return;
  
  // Single pleasant ping
  playTone(600, 0.15, 'sine', 0.01, 0.14, 0.12);
};