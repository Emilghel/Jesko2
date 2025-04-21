import { apiRequest } from "./queryClient";

export const API = {
  // Server endpoints
  restartServer: async () => {
    return apiRequest("POST", "/api/server/restart", {});
  },
  
  // Call management endpoints
  getActiveCalls: async () => {
    const response = await fetch("/api/calls/active");
    return response.json();
  },
  
  endCall: async (callSid: string) => {
    return apiRequest("POST", `/api/calls/${callSid}/end`, {});
  },
  
  initiateCall: async (agentId: number, phoneNumber: string, leadId?: number, twilioPhoneNumber?: string) => {
    console.log('[API] Initiating direct Twilio call with:', { agentId, phoneNumber, leadId, twilioPhoneNumber });
    return apiRequest("POST", "/api/twilio-direct/call", {
      agentId, 
      phoneNumber, 
      leadId,
      twilioPhoneNumber
    });
  },
  
  getTwilioPhoneNumbers: async () => {
    const response = await fetch("/api/twilio/phone-numbers");
    return response.json();
  },
  
  // Configuration endpoints
  getConfig: async () => {
    const response = await fetch("/api/config");
    return response.json();
  },
  
  saveConfig: async (config: any) => {
    return apiRequest("POST", "/api/config", config);
  },
  
  // Logs endpoints
  getLogs: async (level?: string) => {
    const url = level && level !== "all" 
      ? `/api/logs?level=${level}` 
      : "/api/logs";
    
    const response = await fetch(url);
    return response.json();
  },
  
  // Metrics endpoints
  getMetrics: async () => {
    const response = await fetch("/api/metrics");
    return response.json();
  },
  
  // System endpoints
  getSystemResources: async () => {
    const response = await fetch("/api/system/resources");
    return response.json();
  },
  
  // Service status endpoints
  getServiceStatus: async () => {
    const response = await fetch("/api/services/status");
    return response.json();
  },
  
  // ElevenLabs endpoints
  getElevenLabsVoices: async () => {
    const response = await fetch("/api/elevenlabs/voices");
    return response.json();
  }
};
