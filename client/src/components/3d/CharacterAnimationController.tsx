import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CharacterAnimation } from './CharacterScene';

interface CharacterAnimationControllerProps {
  onAnimationChange: (animation: CharacterAnimation) => void;
  className?: string;
}

const CharacterAnimationController: React.FC<CharacterAnimationControllerProps> = ({
  onAnimationChange,
  className = ""
}) => {
  const [currentAnimation, setCurrentAnimation] = useState<CharacterAnimation>('idle');
  
  const animations: { type: CharacterAnimation; label: string; description: string; icon: string }[] = [
    { 
      type: 'idle', 
      label: 'Idle', 
      description: 'Default resting state',
      icon: '🧘‍♂️'
    },
    { 
      type: 'happy', 
      label: 'Happy', 
      description: 'Joyful celebration',
      icon: '😊'
    },
    { 
      type: 'thinking', 
      label: 'Thinking', 
      description: 'Deep in thought',
      icon: '🤔'
    },
    { 
      type: 'confused', 
      label: 'Confused', 
      description: 'Puzzled reaction',
      icon: '😕'
    },
    { 
      type: 'celebrating', 
      label: 'Celebrating', 
      description: 'Excited celebration',
      icon: '🎉'
    },
    { 
      type: 'working', 
      label: 'Working', 
      description: 'Busy with a task',
      icon: '💼'
    }
  ];
  
  const handleAnimationClick = (animation: CharacterAnimation) => {
    setCurrentAnimation(animation);
    onAnimationChange(animation);
  };
  
  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white">Character Reactions</h3>
      
      <div className="grid grid-cols-3 gap-2">
        {animations.map((anim) => (
          <Button
            key={anim.type}
            onClick={() => handleAnimationClick(anim.type)}
            variant={currentAnimation === anim.type ? "default" : "outline"}
            className="flex flex-col items-center justify-center p-3 h-auto transition-all"
            title={anim.description}
          >
            <span className="text-xl mb-1">{anim.icon}</span>
            <span className="text-xs">{anim.label}</span>
          </Button>
        ))}
      </div>
      
      <div className="text-sm text-gray-300 mt-2">
        <p>Click a reaction to see your character respond!</p>
      </div>
    </div>
  );
};

export default CharacterAnimationController;