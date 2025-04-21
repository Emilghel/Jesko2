import { ServiceStatus } from "@/types";
import { Shield, Cloud, Brain, Mic } from "lucide-react";

interface ServiceStatusProps {
  services: ServiceStatus[];
}

export default function ServiceStatusComponent({ services }: ServiceStatusProps) {
  // Default services if none are provided
  const defaultServices = [
    {
      name: "Twilio",
      description: "Voice webhook active",
      connected: true,
      status: "Connected",
      icon: "call"
    },
    {
      name: "OpenAI GPT-4",
      description: "Natural language processing",
      connected: true,
      status: "Connected",
      icon: "psychology"
    },
    {
      name: "ElevenLabs",
      description: "Text-to-speech synthesis",
      connected: true,
      status: "Connected",
      icon: "record_voice_over"
    },
    {
      name: "WebSocket Server",
      description: "Real-time audio streaming",
      connected: true,
      status: "Active (3 connections)",
      icon: "sync_alt"
    }
  ];

  const displayServices = services && services.length ? services : defaultServices;
  
  // Get icon components based on service name
  const getIcon = (name: string, iconName: string) => {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('twilio') || iconName === 'call') {
      return <Cloud className="h-5 w-5 text-cyan-400" />;
    }
    
    if (nameLower.includes('openai') || nameLower.includes('gpt') || iconName === 'psychology') {
      return <Brain className="h-5 w-5 text-cyan-400" />;
    }
    
    if (nameLower.includes('elevenlabs') || iconName === 'record_voice_over') {
      return <Mic className="h-5 w-5 text-cyan-400" />;
    }
    
    return <Shield className="h-5 w-5 text-cyan-400" />;
  };
  
  return (
    <div className="space-y-4">
      {displayServices.map((service, index) => (
        <div 
          key={index} 
          className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-800/60 to-gray-900/60 border border-gray-700/50 hover:border-cyan-700/50 transition-all"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-full bg-cyan-900/40 p-2 mr-3">
                {getIcon(service.name, service.icon)}
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-200">
                {service.name}
              </p>
              <p className="text-sm text-gray-400">
                {service.description}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full ${service.connected ? 'bg-green-400' : 'bg-red-400'} mr-2`}></span>
            <span className={`${service.connected ? 'text-green-300' : 'text-red-300'} text-sm`}>
              {service.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}