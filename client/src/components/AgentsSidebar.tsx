import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Bot, PlusCircle, Users, Settings, Trash2, Phone, History } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function AgentsSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Only display the sidebar on the My Agents page or related routes
  if (!location.startsWith("/my-agents")) {
    return null;
  }

  const navItems = [
    {
      path: "/my-agents",
      label: "All Agents",
      icon: <Bot className="h-5 w-5" />,
      exact: true
    },
    {
      path: "/my-agents/create",
      label: "Create Agent",
      icon: <PlusCircle className="h-5 w-5" />,
      exact: true
    },
    {
      path: "/my-agents/manage",
      label: "Manage Agents",
      icon: <Settings className="h-5 w-5" />,
      exact: false
    },
    {
      path: "/my-agents/delete",
      label: "Delete Agents",
      icon: <Trash2 className="h-5 w-5" />,
      exact: true
    },
    {
      path: "/my-agents/call-history",
      label: "Call History",
      icon: <History className="h-5 w-5" />,
      exact: true
    },
    {
      path: "/my-agents/connect-leads",
      label: "Connect to Leads",
      icon: <Users className="h-5 w-5" />,
      exact: true
    },
    {
      path: "/my-agents/phone-settings",
      label: "Phone Settings",
      icon: <Phone className="h-5 w-5" />,
      exact: true
    }
  ];

  return (
    <aside 
      className={`fixed right-0 top-0 z-20 h-screen bg-gradient-to-b from-slate-900 to-blue-950 border-l border-blue-800/50 shadow-xl transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Title and toggle */}
        <div className="p-4 flex items-center justify-between border-b border-blue-800/50">
          <div className="flex items-center justify-center w-full relative">
            {!collapsed && (
              <div className="text-xl font-bold text-center bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                My AI Agents
              </div>
            )}
            {collapsed && (
              <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent text-center">
                <Bot className="h-6 w-6 mx-auto" />
              </div>
            )}
            <button 
              onClick={() => {
                const newCollapsed = !collapsed;
                setCollapsed(newCollapsed);
                
                // Dispatch custom event for the main layout to listen to
                const event = new CustomEvent('agents-sidebar-resize', { detail: { collapsed: newCollapsed } });
                window.dispatchEvent(event);
              }}
              className="p-1 rounded-full bg-blue-900/50 hover:bg-blue-800/50 text-gray-400 transition-colors absolute left-0"
            >
            {collapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            )}
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? location === item.path 
                : location.startsWith(item.path);
              
              return (
                <Link key={item.path} href={item.path}>
                  <div 
                    className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all group
                      ${isActive 
                        ? 'text-white bg-gradient-to-r from-blue-600/30 to-cyan-600/20 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-blue-900/30 border border-transparent'}`}
                  >
                    <div className={`flex items-center justify-center ${
                      isActive 
                        ? 'text-blue-400' 
                        : 'text-gray-400 group-hover:text-gray-200'}`}
                    >
                      {item.icon}
                    </div>
                    {!collapsed && (
                      <span className={`ml-3 ${isActive ? 'font-medium' : ''}`}>
                        {item.label}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-l"></div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer with Create Button */}
        <div className="p-4 border-t border-blue-800/50">
          {!collapsed ? (
            <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Agent
            </Button>
          ) : (
            <Button className="w-full aspect-square p-0 flex items-center justify-center bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
              <PlusCircle className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}