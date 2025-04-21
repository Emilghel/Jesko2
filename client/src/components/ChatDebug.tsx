import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";


// Demo responses for fallback mode
const demoResponses = [
  "Hello! How can I assist you today with WarmLeadNetwork?",
  "I'm here to help you understand our AI voice communication platform. What would you like to know?",
  "Our platform provides intelligent, secure, and adaptive conversational experiences with robust voice recognition.",
  "WarmLeadNetwork helps you automate customer interactions, schedule appointments, and handle support tickets 24/7.",
  "You can customize your AI agent's personality, voice, and behavior to match your brand's identity.",
  "The platform integrates seamlessly with your existing systems through our API and webhooks.",
  "Would you like me to explain more about our pricing plans or perhaps schedule a demo?",
  "That's a great question. Our technology uses advanced neural networks for natural-sounding conversations.",
  "I understand your concerns. Security and privacy are our top priorities, and all data is encrypted end-to-end.",
  "I'd be happy to explain that in more detail or answer any other questions you might have."
];

export function ChatDebug() {
  const [message, setMessage] = useState('Hello AI assistant!');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestLog, setRequestLog] = useState('');
  const [useFallback, setUseFallback] = useState(true);

  const sendMessage = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const payload = {
        message: message.trim(),
        conversation: []
      };

      setRequestLog(JSON.stringify(payload, null, 2));

      if (useFallback) {
        // Use fallback demo responses
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
        const randomIndex = Math.floor(Math.random() * demoResponses.length);
        setResponse(demoResponses[randomIndex]);
      } else {
        // Use actual API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get AI response');
        }

        setResponse(data.response);
      }
    } catch (err: any) {
      setError(err.message || 'Error sending message');
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Chat API Debug</CardTitle>
        <CardDescription>Test the chat API directly</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-100 rounded-md dark:bg-gray-800">
            <div className="flex items-center space-x-2">
              <div className="relative inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#33C3BD] bg-gray-600 data-[state=checked]:bg-[#33C3BD]"
                  onClick={() => setUseFallback(!useFallback)}>
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${useFallback ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span id="fallback-mode" className="text-sm font-medium">Use Demo Mode</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {useFallback ? 'Using simulated responses' : 'Using OpenAI API'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Your message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="h-24"
            />
          </div>

          {requestLog && (
            <div>
              <label className="block text-sm font-medium mb-1">Request payload</label>
              <pre className="bg-gray-100 p-3 rounded text-xs whitespace-pre-wrap overflow-auto max-h-36 dark:bg-gray-800">
                {requestLog}
              </pre>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded text-red-800 dark:bg-red-900 dark:text-red-200">
              Error: {error}
            </div>
          )}

          {response && (
            <div>
              <label className="block text-sm font-medium mb-1">AI Response</label>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded dark:bg-blue-900 dark:border-blue-800">
                {response}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={sendMessage} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </Button>
      </CardFooter>
    </Card>
  );
}