import React, { useEffect } from 'react';

interface DirectRedirectProps {
  to: string;
}

/**
 * Enhanced DirectRedirect component that uses multiple redirect strategies
 * for maximum browser compatibility. This approach handles edge cases
 * where common redirection methods might fail.
 */
const DirectRedirect: React.FC<DirectRedirectProps> = ({ to }) => {
  useEffect(() => {
    console.log(`Multi-strategy redirect to: ${to}`);
    
    try {
      // Make sure the target URL is absolute
      const targetUrl = to.startsWith('http') 
        ? to 
        : window.location.origin + (to.startsWith('/') ? to : `/${to}`);
      
      console.log(`Resolved target URL: ${targetUrl}`);
      
      // Strategy 1: Direct location change
      window.location.href = targetUrl;
      
      // Strategy 2: Use location.replace (cleaner history)
      setTimeout(() => {
        window.location.replace(targetUrl);
      }, 100);
      
      // Strategy 3: Meta refresh as fallback
      setTimeout(() => {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'refresh';
        meta.content = `0;url=${targetUrl}`;
        document.head.appendChild(meta);
      }, 200);
      
      // Strategy 4: Last resort - iframe technique
      setTimeout(() => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = targetUrl;
        document.body.appendChild(iframe);
        
        setTimeout(() => {
          // Force hard redirect if we're still here
          window.location = targetUrl as any;
        }, 100);
      }, 300);
    } catch (e) {
      console.error("Redirect error:", e);
      
      // Ultimate fallback with direct URL construction
      try {
        window.location.href = window.location.origin + (to.startsWith('/') ? to : `/${to}`);
      } catch (e2) {
        console.error("Ultimate fallback error:", e2);
        
        // Nothing else we can do but try direct string assignment
        window.location.href = 'https://' + window.location.host + (to.startsWith('/') ? to : `/${to}`);
      }
    }
  }, [to]);

  // Extract the display destination from the URL
  // Remove any .html extension for prettier display
  const displayDestination = to
    .split('/')
    .pop()
    ?.replace('.html', '')
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Destination Page';

  // Return an enhanced loading state with manual link option
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0F1D] to-[#162033] flex items-center justify-center">
      <div className="flex flex-col items-center text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 border-4 border-[#33C3BD] border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-[#33C3BD]">Redirecting to {displayDestination}</h2>
        <p className="text-gray-400 mt-2 mb-6">Please wait while we take you there...</p>
        
        <div className="mt-2 flex flex-col gap-3">
          <a 
            href={to} 
            className="px-4 py-2 bg-[#33C3BD]/10 border border-[#33C3BD] text-[#33C3BD] rounded-md hover:bg-[#33C3BD]/20 transition-colors"
          >
            Click here if not redirected automatically
          </a>
          
          <div className="text-xs text-gray-500 mt-2">
            Having trouble? Try these direct links:
            <div className="flex justify-center gap-4 mt-2">
              <a href={to} className="text-[#33C3BD] underline">Direct Link</a>
              <a href={window.location.origin + (to.startsWith('/') ? to : `/${to}`)} className="text-[#33C3BD] underline">Absolute Link</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectRedirect;