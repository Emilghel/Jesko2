import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isSpeaking: boolean;
}

export function AudioWaveform({ isSpeaking }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !isSpeaking) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    let animationFrameId: number;
    const barCount = 60;
    const barWidth = canvas.width / barCount - 1;
    const maxHeight = canvas.height * 0.8;
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#06b6d4';
    
    const drawBars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < barCount; i++) {
        const height = isSpeaking 
          ? Math.random() * maxHeight + maxHeight * 0.2 
          : maxHeight * 0.1;
        
        const x = i * (barWidth + 1);
        const y = canvas.height - height;
        
        ctx.fillStyle = primaryColor;
        ctx.fillRect(x, y, barWidth, height);
      }
      
      if (isSpeaking) {
        animationFrameId = requestAnimationFrame(drawBars);
      }
    };
    
    drawBars();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpeaking]);
  
  return (
    <div className="w-full h-full">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}