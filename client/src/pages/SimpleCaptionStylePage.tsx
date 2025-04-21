import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * Ultra simple caption style selector page
 * Using only the most basic HTML elements to avoid any form/component conflicts
 */
const SimpleCaptionStylePage: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState<string>('minimal');
  const [saveMessage, setSaveMessage] = useState<string>('');
  
  // Load the saved style on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('captionStyle');
      if (saved) {
        setSelectedStyle(saved);
        setSaveMessage(`Current style: ${saved}`);
      }
    } catch (err) {
      console.error('Error reading from localStorage:', err);
    }
  }, []);
  
  // Simple caption styles
  const captionStyles = [
    { id: 'minimal', name: 'MINIMAL', desc: 'Clean design with semi-transparent background' },
    { id: 'bold', name: 'BOLD', desc: 'Attention-grabbing with larger text' },
    { id: 'gradient', name: 'GRADIENT', desc: 'TikTok-style with rainbow effects' },
    { id: 'trending', name: 'TRENDING', desc: 'High-impact for viral content' },
    { id: 'subtitle', name: 'SUBTITLE', desc: 'Professional style with elegant formatting' }
  ];
  
  // Handle style selection
  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    try {
      localStorage.setItem('captionStyle', styleId);
      setSaveMessage(`✓ Style saved: ${styleId}`);
      
      // Flash the success message
      setTimeout(() => {
        setSaveMessage(`Current style: ${styleId}`);
      }, 2000);
    } catch (err) {
      console.error('Error saving to localStorage:', err);
      setSaveMessage('❌ Error saving style');
    }
  };
  
  // Go back to clip studio
  const goBackToClipStudio = () => {
    window.location.href = '/ai-clip-studio';
  };
  
  return (
    <div style={{ 
      backgroundColor: '#121212', 
      minHeight: '100vh',
      padding: '40px 20px',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto',
        backgroundColor: '#1E1E1E',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold',
          color: '#A855F7',
          textAlign: 'center',
          marginBottom: '8px'
        }}>
          Caption Style Selection
        </h1>
        
        <p style={{ 
          textAlign: 'center', 
          color: '#9CA3AF',
          marginBottom: '24px'
        }}>
          Choose how your video captions will appear
        </p>
        
        <div style={{
          backgroundColor: '#2D2D2D',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '24px',
          textAlign: 'center',
          color: selectedStyle === 'minimal' ? '#22C55E' : '#D1D5DB'
        }}>
          {saveMessage || `Current style: ${selectedStyle}`}
        </div>
        
        <div style={{ marginBottom: '32px' }}>
          {captionStyles.map(style => (
            <div
              key={style.id}
              onClick={() => handleStyleSelect(style.id)}
              style={{
                backgroundColor: selectedStyle === style.id ? '#4C1D95' : '#2D2D2D',
                border: `2px solid ${selectedStyle === style.id ? '#8B5CF6' : 'transparent'}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>
                  {style.name}
                </div>
                <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                  {style.desc}
                </div>
              </div>
              
              {selectedStyle === style.id && (
                <div style={{ color: '#22C55E', fontSize: '24px' }}>
                  <CheckCircle />
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={goBackToClipStudio}
            style={{
              backgroundColor: '#9333EA',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(147, 51, 234, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            Save & Return to Clip Studio
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleCaptionStylePage;