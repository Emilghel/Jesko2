import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ArrowRight, Download, Calendar, PlayCircle } from "lucide-react";
import React, { useEffect } from 'react';
import TeamCarousel from "@/components/TeamCarousel";
import SuccessStories from "@/components/SuccessStories";
import { useAuth } from "@/hooks/use-auth";
import BenefitCard from "@/components/BenefitCard";
import VideoBackground from "@/components/VideoBackground";
import AdvancedStarryBackground from "@/components/AdvancedStarryBackground";

// Custom navigation component for OwnYourAI page
function CustomNavigation() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <nav className="bg-[#0A0F16]/90 backdrop-blur-md p-4 border-b border-[#1E293B] fixed top-0 left-0 right-0 w-full z-50 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/home">
            <span className="text-xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent cursor-pointer">
              WarmLeadNetwork AI
            </span>
          </Link>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/home">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Homepage</span>
          </Link>
          <Link href="/dashboard">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Dashboard</span>
          </Link>
          {/* Test Voice AI link hidden
          <Link href="/test">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Test Voice AI</span>
          </Link>
          */}
          {/* Notifications link hidden
          <Link href="/notifications">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Notifications</span>
          </Link>
          */}
          <Link href="/own-your-ai">
            <span className="text-cyan-300 hover:text-cyan-400 transition-colors px-3 py-1 text-sm cursor-pointer bg-cyan-900/30 rounded">Own Your AI</span>
          </Link>
          {user?.is_admin && (
            <Link href="/admin">
              <span className="text-cyan-300 hover:text-cyan-400 transition-colors px-3 py-1 text-sm cursor-pointer bg-cyan-900/30 rounded">Admin Panel</span>
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-3 ml-4">
              <div className="text-sm text-gray-300">
                {user.displayName || user.username}
                {user.is_admin && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-cyan-900/30 text-cyan-400 rounded-full">Admin</span>
                )}
              </div>
              <button
                onClick={() => logout()}
                className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/auth">
              <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function OwnYourAI() {
  // Add useEffect to handle video-related functionality
  useEffect(() => {
    // Wait for component to mount and DOM elements to be available
    const setupVideoEvents = () => {
      const videoElement = document.querySelector('.featured-video') as HTMLVideoElement;
      const overlay = document.querySelector('.video-overlay') as HTMLElement;
      
      if (videoElement && overlay) {
        // Function to handle video playing state
        const handlePlayState = () => {
          // When video plays, hide the overlay
          if (!videoElement.paused) {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
          } else {
            // When video pauses or ends, show the overlay again
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'auto';
          }
        };
        
        // Add event listeners for play, pause and ended events
        videoElement.addEventListener('play', handlePlayState);
        videoElement.addEventListener('pause', handlePlayState);
        videoElement.addEventListener('ended', handlePlayState);
        
        // Add a special event for looping at the end of the video
        videoElement.addEventListener('timeupdate', () => {
          // If video is near the end, loop it
          if (videoElement.currentTime > videoElement.duration - 0.5) {
            // Loop back to 5 seconds before the end
            const startTime = Math.max(0, videoElement.duration - 5);
            videoElement.currentTime = startTime;
          }
        });
        
        // Clean up event listeners on component unmount
        return () => {
          videoElement.removeEventListener('play', handlePlayState);
          videoElement.removeEventListener('pause', handlePlayState);
          videoElement.removeEventListener('ended', handlePlayState);
          videoElement.removeEventListener('timeupdate', () => {});
        };
      }
    };
    
    // Set a small timeout to ensure DOM elements are fully rendered
    const timeoutId = setTimeout(setupVideoEvents, 100);
    
    // Cleanup function
    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array means this effect runs once on mount
  
  return (
    <div className="bg-[#0A0F16] min-h-screen relative">
      {/* Add custom navigation */}
      <CustomNavigation />
      
      {/* Simplified Starry Background with reduced visual effects for better performance */}
      <AdvancedStarryBackground 
        density={10}
        enableTAA={false}
        enableSSAO={false} 
        enableHDR={false}
        enableBloom={false}
        depth={1}
        shootingStarCount={0}
      />
      
      {/* Content container with z-index to appear above the starry background */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col justify-center pt-32 pb-16 bg-transparent">
          <div className="container mx-auto px-6 md:px-12 z-10 flex flex-col items-center">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-6 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
                Own an AI Business
              </h1>
              <h2 className="text-3xl md:text-4xl font-semibold mb-8 text-white">
                Make Money Passively with an AI Digital Data Company
              </h2>
              <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
                Get full access to our powerful AI technology and launch your own business, automated, and ready to scale.
              </p>
              
              {/* Simple Video Section with clean overlay design */}
              <div className="mb-12 w-full">
                <div className="relative w-full max-w-4xl mx-auto rounded-xl overflow-hidden">
                  {/* Video container */}
                  <div className="relative rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                    <video 
                      className="absolute inset-0 w-full h-full object-cover featured-video"
                      controls 
                      playsInline
                      preload="metadata"
                      loop
                      onClick={(e) => {
                        // Prevent event propagation from the video element
                        e.stopPropagation();
                      }}
                    >
                      <source src="https://video.wixstatic.com/video/ee3656_92c4c46d6abd490685dcfc1551c22459/1080p/mp4/file.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    
                    {/* Video overlay that disappears completely when video plays */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-br from-[#0F172A]/70 to-[#0A0F16]/90 flex flex-col items-center justify-center cursor-pointer video-overlay transition-opacity duration-500"
                      onClick={() => {
                        const videoElement = document.querySelector('.featured-video') as HTMLVideoElement;
                        const overlay = document.querySelector('.video-overlay') as HTMLElement;
                        
                        if (videoElement && overlay) {
                          // Play the video from 5 seconds before the end
                          const handleCanPlay = () => {
                            const duration = videoElement.duration;
                            if (duration && isFinite(duration)) {
                              const startTime = Math.max(0, duration - 5);
                              videoElement.currentTime = startTime;
                            }
                            videoElement.play();
                            // Remove the overlay completely
                            overlay.style.opacity = '0';
                            overlay.style.pointerEvents = 'none';
                            
                            videoElement.removeEventListener('canplay', handleCanPlay);
                          };
                          
                          if (videoElement.readyState >= 3) {
                            handleCanPlay();
                          } else {
                            videoElement.addEventListener('canplay', handleCanPlay);
                          }
                        }
                      }}
                    >
                      {/* Play button with pulsing animation */}
                      <div className="relative w-24 h-24 mb-8 group">
                        {/* Pulsing ring animation */}
                        <div className="absolute inset-0 rounded-full bg-[#33C3BD]/20 animate-ping opacity-75"></div>
                        
                        {/* Button background */}
                        <div className="relative w-full h-full rounded-full bg-[#33C3BD]/30 border-2 border-[#33C3BD] flex items-center justify-center transition-transform group-hover:scale-110">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#33C3BD" className="w-12 h-12 ml-1">
                            <path d="M8 5.14v14l11-7-11-7z" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Video info */}
                      <h3 className="text-2xl font-bold text-white mb-2">Jesko AI: Own Your Business</h3>
                      <p className="text-[#33C3BD] text-lg font-medium">Click to watch demo</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <a 
                  href="https://calendly.com/warmleadnetwork/30-minute-meeting-purchasing-a-business"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button size="lg" className="bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90 transition-opacity text-white font-medium px-8">
                    Get Started Now
                  </Button>
                </a>
                <a 
                  href="/documents/WLN_AGREEMENT.pdf" 
                  download="WarmLeadNetwork_Agreement.pdf"
                  className="inline-flex"
                >
                  <Button size="lg" variant="outline" className="border-[#33C3BD] text-[#33C3BD] hover:bg-[#33C3BD]/10">
                    Download Info Pack
                    <Download className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Meet the Team Section - transparent background to allow stars to show through */}
        <section className="py-8 bg-transparent">
          <div className="container mx-auto px-4 md:px-8">
            <TeamCarousel />
          </div>
        </section>
        
        {/* Success Stories Section - transparent background to allow stars to show through */}
        <section className="py-16 bg-transparent">
          <div className="container mx-auto px-6 md:px-12">
            <SuccessStories />
          </div>
        </section>

        {/* What You Get Section */}
        <section className="py-24 bg-[#0F172A]">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
                What You Get
              </h2>
              <p className="text-lg text-gray-300 max-w-3xl mx-auto">
                Everything you need to run a successful AI business, without the technical hassle
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <BenefitCard 
                title="90% PASSIVE INCOME"
                description="Earn income without needing to manage daily operations. The system works for you, generating revenue while you focus on what matters most."
                delay="0s"
                soundType="income"
              />
              
              <BenefitCard 
                title="AI OWNERSHIP"
                description="Get full control and rights over your own branded AI assistant. Customize it, profit from it, and own a piece of the future."
                delay="0.5s"
                colorPrimary="rgba(6, 182, 212, 1)"
                colorSecondary="rgba(59, 130, 246, 0.8)"
                soundType="ownership"
              />
              
              <BenefitCard 
                title="FREEDOM OF LOCATION"
                description="Run your business from anywhere in the world. Whether you're traveling or living abroad, you're always in control."
                delay="1s"
                colorPrimary="rgba(124, 58, 237, 1)"
                colorSecondary="rgba(139, 92, 246, 0.8)"
                soundType="freedom"
              />
              
              <BenefitCard 
                title="WE ARE BEHIND YOU TO HELP YOU SCALE"
                description="You're not alone. Our expert team and proven systems are here to support you every step of the way as you grow."
                delay="1.5s"
                colorPrimary="rgba(236, 72, 153, 1)"
                colorSecondary="rgba(244, 114, 182, 0.8)"
                soundType="support"
              />
            </div>
          </div>
        </section>

        {/* Why License Section - transparent background to allow stars to show through */}
        <section className="py-24 bg-transparent">
          <div className="container mx-auto px-6 md:px-12">
            <div className="flex flex-col lg:flex-row items-center">
              <div className="lg:w-1/2 mb-12 lg:mb-0 lg:pr-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
                  Why License the AI
                </h2>
                <p className="text-gray-300 mb-8 text-lg">
                  Instead of spending years and millions developing your own AI technology, get started today with our proven, ready-to-deploy solution.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="star-wrapper mr-4 shrink-0"
                      style={{
                        "--delay": "0s",
                        "--color1": "rgba(255, 193, 7, 1)",
                        "--color2": "rgba(255, 193, 7, 0.6)"
                      } as React.CSSProperties}
                    >
                      <svg 
                        className="star-svg" 
                        width="36" 
                        height="36" 
                        viewBox="0 0 50 50"
                        style={{
                          "--delay": "0s",
                          "--color1": "rgba(255, 193, 7, 1)",
                          "--color2": "rgba(255, 193, 7, 0.6)"
                        } as React.CSSProperties}
                      >
                        {/* Main star shape */}
                        <path 
                          d="M25 2L31.2 18.3L48.5 18.7L35.5 28.8L39.5 46L25 36.2L10.5 46L14.5 28.8L1.5 18.7L18.8 18.3L25 2Z" 
                          fill="currentColor"
                          stroke="rgba(255,255,255,0.7)"
                          strokeWidth="0.5"
                        />
                        
                        {/* Light center core */}
                        <circle 
                          cx="25" 
                          cy="25" 
                          r="5" 
                          fill="white" 
                          opacity="0.3" 
                        />
                        
                        {/* Light rays from points */}
                        <path 
                          d="M25 2L26 6L25 10L24 6L25 2Z M48.5 18.7L44.5 19.7L40.5 20.7L44.5 21.7L48.5 18.7Z M39.5 46L36.5 42L33.5 38L34.5 42L39.5 46Z M10.5 46L15.5 42L16.5 38L13.5 42L10.5 46Z M1.5 18.7L5.5 21.7L9.5 20.7L5.5 19.7L1.5 18.7Z" 
                          fill="white" 
                          opacity="0.5" 
                        />
                        
                        {/* Inner gradient */}
                        <radialGradient id="starGradient-1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
                          <stop offset="20%" stopColor="white" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                        </radialGradient>
                        <circle 
                          cx="25" 
                          cy="25" 
                          r="13" 
                          fill="url(#starGradient-1)" 
                          opacity="0.6" 
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-lg">No Need to Build Your Own System</h3>
                      <p className="text-gray-400">Skip the expensive R&D phase and leverage our battle-tested AI technology immediately.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="star-wrapper mr-4 shrink-0"
                      style={{
                        "--delay": "0.3s",
                        "--color1": "rgba(6, 182, 212, 1)",
                        "--color2": "rgba(59, 130, 246, 0.8)"
                      } as React.CSSProperties}
                    >
                      <svg 
                        className="star-svg" 
                        width="36" 
                        height="36" 
                        viewBox="0 0 50 50"
                        style={{
                          "--delay": "0.3s",
                          "--color1": "rgba(6, 182, 212, 1)",
                          "--color2": "rgba(59, 130, 246, 0.8)"
                        } as React.CSSProperties}
                      >
                        {/* Main star shape */}
                        <path 
                          d="M25 2L31.2 18.3L48.5 18.7L35.5 28.8L39.5 46L25 36.2L10.5 46L14.5 28.8L1.5 18.7L18.8 18.3L25 2Z" 
                          fill="currentColor"
                          stroke="rgba(255,255,255,0.7)"
                          strokeWidth="0.5"
                        />
                        
                        {/* Light center core */}
                        <circle 
                          cx="25" 
                          cy="25" 
                          r="5" 
                          fill="white" 
                          opacity="0.3" 
                        />
                        
                        {/* Light rays from points */}
                        <path 
                          d="M25 2L26 6L25 10L24 6L25 2Z M48.5 18.7L44.5 19.7L40.5 20.7L44.5 21.7L48.5 18.7Z M39.5 46L36.5 42L33.5 38L34.5 42L39.5 46Z M10.5 46L15.5 42L16.5 38L13.5 42L10.5 46Z M1.5 18.7L5.5 21.7L9.5 20.7L5.5 19.7L1.5 18.7Z" 
                          fill="white" 
                          opacity="0.5" 
                        />
                        
                        {/* Inner gradient */}
                        <radialGradient id="starGradient-2" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
                          <stop offset="20%" stopColor="white" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                        </radialGradient>
                        <circle 
                          cx="25" 
                          cy="25" 
                          r="13" 
                          fill="url(#starGradient-2)" 
                          opacity="0.6" 
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-lg">Proven Model Already Generating Results</h3>
                      <p className="text-gray-400">Our AI has already processed thousands of customer interactions with proven ROI and satisfaction.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="star-wrapper mr-4 shrink-0"
                      style={{
                        "--delay": "0.6s",
                        "--color1": "rgba(124, 58, 237, 1)",
                        "--color2": "rgba(139, 92, 246, 0.8)"
                      } as React.CSSProperties}
                    >
                      <svg 
                        className="star-svg" 
                        width="36" 
                        height="36" 
                        viewBox="0 0 50 50"
                        style={{
                          "--delay": "0.6s",
                          "--color1": "rgba(124, 58, 237, 1)",
                          "--color2": "rgba(139, 92, 246, 0.8)"
                        } as React.CSSProperties}
                      >
                        {/* Main star shape */}
                        <path 
                          d="M25 2L31.2 18.3L48.5 18.7L35.5 28.8L39.5 46L25 36.2L10.5 46L14.5 28.8L1.5 18.7L18.8 18.3L25 2Z" 
                          fill="currentColor"
                          stroke="rgba(255,255,255,0.7)"
                          strokeWidth="0.5"
                        />
                        
                        {/* Light center core */}
                        <circle 
                          cx="25" 
                          cy="25" 
                          r="5" 
                          fill="white" 
                          opacity="0.3" 
                        />
                        
                        {/* Light rays from points */}
                        <path 
                          d="M25 2L26 6L25 10L24 6L25 2Z M48.5 18.7L44.5 19.7L40.5 20.7L44.5 21.7L48.5 18.7Z M39.5 46L36.5 42L33.5 38L34.5 42L39.5 46Z M10.5 46L15.5 42L16.5 38L13.5 42L10.5 46Z M1.5 18.7L5.5 21.7L9.5 20.7L5.5 19.7L1.5 18.7Z" 
                          fill="white" 
                          opacity="0.5" 
                        />
                        
                        {/* Inner gradient */}
                        <radialGradient id="starGradient-3" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
                          <stop offset="20%" stopColor="white" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                        </radialGradient>
                        <circle 
                          cx="25" 
                          cy="25" 
                          r="13" 
                          fill="url(#starGradient-3)" 
                          opacity="0.6" 
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-lg">Instant Credibility and Infrastructure</h3>
                      <p className="text-gray-400">Launch with enterprise-grade technology that immediately establishes your business as a serious player.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="star-wrapper mr-4 shrink-0"
                      style={{
                        "--delay": "0.9s",
                        "--color1": "rgba(236, 72, 153, 1)",
                        "--color2": "rgba(244, 114, 182, 0.8)"
                      } as React.CSSProperties}
                    >
                      <svg 
                        className="star-svg" 
                        width="36" 
                        height="36" 
                        viewBox="0 0 50 50"
                        style={{
                          "--delay": "0.9s",
                          "--color1": "rgba(236, 72, 153, 1)",
                          "--color2": "rgba(244, 114, 182, 0.8)"
                        } as React.CSSProperties}
                      >
                        {/* Main star shape */}
                        <path 
                          d="M25 2L31.2 18.3L48.5 18.7L35.5 28.8L39.5 46L25 36.2L10.5 46L14.5 28.8L1.5 18.7L18.8 18.3L25 2Z" 
                          fill="currentColor"
                          stroke="rgba(255,255,255,0.7)"
                          strokeWidth="0.5"
                        />
                        
                        {/* Light center core */}
                        <circle 
                          cx="25" 
                          cy="25" 
                          r="5" 
                          fill="white" 
                          opacity="0.3" 
                        />
                        
                        {/* Light rays from points */}
                        <path 
                          d="M25 2L26 6L25 10L24 6L25 2Z M48.5 18.7L44.5 19.7L40.5 20.7L44.5 21.7L48.5 18.7Z M39.5 46L36.5 42L33.5 38L34.5 42L39.5 46Z M10.5 46L15.5 42L16.5 38L13.5 42L10.5 46Z M1.5 18.7L5.5 21.7L9.5 20.7L5.5 19.7L1.5 18.7Z" 
                          fill="white" 
                          opacity="0.5" 
                        />
                        
                        {/* Inner gradient */}
                        <radialGradient id="starGradient-4" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
                          <stop offset="20%" stopColor="white" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                        </radialGradient>
                        <circle 
                          cx="25" 
                          cy="25" 
                          r="13" 
                          fill="url(#starGradient-4)" 
                          opacity="0.6" 
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-lg">Keep up to 95% of the Revenue</h3>
                      <p className="text-gray-400">Highly profitable business model with minimal overhead and maximum return on investment.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="lg:w-1/2">
                <div className="bg-[#141B29] rounded-xl border border-[#1E293B] p-8 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#33C3BD]/20 to-[#0075FF]/20 blur-xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#33C3BD]/20 to-[#0075FF]/20 blur-xl"></div>
                  
                  <h3 className="text-2xl font-bold text-white mb-6">Profit Potential Calculator</h3>
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Initial Investment</span>
                      <span className="font-semibold text-white">$2,500 - $10,000</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Monthly Operating Cost</span>
                      <span className="font-semibold text-white">$250 - $500</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Average Per-Client Revenue</span>
                      <span className="font-semibold text-white">$1,000 - $5,000</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Potential ROI (6 months)</span>
                      <span className="font-semibold text-white">300% - 1,200%</span>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-[#1E293B]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-lg text-white">Your Revenue Share</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">95%</span>
                      </div>
                      <div className="h-2 bg-[#0A0F16] rounded-full overflow-hidden">
                        <div className="h-full w-[95%] bg-gradient-to-r from-[#33C3BD] to-[#0075FF] rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Call to Action Section */}
        <section className="py-20 bg-[#0F172A] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#0A0F16] to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-[#0A0F16] to-transparent"></div>
          
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#33C3BD]/10 blur-[100px] rounded-full"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0075FF]/10 blur-[100px] rounded-full"></div>
          </div>
          
          <div className="container mx-auto px-6 md:px-12 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
                Ready to Start Your <span className="bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">AI Business Journey</span>?
              </h2>
              <p className="text-lg text-gray-300 mb-12">
                Join the future of business automation and start generating passive income with your own AI company. Our team is ready to help you get set up and running in as little as 14 days.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <a href="https://calendly.com/warmleadnetwork/30-minute-meeting-purchasing-a-business" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="block bg-[#141B29] rounded-xl border border-[#1E293B] p-6 hover:bg-[#182235] transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mx-auto mb-4">
                    <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 text-center">Get Started Now</h3>
                  <p className="text-gray-400 text-center mb-4">Begin your AI business journey today with our streamlined onboarding process.</p>
                  <div className="text-[#33C3BD] text-center group-hover:underline">Start Now →</div>
                </a>
                
                <a href="https://calendly.com/warmleadnetwork/30-minute-meeting-purchasing-a-business" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="block bg-[#141B29] rounded-xl border border-[#1E293B] p-6 hover:bg-[#182235] transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 text-center">Book a Call</h3>
                  <p className="text-gray-400 text-center mb-4">Schedule a consultation with our team to discuss your specific business needs.</p>
                  <div className="text-[#33C3BD] text-center group-hover:underline">Book Now →</div>
                </a>
                
                <a href="/documents/WLN AGREEMENT.pdf" download className="block bg-[#141B29] rounded-xl border border-[#1E293B] p-6 hover:bg-[#182235] transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center mx-auto mb-4">
                    <Download className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 text-center">Download Info Pack</h3>
                  <p className="text-gray-400 text-center mb-4">Get detailed information about licensing, pricing, and business opportunities.</p>
                  <div className="text-[#33C3BD] text-center group-hover:underline">Download →</div>
                </a>
              </div>
            </div>
          </div>
        </section>



        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-r from-[#0F172A] to-[#1E293B]">
          <div className="container mx-auto px-6 md:px-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              Start Your AI Business Journey Today
            </h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Join the growing community of AI business owners and secure your position in this rapidly expanding market.
            </p>
            <a 
              href="https://calendly.com/warmleadnetwork/30-minute-meeting-purchasing-a-business" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button size="lg" className="bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90 transition-opacity text-white font-medium px-8">
                Get Started Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}