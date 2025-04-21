import React from 'react';
import { AspectRatio } from "@/components/ui/aspect-ratio";

export default function SuccessStories() {
  return (
    <div className="w-full py-16 md:py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
          Success Stories
        </h2>
        <div className="h-1 w-24 bg-gradient-to-r from-purple-600 to-blue-500 mx-auto rounded-full"></div>
      </div>
      
      <div className="container mx-auto px-4 space-y-24">
        {/* Amir's Story - Video on Left */}
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Video Section */}
          <div className="w-full md:w-1/2 order-2 md:order-1">
            <div className="video-border-glow rounded-xl overflow-hidden">
              <AspectRatio ratio={16/9}>
                <video 
                  className="w-full h-full object-cover"
                  controls
                  poster="https://via.placeholder.com/800x450/0f172a/ffffff?text=Loading+Video..."
                >
                  <source 
                    src="https://video.wixstatic.com/video/ee3656_3b65b5eead364214aa88d665101cada2/720p/mp4/file.mp4" 
                    type="video/mp4" 
                  />
                  Your browser does not support the video tag.
                </video>
              </AspectRatio>
            </div>
          </div>
          
          {/* Text Section */}
          <div className="w-full md:w-1/2 order-1 md:order-2 mb-8 md:mb-0">
            <div className="p-6 md:p-8 bg-black/30 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-xl">
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
                Redefining Achievement: A Licensee Success Story with WarmLeadNetwork
              </h3>
              
              <p className="text-gray-300 mb-6 leading-relaxed">
                Meet Amir, a successful entrepreneur who moved from Egypt to the USA to build a better future. With WarmLeadNetwork, he turned his dreams into reality, growing a thriving business and achieving financial freedom. Watch his inspiring story to see how WarmLeadNetwork can transform lives!
              </p>
              
              <a 
                href="https://calendly.com/warmleadnetwork/30-minute-meeting-purchasing-a-business" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md px-6 py-2.5 font-medium text-white shadow-md transition-colors bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
              >
                Start Your Success Story
              </a>
            </div>
          </div>
        </div>
        
        {/* Jason's Story - Video on Right */}
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Text Section */}
          <div className="w-full md:w-1/2 order-1 mb-8 md:mb-0">
            <div className="p-6 md:p-8 bg-black/30 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-xl">
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent">
                Meet Jason: How He Built a $25K/Month Business with WarmLeadNetwork at 59 Years Old
              </h3>
              
              <p className="text-gray-300 mb-6 leading-relaxed">
                Meet Jason, a roofing business owner who scaled to $25K/month with WarmLeadNetwork! After joining WLN, Jason not only grew his business by leveraging our powerful lead generation system but also expanded his income by selling WLN products and AI bots as a licensee. Watch his inspiring journey!
              </p>
              
              <a 
                href="https://calendly.com/warmleadnetwork/30-minute-meeting-purchasing-a-business" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md px-6 py-2.5 font-medium text-white shadow-md transition-colors bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
              >
                Start Your Success Story
              </a>
            </div>
          </div>
          
          {/* Video Section */}
          <div className="w-full md:w-1/2 order-2">
            <div className="video-border-glow rounded-xl overflow-hidden">
              <AspectRatio ratio={16/9}>
                <video 
                  className="w-full h-full object-cover"
                  controls
                  poster="https://via.placeholder.com/800x450/0f172a/ffffff?text=Loading+Video..."
                >
                  <source 
                    src="https://video.wixstatic.com/video/ee3656_2abf029fa0a34a1a98e0a7af648d3867/720p/mp4/file.mp4" 
                    type="video/mp4" 
                  />
                  Your browser does not support the video tag.
                </video>
              </AspectRatio>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}