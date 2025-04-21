import { useEffect, useState } from 'react';

// Chat message structure
interface ChatMessage {
  id: number;
  sender: 'user' | 'ai';
  text: string;
}

// Static demo conversation
const conversation: ChatMessage[] = [
  {
    id: 1,
    sender: 'user',
    text: 'I need to book a demo for 5 potential clients next week.'
  },
  {
    id: 2,
    sender: 'ai',
    text: 'I\'d be happy to help you schedule a demo for your 5 potential clients next week. What days and times work best for you?'
  },
  {
    id: 3,
    sender: 'user',
    text: 'Tuesday afternoon or Thursday morning would work best.'
  },
  {
    id: 4,
    sender: 'ai',
    text: 'Great! I\'ve checked our availability. We can offer the following slots:\n- Tuesday at 2:00 PM or 4:00 PM\n- Thursday at 9:00 AM or 11:00 AM\nWhich would you prefer to book?'
  },
  {
    id: 5,
    sender: 'user',
    text: 'Let\'s go with Tuesday at 2:00 PM.'
  },
  {
    id: 6,
    sender: 'ai',
    text: 'Perfect! I\'ve scheduled the demo for Tuesday at 2:00 PM. I\'ll send calendar invites to your email. Will you need any specific topics covered in the demo?'
  }
];

// Static typing animation component
function TypingAnimation() {
  return (
    <div className="flex space-x-2 items-center">
      <div className="w-2 h-2 bg-[#33C3BD] rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
      <div className="w-2 h-2 bg-[#33C3BD] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
      <div className="w-2 h-2 bg-[#33C3BD] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
    </div>
  );
}

export default function AnimatedChat() {
  // State to track visible messages
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Animation sequence effect
  useEffect(() => {
    // Reset animation when component mounts
    setVisibleMessages([]);
    
    let currentIndex = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    // Function to display the next message
    const showNextMessage = () => {
      // If we've shown all messages, start over
      if (currentIndex >= conversation.length) {
        setTimeout(() => {
          setVisibleMessages([]);
          currentIndex = 0;
          showNextMessage();
        }, 3000);
        return;
      }
      
      const nextMessage = conversation[currentIndex];
      
      // For AI messages, show typing indicator first
      if (nextMessage.sender === 'ai') {
        setIsTyping(true);
        
        // Calculate typing time based on message length
        const typingTime = Math.min(1500, 500 + Math.floor(nextMessage.text.length / 10) * 200);
        
        // After "typing", show the message
        timeout = setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages(prev => [...prev, nextMessage]);
          currentIndex++;
          
          // Schedule the next message after a delay
          timeout = setTimeout(showNextMessage, 1000);
        }, typingTime);
      } else {
        // For user messages, just show them
        setVisibleMessages(prev => [...prev, nextMessage]);
        currentIndex++;
        
        // Schedule the next message after a delay
        timeout = setTimeout(showNextMessage, 1000);
      }
    };
    
    // Start the animation sequence
    timeout = setTimeout(showNextMessage, 1000);
    
    // Cleanup on unmount
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="bg-[#141B29] rounded-xl border border-[#1E293B] p-6 shadow-lg h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">AI Conversation Demo</h3>
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
      </div>
      
      <div className="space-y-4 h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {/* Render all visible messages */}
        {visibleMessages.map((message) => (
          <div 
            key={message.id} 
            className="flex items-start animate-fadeIn"
          >
            {message.sender === 'user' ? (
              <>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-3 shrink-0">
                  U
                </div>
                <div className="bg-[#1E293B] rounded-lg p-3 max-w-xs">
                  <p className="text-white text-sm">{message.text}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center text-white font-bold mr-3 shrink-0">
                  AI
                </div>
                <div className="bg-[#0A0F16] rounded-lg p-3 max-w-xs">
                  <p className="text-white text-sm whitespace-pre-line">{message.text}</p>
                </div>
              </>
            )}
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start animate-fadeIn">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#33C3BD] to-[#0075FF] flex items-center justify-center text-white font-bold mr-3 shrink-0">
              AI
            </div>
            <div className="bg-[#0A0F16] rounded-lg p-3 max-w-xs">
              <div className="flex space-x-1 items-center justify-center h-5">
                <TypingAnimation />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}