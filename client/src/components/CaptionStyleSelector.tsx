import React from 'react';
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Bold, AlignCenter, Baseline, Type } from "lucide-react";

interface CaptionStyleSelectorProps {
  value: string;
  onChange: (style: string) => void;
}

const CaptionStyleSelector: React.FC<CaptionStyleSelectorProps> = ({ value, onChange }) => {
  const { toast } = useToast();
  
  const captionStyles = [
    { id: 'minimal', name: 'Minimal', description: 'Clean, elegant subtitles', icon: <AlignCenter className="h-4 w-4" /> },
    { id: 'bold', name: 'Bold', description: 'Attention-grabbing text', icon: <Bold className="h-4 w-4" /> },
    { id: 'gradient', name: 'Gradient', description: 'TikTok-style colors', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'trending', name: 'Trending', description: 'Viral content style', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'subtitle', name: 'Subtitle', description: 'Professional captions', icon: <Type className="h-4 w-4" /> }
  ];
  
  const handleChange = (newValue: string) => {
    console.log(`Radio CaptionStyleSelector: Setting style to ${newValue}`);
    onChange(newValue);
    
    // Find the selected style name
    const selectedStyle = captionStyles.find(style => style.id === newValue);
    
    toast({
      title: "Caption style updated",
      description: `Selected style: ${selectedStyle?.name || newValue}`,
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-purple-300 mb-2">
        Current style: <strong>{value}</strong>
      </div>
      
      <RadioGroup 
        defaultValue={value}
        onValueChange={handleChange}
        className="grid grid-cols-1 md:grid-cols-5 gap-2"
      >
        {captionStyles.map((style) => (
          <div key={style.id} className="flex items-start space-x-2">
            <RadioGroupItem 
              value={style.id} 
              id={`style-${style.id}`}
              className="mt-1"
            />
            <Label 
              htmlFor={`style-${style.id}`} 
              className={`flex flex-col cursor-pointer p-2 rounded-md ${value === style.id ? 'bg-purple-900/30 text-white' : 'text-gray-300'}`}
            >
              <div className="flex items-center gap-2">
                {style.icon}
                <span className="font-medium">{style.name}</span>
              </div>
              <span className="text-xs text-gray-400">{style.description}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
      
      {/* Fallback direct selection */}
      <div className="mt-4 grid grid-cols-5 gap-2">
        {captionStyles.map(style => (
          <button
            key={`btn-${style.id}`}
            type="button"
            onClick={() => handleChange(style.id)}
            className={`text-xs p-1 rounded ${value === style.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'}`}
          >
            {style.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CaptionStyleSelector;