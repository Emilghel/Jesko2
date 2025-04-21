import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowLeft, Check } from 'lucide-react';

/**
 * Dedicated page just for setting caption styles
 * This page is completely separate from the AIClipStudioPage and should
 * avoid any conflicts with form elements or component libraries
 */
const CaptionStylePage: React.FC = () => {
  const [, navigate] = useLocation();
  const [currentStyle, setCurrentStyle] = React.useState<string>('minimal');
  
  // Get starting style from localStorage if available
  useEffect(() => {
    try {
      const savedStyle = localStorage.getItem('captionStyle');
      if (savedStyle) {
        setCurrentStyle(savedStyle);
      }
    } catch (err) {
      console.error("Could not read from localStorage:", err);
    }
  }, []);
  
  // Simple styles definition
  const styles = [
    { id: 'minimal', label: 'MINIMAL', desc: 'Clean design with semi-transparent background' },
    { id: 'bold', label: 'BOLD', desc: 'Attention-grabbing with larger text' },
    { id: 'gradient', label: 'GRADIENT', desc: 'TikTok-style with rainbow effects' },
    { id: 'trending', label: 'TRENDING', desc: 'High-impact for viral content' },
    { id: 'subtitle', label: 'SUBTITLE', desc: 'Professional style with elegant formatting' }
  ];
  
  // Function to select style and save it
  const selectStyle = (style: string) => {
    setCurrentStyle(style);
    try {
      localStorage.setItem('captionStyle', style);
      document.getElementById('status-message')!.innerHTML = `<span class="text-green-400">✓ Selected: ${style}</span>`;
      
      // Add animation to the button
      const button = document.getElementById(`style-${style}`);
      if (button) {
        button.classList.add('animate-pulse');
        setTimeout(() => {
          button.classList.remove('animate-pulse');
        }, 1000);
      }
    } catch (err) {
      console.error("Could not save to localStorage:", err);
      document.getElementById('status-message')!.innerHTML = 
        `<span class="text-red-400">Error saving selection</span>`;
    }
  };
  
  // Return to the previous page
  const goBack = () => {
    navigate('/ai-clip-studio');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-16 px-4">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={goBack}
          className="mb-8 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Clip Studio</span>
        </button>
        
        <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-6 shadow-xl">
          <h1 className="text-3xl font-bold text-center mb-2 text-purple-300">Caption Style Selector</h1>
          <p className="text-center text-gray-400 mb-8">Select a style for your video captions</p>
          
          <div id="status-message" className="text-center my-4 h-6">
            <span className="text-blue-300">Current style: {currentStyle}</span>
          </div>
          
          <div className="grid gap-4 mb-8">
            {styles.map(style => (
              <button
                key={style.id}
                id={`style-${style.id}`}
                onClick={() => selectStyle(style.id)}
                className={`
                  p-4 rounded-lg flex items-center justify-between transition-all
                  ${currentStyle === style.id 
                    ? 'bg-purple-900 border-2 border-purple-400' 
                    : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'}
                `}
              >
                <div className="flex flex-col items-start text-left">
                  <span className="font-bold text-lg">{style.label}</span>
                  <span className="text-sm text-gray-300">{style.desc}</span>
                </div>
                {currentStyle === style.id && (
                  <div className="bg-green-500 rounded-full p-1">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={goBack}
              className="bg-purple-700 hover:bg-purple-600 px-8 py-3 rounded-lg font-bold text-lg shadow-lg"
            >
              Save & Return to Clip Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptionStylePage;