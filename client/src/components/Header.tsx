import { useEffect, useState } from "react";
import { ServerStatus } from "@/types";
import { AgentSelector } from "@/components/AgentSelector";

interface HeaderProps {
  serverStatus: ServerStatus;
  onRestartServer: () => void;
}

export default function Header({ serverStatus, onRestartServer }: HeaderProps) {
  const statusColor = serverStatus.online ? "green" : "red";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [lastMessage, setLastMessage] = useState<string>("");
  
  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected in header');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'conversation_update') {
          // When a new conversation message is received
          setLastMessage(data.aiResponse || "");
          setIsSpeaking(true);
          
          // Simulate the AI speaking duration based on message length
          const speakingDuration = Math.max(3000, data.aiResponse.length * 50);
          setTimeout(() => {
            setIsSpeaking(false);
          }, speakingDuration);
        } 
        else if (data.type === 'call_update') {
          // Handle active call updates
          if (data.action === 'ended') {
            setActiveCall(null);
            setIsSpeaking(false);
          } else if (data.action === 'started') {
            // Set active call if it's new
            setActiveCall(data.call);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected from header');
      
      // Try to reconnect after a delay
      setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        // Re-run the effect to create a new WebSocket connection
      }, 3000);
    };
    
    return () => {
      socket.close();
    };
  }, []);
  
  // Check for active calls
  useEffect(() => {
    const fetchActiveCalls = async () => {
      try {
        const response = await fetch('/api/calls/active');
        const calls = await response.json();
        
        if (calls && calls.length > 0) {
          setActiveCall(calls[0]);
        } else {
          setActiveCall(null);
        }
      } catch (error) {
        console.error('Error fetching active calls:', error);
      }
    };
    
    fetchActiveCalls();
    
    // Poll for active calls every 5 seconds
    const interval = setInterval(fetchActiveCalls, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // For testing - periodically toggle the speaking state 
  useEffect(() => {
    const toggleSpeaking = () => {
      setIsSpeaking(prevState => !prevState);
    };
    
    // Toggle speaking state every 15 seconds to demonstrate the visualization
    const interval = setInterval(toggleSpeaking, 15000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>      
      {/* Header content */}
      <header className="bg-[#1A2736] px-6 py-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <span className="material-icons text-[#33C3BD] mr-3">phone_in_talk</span>
            <h1 className="text-xl font-semibold text-white">AI Agent Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <AgentSelector />
            
            <div 
              className={`flex items-center px-3 py-1 rounded-full bg-${statusColor}-800 text-${statusColor}-100`}
            >
              <span className={`inline-block w-2 h-2 rounded-full bg-${statusColor}-400 mr-2`}></span>
              <span>{serverStatus.message}</span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
