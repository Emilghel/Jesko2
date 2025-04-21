import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

// Define AudioContext globally for TypeScript
declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, onCheckedChange, ...props }, ref) => {
  
  // Create switch on sound (rising pitch)
  const playSwitchOnSound = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Configure for "on" sound (rising pitch)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, context.currentTime);
      oscillator.frequency.linearRampToValueAtTime(2000, context.currentTime + 0.15);
      
      // Configure volume
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, context.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.2);
    } catch (error) {
      console.error("Error creating audio:", error);
    }
  };

  // Create switch off sound (falling pitch)
  const playSwitchOffSound = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Configure for "off" sound (falling pitch)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1500, context.currentTime);
      oscillator.frequency.linearRampToValueAtTime(300, context.currentTime + 0.15);
      
      // Configure volume
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, context.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.2);
    } catch (error) {
      console.error("Error creating audio:", error);
    }
  };

  // Handle checked state change with sound effect
  const handleCheckedChange = (checked: boolean) => {
    try {
      // Play the appropriate sound
      if (checked) {
        playSwitchOnSound();
      } else {
        playSwitchOffSound();
      }
    } catch (error) {
      console.error("Error playing switch sound:", error);
    }
    
    // Call the original onCheckedChange handler
    if (onCheckedChange) {
      onCheckedChange(checked);
    }
  };

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-emerald-600 data-[state=checked]:shadow-[0_0_8px_rgba(16,185,129,0.7)] data-[state=unchecked]:bg-input",
        className
      )}
      onCheckedChange={handleCheckedChange}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-white"
        )}
      />
    </SwitchPrimitives.Root>
  );
});

Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
