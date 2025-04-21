import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActiveCall } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Loader2, PhoneCall, Clock, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActiveCalls() {
  const { data: activeCalls = [], isLoading, refetch } = useQuery<ActiveCall[]>({
    queryKey: ["/api/calls/active"],
    refetchInterval: 5000,
  });

  const handleEndCall = async (callSid: string) => {
    try {
      await apiRequest("POST", `/api/calls/${callSid}/end`, {});
      refetch(); // Refresh the call data
    } catch (error) {
      console.error("Failed to end call:", error);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(51, 195, 189, 0.6))' }} />
        </div>
      ) : !activeCalls || activeCalls.length === 0 ? (
        <div className="text-center py-12 px-6 rounded-lg" 
             style={{ 
               background: 'rgba(10, 10, 20, 0.5)',
               boxShadow: 'inset 0 0 20px rgba(51, 195, 189, 0.1)'
             }}>
          <PhoneCall className="h-12 w-12 text-cyan-400 mx-auto mb-4 opacity-60"
                 style={{ filter: 'drop-shadow(0 0 10px rgba(51, 195, 189, 0.5))' }} />
          <p className="text-gray-300 text-lg">No active calls</p>
          <p className="text-gray-400 text-sm mt-3 max-w-md mx-auto">
            When calls are active, they will appear here. You can monitor and manage ongoing conversations in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeCalls.map((call: ActiveCall) => (
            <div 
              key={call.callSid} 
              className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-lg bg-gradient-to-r from-gray-800/60 to-gray-900/60 border border-gray-700/50 hover:border-cyan-700/50 transition-all"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="rounded-full bg-green-900/40 p-2">
                    <PhoneCall className="h-5 w-5 text-green-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center">
                    <p className="font-medium text-gray-200">
                      {call.phoneNumber}
                    </p>
                    <Badge variant="outline" className="ml-2 bg-green-950/50 text-green-300 border-green-700/50">
                      {call.status}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-gray-400 mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    {call.duration}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 md:mt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-400 border-red-800/50 hover:text-red-300 hover:bg-red-950/30"
                  onClick={() => handleEndCall(call.callSid)}
                >
                  <PhoneOff className="h-4 w-4 mr-1" />
                  End Call
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}