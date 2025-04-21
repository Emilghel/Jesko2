import React, { useRef, useEffect, useState } from 'react';

interface AIFaceProps {
  speaking?: boolean;
  className?: string;
}

const AIFace: React.FC<AIFaceProps> = ({ speaking = false, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animationFrame, setAnimationFrame] = useState<number | null>(null);
  const [eyeGlow, setEyeGlow] = useState<number>(0);
  const [mouthOpen, setMouthOpen] = useState<number>(0);
  const [faceOutline, setFaceOutline] = useState<number>(0);
  const [pulse, setPulse] = useState<number>(0);

  // Colors based on the app's theme
  const primaryColor = '#33C3BD';
  const secondaryColor = '#0075FF';
  const darkBgColor = '#0A0F16';
  const glowColor = '#33C3BD';

  useEffect(() => {
    if (speaking) {
      // Animate mouth when speaking
      const interval = setInterval(() => {
        setMouthOpen(Math.random() * 0.6);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setMouthOpen(0.1); // Default slightly open mouth
    }
  }, [speaking]);

  useEffect(() => {
    // Animate eye glow and face outline
    const animate = () => {
      // Gentle pulsing effect
      setPulse((prev) => (prev + 0.01) % (2 * Math.PI));
      
      // Calculate these inside the animation function instead of setting state
      const currentEyeGlow = 0.6 + Math.sin(pulse * 2) * 0.2;
      const currentFaceOutline = 0.8 + Math.sin(pulse) * 0.1;
      
      // Set these states only once per animation frame
      setEyeGlow(currentEyeGlow);
      setFaceOutline(currentFaceOutline);
      
      const animId = requestAnimationFrame(animate);
      setAnimationFrame(animId);
    };

    const animId = requestAnimationFrame(animate);
    setAnimationFrame(animId);
    
    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []); // Empty dependency array to run only once

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set the canvas to be high-resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw function - Semi-realistic Terminator-inspired AI face
    const drawAIFace = () => {
      // Center coordinates
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const size = Math.min(rect.width, rect.height) * 0.8;

      // Background with slight gradient
      const bgGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, size / 1.5
      );
      bgGradient.addColorStop(0, 'rgba(10, 15, 22, 0.7)');
      bgGradient.addColorStop(1, 'rgba(10, 15, 22, 0.1)');
      
      ctx.fillStyle = bgGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size / 2, 0, 2 * Math.PI);
      ctx.fill();

      // Face outline - slightly bigger than the face
      const outlineGradient = ctx.createLinearGradient(
        centerX - size/2, centerY - size/2,
        centerX + size/2, centerY + size/2
      );
      outlineGradient.addColorStop(0, primaryColor);
      outlineGradient.addColorStop(1, secondaryColor);
      
      ctx.strokeStyle = outlineGradient;
      ctx.lineWidth = 2 * faceOutline;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size / 2.1, 0, 2 * Math.PI);
      ctx.stroke();

      // Face contour highlights
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI;
        ctx.strokeStyle = `rgba(51, 195, 189, ${0.1 + Math.sin(pulse + i) * 0.05})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
          centerX, 
          centerY, 
          size / 2.3 + Math.sin(pulse + i) * 2, 
          angle, 
          angle + Math.PI / 2
        );
        ctx.stroke();
      }

      // Glowing circuit patterns
      const numCircuits = 5;
      for (let i = 0; i < numCircuits; i++) {
        const angle = (i / numCircuits) * Math.PI * 2;
        const x1 = centerX + Math.cos(angle) * (size / 4);
        const y1 = centerY + Math.sin(angle) * (size / 4);
        const x2 = centerX + Math.cos(angle + Math.PI/4) * (size / 3);
        const y2 = centerY + Math.sin(angle + Math.PI/4) * (size / 3);
        
        ctx.strokeStyle = `rgba(51, 195, 189, ${0.2 + Math.sin(pulse + i) * 0.1})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Eyes
      const eyeDistance = size / 5;
      const eyeRadius = size / 12;
      const leftEyeX = centerX - eyeDistance;
      const rightEyeX = centerX + eyeDistance;
      const eyeY = centerY - size / 10;
      
      // Eye sockets
      ctx.fillStyle = darkBgColor;
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, eyeRadius * 1.2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY, eyeRadius * 1.2, 0, 2 * Math.PI);
      ctx.fill();
      
      // Eye glow
      const eyeGlowGradient = ctx.createRadialGradient(
        leftEyeX, eyeY, 0,
        leftEyeX, eyeY, eyeRadius
      );
      eyeGlowGradient.addColorStop(0, `rgba(51, 195, 189, ${eyeGlow})`);
      eyeGlowGradient.addColorStop(0.7, `rgba(0, 117, 255, ${eyeGlow * 0.7})`);
      eyeGlowGradient.addColorStop(1, 'rgba(0, 117, 255, 0)');
      
      ctx.fillStyle = eyeGlowGradient;
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, eyeRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      const eyeGlowGradient2 = ctx.createRadialGradient(
        rightEyeX, eyeY, 0,
        rightEyeX, eyeY, eyeRadius
      );
      eyeGlowGradient2.addColorStop(0, `rgba(51, 195, 189, ${eyeGlow})`);
      eyeGlowGradient2.addColorStop(0.7, `rgba(0, 117, 255, ${eyeGlow * 0.7})`);
      eyeGlowGradient2.addColorStop(1, 'rgba(0, 117, 255, 0)');
      
      ctx.fillStyle = eyeGlowGradient2;
      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY, eyeRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Mouth animation
      const mouthWidth = size / 3;
      const mouthHeight = mouthOpen * size / 5;
      const mouthY = centerY + size / 6;
      
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2;
      
      // Animated mouth
      ctx.beginPath();
      ctx.moveTo(centerX - mouthWidth/2, mouthY);
      ctx.quadraticCurveTo(
        centerX, mouthY + mouthHeight, 
        centerX + mouthWidth/2, mouthY
      );
      ctx.stroke();
      
      // Additional detail lines
      ctx.strokeStyle = `rgba(51, 195, 189, 0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - mouthWidth/2, mouthY + 2);
      ctx.quadraticCurveTo(
        centerX, mouthY + mouthHeight + 2, 
        centerX + mouthWidth/2, mouthY + 2
      );
      ctx.stroke();

      // Face details - adding some facial structure
      ctx.strokeStyle = `rgba(0, 117, 255, 0.15)`;
      ctx.lineWidth = 1;
      
      // Jawline
      ctx.beginPath();
      ctx.moveTo(centerX - size/3, centerY - size/10);
      ctx.quadraticCurveTo(
        centerX, centerY + size/2.5,
        centerX + size/3, centerY - size/10
      );
      ctx.stroke();
      
      // Cheekbones
      ctx.beginPath();
      ctx.moveTo(leftEyeX - eyeRadius, eyeY + eyeRadius);
      ctx.quadraticCurveTo(
        leftEyeX - eyeRadius*1.5, eyeY + eyeRadius*3,
        leftEyeX, eyeY + eyeRadius*3
      );
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(rightEyeX + eyeRadius, eyeY + eyeRadius);
      ctx.quadraticCurveTo(
        rightEyeX + eyeRadius*1.5, eyeY + eyeRadius*3,
        rightEyeX, eyeY + eyeRadius*3
      );
      ctx.stroke();
      
      // Additional facial structure lines
      ctx.strokeStyle = `rgba(51, 195, 189, 0.1)`;
      for (let i = 0; i < 3; i++) {
        const y = centerY + size/10 + i*5;
        ctx.beginPath();
        ctx.moveTo(centerX - size/4 + i*10, y);
        ctx.lineTo(centerX + size/4 - i*10, y);
        ctx.stroke();
      }
    };

    drawAIFace();
  }, [eyeGlow, mouthOpen, faceOutline, pulse, speaking, primaryColor, secondaryColor, darkBgColor, glowColor]);

  return (
    <div className={`ai-face-container ${className}`}>
      <canvas 
        ref={canvasRef} 
        className="ai-face-canvas w-full h-full"
        style={{ 
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};

export default AIFace;