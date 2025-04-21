// Sound utility functions

// Sound generator using Web Audio API
const AudioGenerator = (() => {
  // Create Audio Context on demand to avoid autoplay restrictions
  let audioContext: AudioContext | null = null;
  
  // Sound patterns for each personality type
  const soundPatterns = {
    business: [
      { frequency: 880, duration: 0.1, gain: 0.2, when: 0 },     // Higher pitch, professional
      { frequency: 1320, duration: 0.05, gain: 0.15, when: 0.12 }
    ],
    creative: [
      { frequency: 523.25, duration: 0.08, gain: 0.2, when: 0 },  // Playful tone
      { frequency: 659.25, duration: 0.08, gain: 0.2, when: 0.09 },
      { frequency: 783.99, duration: 0.08, gain: 0.2, when: 0.18 }
    ],
    assistant: [
      { frequency: 440, duration: 0.1, gain: 0.2, when: 0 },     // Friendly, warm tone
      { frequency: 554.37, duration: 0.1, gain: 0.15, when: 0.1 }
    ],
    custom: [
      { frequency: 659.25, duration: 0.06, gain: 0.2, when: 0 },  // Distinctive, unique sound
      { frequency: 830.61, duration: 0.06, gain: 0.2, when: 0.07 },
      { frequency: 987.77, duration: 0.06, gain: 0.2, when: 0.14 },
      { frequency: 1318.51, duration: 0.06, gain: 0.15, when: 0.21 }
    ],
    // Voice-specific sounds
    female: [
      { frequency: 587.33, duration: 0.07, gain: 0.2, when: 0 },  // Female voice sound (higher pitched)
      { frequency: 880, duration: 0.05, gain: 0.15, when: 0.08 },
      { frequency: 698.46, duration: 0.05, gain: 0.1, when: 0.14 }
    ],
    male: [
      { frequency: 349.23, duration: 0.08, gain: 0.2, when: 0 },  // Male voice sound (lower pitched)
      { frequency: 440, duration: 0.05, gain: 0.15, when: 0.09 },
      { frequency: 523.25, duration: 0.05, gain: 0.1, when: 0.15 }
    ],
    // Unique voice sounds
    aria: [
      { frequency: 740, duration: 0.06, gain: 0.2, when: 0 },  
      { frequency: 880, duration: 0.05, gain: 0.15, when: 0.07 }
    ],
    roger: [
      { frequency: 392, duration: 0.07, gain: 0.2, when: 0 },  
      { frequency: 493.88, duration: 0.05, gain: 0.15, when: 0.08 }
    ],
    sarah: [
      { frequency: 659.25, duration: 0.06, gain: 0.2, when: 0 },  
      { frequency: 783.99, duration: 0.04, gain: 0.15, when: 0.07 },
      { frequency: 659.25, duration: 0.04, gain: 0.15, when: 0.12 }
    ],
    laura: [
      { frequency: 622.25, duration: 0.05, gain: 0.2, when: 0 },  
      { frequency: 740, duration: 0.05, gain: 0.15, when: 0.06 },
      { frequency: 830.61, duration: 0.04, gain: 0.15, when: 0.12 }
    ],
    charlie: [
      { frequency: 369.99, duration: 0.06, gain: 0.2, when: 0 },  
      { frequency: 493.88, duration: 0.05, gain: 0.15, when: 0.07 },
      { frequency: 587.33, duration: 0.04, gain: 0.15, when: 0.13 }
    ],
    default: [
      { frequency: 587.33, duration: 0.1, gain: 0.2, when: 0 },   // Standard notification
      { frequency: 783.99, duration: 0.05, gain: 0.15, when: 0.12 }
    ]
  };
  
  // Initialize audio context
  const getAudioContext = (): AudioContext => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
  };
  
  // Generate a tone
  const generateTone = (
    frequency: number,
    duration: number,
    gain: number = 0.2,
    when: number = 0
  ): void => {
    try {
      const context = getAudioContext();
      
      // Create oscillator
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      
      // Create gain node for volume control
      const gainNode = context.createGain();
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(gain, context.currentTime + 0.01 + when);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + duration + when);
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Start and stop the oscillator
      oscillator.start(context.currentTime + when);
      oscillator.stop(context.currentTime + duration + when + 0.05);
    } catch (error) {
      console.error('Error generating tone:', error);
    }
  };
  
  return {
    // Play a sound pattern by type
    playSound: (type: string): void => {
      // Determine which pattern to use
      const pattern = soundPatterns[type as keyof typeof soundPatterns] || soundPatterns.default;
      
      // Resume audio context if needed (for autoplay policy)
      const context = getAudioContext();
      if (context.state === 'suspended') {
        context.resume();
      }
      
      // Play each tone in the pattern
      pattern.forEach(tone => {
        generateTone(tone.frequency, tone.duration, tone.gain, tone.when);
      });
    }
  };
})();

// Play a sound by personality type
export function playPersonalitySound(personalityId: string): void {
  console.log('Playing sound for personality:', personalityId);
  
  // Determine which sound to play based on personality ID
  let soundType = 'default';
  
  if (personalityId.includes('business') || personalityId.includes('sales') || personalityId.includes('marketing')) {
    soundType = 'business';
  } else if (personalityId.includes('creative') || personalityId.includes('writer')) {
    soundType = 'creative';
  } else if (personalityId.includes('assistant') || personalityId.includes('service') || personalityId.includes('guide') || personalityId.includes('coach')) {
    soundType = 'assistant';
  } else if (personalityId.includes('custom')) {
    soundType = 'custom';
  }
  
  // Play the appropriate sound
  AudioGenerator.playSound(soundType);
}

// Play a sound for a specific voice
export function playVoiceSound(voiceName: string): void {
  console.log('Playing sound for voice:', voiceName);
  
  // Convert voice name to lowercase for case-insensitive matching
  const voiceNameLower = voiceName.toLowerCase();
  
  // Determine which sound to play based on voice name
  let soundType = 'default';
  
  // Check for specific voice names
  const specificVoices = ['aria', 'roger', 'sarah', 'laura', 'charlie'];
  for (const voice of specificVoices) {
    if (voiceNameLower.includes(voice)) {
      soundType = voice;
      break;
    }
  }
  
  // If no specific voice match, use gender-based sounds
  if (soundType === 'default') {
    // Common female names
    const femaleNames = ['alice', 'charlotte', 'matilda', 'jessica', 'lily', 'rachel', 'olivia', 'emma'];
    // Common male names
    const maleNames = ['george', 'callum', 'will', 'liam', 'eric', 'chris', 'brian', 'daniel', 'bill', 'james', 'thomas'];
    
    for (const name of femaleNames) {
      if (voiceNameLower.includes(name)) {
        soundType = 'female';
        break;
      }
    }
    
    for (const name of maleNames) {
      if (voiceNameLower.includes(name)) {
        soundType = 'male';
        break;
      }
    }
  }
  
  // Play the appropriate sound
  AudioGenerator.playSound(soundType);
}