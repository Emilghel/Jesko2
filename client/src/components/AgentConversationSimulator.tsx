/**
 * Agent Conversation Simulator Component
 * 
 * This component provides a conversation interface to test AI agents
 * before deploying them to call real leads.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: Date;
}

export function AgentConversationSimulator() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: inputValue,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate agent thinking/processing
    setTimeout(() => {
      // Add agent response (in a real implementation, this would come from the AI agent API)
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        sender: "agent",
        text: "Thank you for reaching out! I'd be happy to tell you more about our services. Is there something specific you'd like to know about our offerings?",
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, agentMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const playAudio = () => {
    // In a real implementation, this would trigger text-to-speech with the agent's voice
    console.log("Playing audio for the latest agent message");
    // Here you would call the actual TTS API with the last agent message
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Start a conversation with the AI Sales Agent</CardTitle>
        <CardDescription>
          This feature allows you to test your AI agent's responses before deploying it to call real leads.
        </CardDescription>
      </CardHeader>
      
      {/* Video container with circular mask */}
      <div className="relative w-32 h-32 mx-auto mb-4 overflow-hidden rounded-full">
        <div className="absolute inset-0 flex items-center justify-center bg-black rounded-full">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ objectPosition: "center" }}
          >
            <source 
              src="https://video.wixstatic.com/video/ee3656_ba3a2394c3cc4a4c9a2de7ddbadd043f/1080p/mp4/file.mp4" 
              type="video/mp4" 
            />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      <CardContent>
        <ScrollArea className="h-[300px] border rounded-md p-4 mb-4">
          <div className="flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>Type a message below to see how your agent will respond</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex gap-2 max-w-[80%] ${
                    message.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    {message.sender === "agent" ? (
                      <AvatarImage src="/agents/avatar.png" />
                    ) : null}
                    <AvatarFallback>
                      {message.sender === "agent" ? "AI" : "You"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    }`}
                  >
                    <p>{message.text}</p>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-3 py-2 bg-secondary">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:150ms]"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:300ms]"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping}>
            Send
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={playAudio}
            disabled={messages.length === 0 || !messages.some(m => m.sender === "agent")}
            title="Play audio response"
          >
            <Play className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Type a message below to see how your agent will respond, and click the "Play audio" button to hear its voice.
        </p>
      </CardContent>
    </Card>
  );
}