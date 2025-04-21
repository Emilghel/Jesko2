import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, MinusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Directly use static directory path which is properly included in deployment
const bubbleGifPath = '/static/bubble.gif';
export function FloatingChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Array<{type: 'user' | 'ai', text: string, id?: number}>>(() => {
    // Load messages from localStorage on component mount
    const savedMessages = localStorage.getItem('wln-chat-messages');
    if (savedMessages) {
      try {
        return JSON.parse(savedMessages);
      } catch (e) {
        console.error('Error parsing saved messages', e);
      }
    }
    // Default initial message
    return [{ type: 'ai', text: 'Hello! How can I help you today?', id: Date.now() }];
  });
  const [inputValue, setInputValue] = useState('');
  
  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };
  
  const toggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };
  
  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Start voice recognition here in a real implementation
    } else {
      // Stop voice recognition
    }
  };
  
  const clearChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([{ type: 'ai', text: 'Chat history cleared. How can I help you today?', id: Date.now() }]);
      localStorage.removeItem('wln-chat-messages');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      // Add user message
      const userMessage = inputValue.trim();
      setMessages(prev => [...prev, { type: 'user', text: userMessage, id: Date.now() }]);
      setInputValue('');
      
      // To avoid race conditions, create a temporary processing message
      const processingMessageId = Date.now();
      setMessages(prev => [...prev, { 
        type: 'ai', 
        text: "Processing your message...",
        id: processingMessageId
      }]);
      
      try {
        // Call backend API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: userMessage,
            conversation: messages
          }),
        });
        
        // Handle different response status codes
        if (!response.ok) {
          const errorData = await response.json();
          
          let errorMessage = "Sorry, I'm having trouble connecting to my brain right now. Please try again later.";
          
          // Handle specific error types
          if (response.status === 401) {
            errorMessage = "My connection to OpenAI seems to be having authentication issues. Please contact support to update my API key.";
          } else if (response.status === 429) {
            errorMessage = "I've been getting a lot of requests lately and have reached my limit. Please try again in a few minutes.";
          } else if (errorData?.message) {
            errorMessage = `Error: ${errorData.message}`;
          }
          
          // Replace the processing message with the specific error message
          setMessages(prev => 
            prev.map(msg => 
              msg.id === processingMessageId 
                ? { type: 'ai', text: errorMessage, id: processingMessageId } 
                : msg
            )
          );
          return;
        }
        
        const data = await response.json();
        
        // Replace the processing message with the actual response
        setMessages(prev => 
          prev.map(msg => 
            msg.id === processingMessageId 
              ? { type: 'ai', text: data.response, id: processingMessageId } 
              : msg
          )
        );
      } catch (error) {
        console.error("Error getting AI response:", error);
        
        // Replace the processing message with an error message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === processingMessageId 
              ? { type: 'ai', text: "Sorry, I'm having trouble connecting to my brain right now. Please try again later.", id: processingMessageId } 
              : msg
          )
        );
      }
    }
  };
  
  // Auto-scroll to bottom when messages change
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Save messages to localStorage when they change
  useEffect(() => {
    // Only save non-processing messages
    const messagesForSaving = messages.filter(msg => msg.text !== "Processing your message...");
    localStorage.setItem('wln-chat-messages', JSON.stringify(messagesForSaving));
    scrollToBottom();
  }, [messages]);
  
  return (
    <>
      {/* Floating button */}
      <div 
        className="fixed bottom-6 right-6 z-50 cursor-pointer"
        onClick={toggleOpen}
      >
        <div className="relative">
          {!isOpen && (
            <div className="absolute -top-12 right-0 bg-[#141B29] text-white text-sm py-2 px-4 rounded-full shadow-lg">
              Ask me anything!
            </div>
          )}
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
            <img src={bubbleGifPath} alt="AI Assistant" className="w-14 h-14 rounded-full object-cover" />
          </div>
        </div>
      </div>
      
      {/* Chat window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl bg-[#141B29] border border-[#1E293B] overflow-hidden transition-all duration-300 ${isMinimized ? 'h-14' : 'h-[480px]'}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#33C3BD]/20 to-[#0075FF]/20 p-3 flex items-center justify-between border-b border-[#1E293B]">
            <div className="flex items-center">
              <img src={bubbleGifPath} alt="AI Assistant" className="w-8 h-8 rounded-full mr-3" />
              <h3 className="text-white font-medium">WarmLeadNetwork AI</h3>
            </div>
            <div className="flex">
              <Button variant="ghost" size="icon" onClick={clearChat} className="text-gray-400 hover:text-white" title="Clear chat history">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleMinimize} className="text-gray-400 hover:text-white" title="Minimize">
                <MinusCircle className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleOpen} className="text-gray-400 hover:text-white" title="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {!isMinimized && (
            <>
              {/* Messages area */}
              <div className="p-4 h-[350px] overflow-y-auto flex flex-col space-y-4 bg-[#0A0F16]/50">
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-[#0075FF] text-white' 
                          : 'bg-[#1E293B] text-gray-200'
                      }`}
                    >
                      {message.text === "Processing your message..." ? (
                        <div className="flex items-center">
                          <span>Processing</span>
                          <span className="ml-1 inline-flex">
                            <span className="animate-bounce mx-[1px] h-1 w-1 bg-gray-400 rounded-full"></span>
                            <span className="animate-bounce mx-[1px] h-1 w-1 bg-gray-400 rounded-full animation-delay-200"></span>
                            <span className="animate-bounce mx-[1px] h-1 w-1 bg-gray-400 rounded-full animation-delay-400"></span>
                          </span>
                        </div>
                      ) : (
                        message.text
                      )}
                    </div>
                  </div>
                ))}
                {/* Empty div at the end for auto-scrolling */}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input area */}
              <div className="p-3 border-t border-[#1E293B]">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <Button 
                    type="button"
                    onClick={toggleListening} 
                    size="icon" 
                    className={`rounded-full shrink-0 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-[#33C3BD] hover:bg-[#33C3BD]/90'}`}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e as any);
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 bg-[#0A0F16] text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#33C3BD]/50"
                  />
                  
                  <Button 
                    type="submit" 
                    size="sm" 
                    className="bg-gradient-to-r from-[#33C3BD] to-[#0075FF] hover:opacity-90 transition-opacity rounded-full px-4"
                  >
                    Send
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
} "Fix: Update bubbleGifPath to resolve Render build issue"
