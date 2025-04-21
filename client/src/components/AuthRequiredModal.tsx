import { FC, useEffect } from 'react';
import { X } from 'lucide-react';
import { Link } from 'wouter';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onCreateAccount prop is no longer needed as we handle the redirect internally
  onCreateAccount?: () => void; // Making this optional for backward compatibility
}

const AuthRequiredModal: FC<AuthRequiredModalProps> = ({ 
  isOpen, 
  onClose,
  // We're not using onCreateAccount anymore, but keeping it in the props for compatibility
}) => {
  // Particle animation
  useEffect(() => {
    if (!isOpen) return;
    
    const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Resize canvas to match parent
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Particle settings
    const particles: {
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
      color: string;
    }[] = [];
    
    // Create particles
    const createParticles = () => {
      for (let i = 0; i < 50; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 0.5,
          speed: Math.random() * 0.5 + 0.1,
          opacity: Math.random() * 0.5 + 0.1,
          color: `rgba(120, 255, 255, ${Math.random() * 0.5 + 0.2})`
        });
      }
    };
    
    createParticles();
    
    // Animation loop
    const animate = () => {
      if (!isOpen) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        // Move particle upwards
        particle.y -= particle.speed;
        
        // Reset particle if it goes off-screen
        if (particle.y < -particle.size) {
          particle.y = canvas.height + particle.size;
          particle.x = Math.random() * canvas.width;
        }
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
      });
      
      if (isOpen) {
        requestAnimationFrame(animate);
      }
    };
    
    const animationId = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md bg-black/80 border border-slate-700 backdrop-blur-md text-white">
        <canvas 
          id="particle-canvas" 
          className="absolute inset-0 w-full h-full z-0 opacity-50"
        />
        <div className="relative z-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-indigo-500 bg-clip-text text-transparent">
              Create Your Free Trial Account
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              To save your AI agent, you'll need to create a free trial account. It's fast and gives you full access to your dashboard.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-cyan-500/30 transition-all duration-200"
              onClick={() => {
                // Store agent settings in localStorage before redirecting (preserving existing functionality)
                localStorage.setItem('pending_agent_save', 'true');
                
                // Redirect to pricing page instead of auth page
                window.location.href = '/pricing';
              }}
            >
              Create Free Trial Account
            </Button>
          </DialogFooter>
        </div>
        
        <button
          className="absolute top-3 right-3 rounded-full p-1.5 text-slate-400 hover:text-white bg-transparent hover:bg-slate-800 transition-colors"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default AuthRequiredModal;