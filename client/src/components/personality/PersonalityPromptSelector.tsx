import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PersonalityPrompt {
  id: number;
  personality_id: string;
  name: string;
  description: string;
  prompt_text: string;
  icon: string;
  color: string;
  is_active: boolean;
  order: number;
  voice_id?: string;
  model_config?: Record<string, any>;
}

interface PersonalityPromptSelectorProps {
  onSelect: (prompt: PersonalityPrompt) => void;
  currentPersonalityId?: string;
}

export function PersonalityPromptSelector({
  onSelect,
  currentPersonalityId
}: PersonalityPromptSelectorProps) {
  const [prompts, setPrompts] = useState<PersonalityPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPersonalityPrompts = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/personality-prompts');
        
        // Sort by order if available, otherwise by name
        const sortedPrompts = response.data.sort((a: PersonalityPrompt, b: PersonalityPrompt) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          return a.name.localeCompare(b.name);
        });
        
        setPrompts(sortedPrompts);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch personality prompts:', err);
        setError('Failed to load personality prompts. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load personality prompts',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalityPrompts();
  }, [toast]);

  // Function to get the CSS color class based on the color name
  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      red: 'bg-red-100 text-red-800 border-red-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      purple: 'bg-purple-100 text-purple-800 border-purple-300',
      pink: 'bg-pink-100 text-pink-800 border-pink-300',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      teal: 'bg-teal-100 text-teal-800 border-teal-300',
      emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      amber: 'bg-amber-100 text-amber-800 border-amber-300',
      gray: 'bg-gray-100 text-gray-800 border-gray-300',
    };

    return colorMap[color] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Get icon from Material UI icons
  const renderIcon = (iconName: string) => {
    return <span className="material-symbols-outlined">{iconName}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading personality prompts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        <p>{error}</p>
        <Button 
          variant="outline" 
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="p-4 bg-gray-50 text-gray-600 rounded-lg">
        <p>No personality prompts available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {prompts.map(prompt => (
        <Card 
          key={prompt.id}
          className={`overflow-hidden transition-all hover:shadow-md cursor-pointer ${
            currentPersonalityId === prompt.personality_id 
              ? 'ring-2 ring-primary' 
              : ''
          }`}
          onClick={() => onSelect(prompt)}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className={`p-2 rounded-full mr-2 ${getColorClass(prompt.color)}`}>
                  {renderIcon(prompt.icon)}
                </div>
                <CardTitle className="text-xl">{prompt.name}</CardTitle>
              </div>
            </div>
            <CardDescription className="mt-1">{prompt.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 line-clamp-3">
              {prompt.prompt_text.length > 150 
                ? `${prompt.prompt_text.substring(0, 150)}...` 
                : prompt.prompt_text}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}