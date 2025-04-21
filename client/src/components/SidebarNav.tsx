import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Home, 
  LayoutDashboard, 
  Mic, 
  Image, 
  Box, 
  Users, 
  ShieldCheck, 
  LogOut,
  DollarSign,
  UserCircle2,
  Share2,
  Video,
  Scissors,
  Bot,
  UserPlus,
  ShieldAlert
} from "lucide-react";
import CoinBalance from "@/components/CoinBalance";
import MemberCounter from "@/components/MemberCounter";
import { TokenRestoreButton, TokenStatusButton } from "@/components/TokenRestoreButton";

// Define the navigation item type
interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  showAlways: boolean;
  special?: boolean;
  isGreen?: boolean;
  isNew?: boolean;
  showWhen?: 'authenticated' | 'admin' | 'partner';
}

export default function SidebarNav() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Don't show the sidebar on these pages
  if (location === "/auth" || location === "/partners/login") {
    return null;
  }

  // Define all navigation items
  const navItems: NavItem[] = [
    { 
      path: "/home", 
      label: "Home", 
      icon: <Home className="h-5 w-5" />,
      showAlways: true
    },
    { 
      path: "/dashboard", 
      label: "AI Agent", 
      icon: <LayoutDashboard className="h-5 w-5" />,
      showAlways: true
    },
    { 
      path: "/ai-clip-studio", 
      label: "AI Clip Studio", 
      icon: <Scissors className="h-5 w-5" />,
      showAlways: true,
      special: true
    },
    { 
      path: "/ai-video-magic", 
      label: "AI Image to Video", 
      icon: <Video className="h-5 w-5" />,
      showAlways: true,
      special: true
    },
    { 
      path: "/stock-videos", 
      label: "Free Stock Videos", 
      icon: <Video className="h-5 w-5" />,
      showAlways: false,
      showWhen: 'admin',
      isGreen: true
    },
    { 
      path: "/own-your-ai", 
      label: "Own Your AI", 
      icon: <UserCircle2 className="h-5 w-5" />,
      showAlways: true
    },

    { 
      path: "/ai-voiceover", 
      label: "AI Voiceover", 
      icon: <Mic className="h-5 w-5" />,
      showAlways: true
    },
    { 
      path: "/ai-image", 
      label: "AI Image", 
      icon: <Image className="h-5 w-5" />,
      showAlways: true
    },
    { 
      path: "/pricing", 
      label: "Pricing", 
      icon: <DollarSign className="h-5 w-5" />,
      showAlways: true
    },
    /* Hiding referrals page from navigation menu
    { 
      path: "/referral-test", 
      label: "Referrals", 
      icon: <Share2 className="h-5 w-5" />,
      showAlways: true
    },
    */
    { 
      path: "/partner/dashboard", 
      label: "Partner Dashboard", 
      icon: <Users className="h-5 w-5" />,
      showWhen: 'partner',
      showAlways: false
    },
    { 
      path: "/admin", 
      label: "Admin Panel", 
      icon: <ShieldCheck className="h-5 w-5" />,
      showWhen: 'admin',
      showAlways: false
    },
    { 
      path: "/admin-panel-1", 
      label: "Admin Panel 1", 
      icon: <ShieldCheck className="h-5 w-5" />,
      showWhen: 'admin',
      showAlways: false,
      isNew: true
    }
  ];

  // Render the sidebar
  return (
    <aside 
      className={`fixed left-0 top-0 z-30 h-screen bg-gradient-to-b from-gray-900 to-gray-950 border-r border-gray-800 shadow-xl transition-all duration-300 ${
        collapsed ? "w-20" : "w-60"
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Logo and toggle */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center justify-center w-full relative">
            {!collapsed && (
              <Link href="/home" className="w-full">
                <div className="text-xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent cursor-pointer mx-auto">
                  Jesko
                </div>
              </Link>
            )}
            {collapsed && (
              <Link href="/home" className="w-full">
                <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent cursor-pointer mx-auto text-center">
                  J
                </div>
              </Link>
            )}
            <button 
              onClick={() => {
                const newCollapsed = !collapsed;
                setCollapsed(newCollapsed);
                
                // Dispatch custom event for the main layout to listen to
                const event = new CustomEvent('sidebar-resize', { detail: { collapsed: newCollapsed } });
                window.dispatchEvent(event);
              }}
              className="p-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors absolute right-0"
            >
            {collapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            )}
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              // Determine if this nav item should be displayed
              let shouldShow = item.showAlways;
              
              // Check role-based visibility
              if (!shouldShow && item.showWhen) {
                if (item.showWhen === 'authenticated' && user) {
                  shouldShow = true;
                } else if (item.showWhen === 'admin' && user?.is_admin) {
                  shouldShow = true;
                } else if (item.showWhen === 'partner' && user?.role === 'partner') {
                  shouldShow = true;
                }
              }
              
              if (!shouldShow) return null;

              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <div 
                    className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all group
                      ${isActive 
                        ? 'text-white bg-gradient-to-r from-[#33C3BD]/20 to-[#0075FF]/20 border border-[#33C3BD]/30 shadow-[0_0_15px_rgba(51,195,189,0.3)]' 
                        : item.special
                          ? 'text-gray-100 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-700/30 shadow-[0_0_10px_rgba(147,51,234,0.2)]'
                          : item.isGreen
                            ? 'text-gray-100 bg-green-900/30 hover:bg-green-800/40 border border-green-700/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                            : item.isNew
                              ? 'text-gray-100 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-700/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-transparent'}`}
                  >
                    <div className={`flex items-center justify-center ${
                      isActive 
                        ? 'text-[#33C3BD]' 
                        : item.special 
                          ? 'text-purple-400'
                          : item.isGreen
                            ? 'text-green-400'
                            : item.isNew
                              ? 'text-blue-400'
                              : 'text-gray-400 group-hover:text-gray-200'}`}
                    >
                      {item.icon}
                      {collapsed && (item.special || item.isNew) && !isActive && (
                        <div className={`absolute -right-1 -top-1 w-2 h-2 ${item.isNew ? 'bg-blue-500' : 'bg-purple-500'} rounded-full`}></div>
                      )}
                    </div>
                    {!collapsed && (
                      <span className={`ml-3 ${
                        isActive 
                          ? 'font-medium' 
                          : item.special 
                            ? 'font-medium text-purple-300'
                            : item.isNew
                              ? 'font-medium text-blue-300'
                              : ''}`}
                      >
                        {item.label}
                        {item.special && !isActive && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple-700/40 text-purple-300 rounded-full">New</span>
                        )}
                        {item.isNew && !isActive && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-blue-700/40 text-blue-300 rounded-full">New</span>
                        )}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[#33C3BD] to-[#0075FF] rounded-r"></div>
                    )}
                    {item.special && !isActive && (
                      <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-500 to-purple-700 rounded-r"></div>
                    )}
                    {item.isGreen && !isActive && (
                      <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-green-500 to-green-700 rounded-r"></div>
                    )}
                    {item.isNew && !isActive && (
                      <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-700 rounded-r"></div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* User Profile and Stats */}
        <div className="p-4 border-t border-gray-800">
          {!collapsed && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <MemberCounter />
                <CoinBalance showLabel={true} iconSize={16} />
              </div>
              {user && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-300 truncate">
                      {user.displayName || user.username}
                      {user.is_admin && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-cyan-900/30 text-cyan-400 rounded-full">Admin</span>
                      )}
                      {user.role === 'partner' && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-900/30 text-green-400 rounded-full">Partner</span>
                      )}
                    </div>
                    <button
                      onClick={() => logout()}
                      className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Admin Tools - Token Restoration */}
                  {user.is_admin && (
                    <div className="flex items-center justify-between mt-1">
                      <TokenRestoreButton size="sm" variant="outline" />
                      <TokenStatusButton size="sm" variant="ghost" />
                    </div>
                  )}
                </div>
              )}
              {!user && (
                <div className="flex items-center justify-between gap-2 mt-2">
                  <Link href="/auth" className="flex-1">
                    <div className="text-center px-2 py-1.5 bg-[#0075FF]/20 hover:bg-[#0075FF]/30 text-[#0075FF] rounded-lg text-sm transition-colors">
                      Login
                    </div>
                  </Link>
                  <Link href="/auth?tab=register" className="flex-1">
                    <div className="text-center px-2 py-1.5 bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 rounded-lg text-sm transition-colors">
                      Register
                    </div>
                  </Link>
                  <Link href="/partner/login" className="flex-1">
                    <div className="text-center px-2 py-1.5 bg-green-900/20 hover:bg-green-900/30 text-green-400 rounded-lg text-sm transition-colors">
                      Partner
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}
          
          {collapsed && user && (
            <div className="flex flex-col items-center gap-3">
              <CoinBalance showLabel={false} iconSize={16} />
              
              {/* Admin Tools - Token Restoration (Collapsed View) */}
              {user.is_admin && (
                <button
                  onClick={() => {
                    const token = localStorage.getItem('auth_token');
                    if (token) {
                      fetch('/api/auth/restore-tokens', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      })
                      .then(response => {
                        if (response.ok) {
                          // Show a simple notification if available
                          if ('Notification' in window) {
                            new Notification('Tokens Restored', {
                              body: 'Auth tokens have been restored from database.'
                            });
                          }
                        }
                      })
                      .catch(err => console.error('Token restore error:', err));
                    }
                  }}
                  className="p-2 rounded-full bg-blue-900/30 text-blue-400 hover:bg-blue-800/40 hover:text-blue-300 transition-colors"
                  title="Restore Auth Tokens"
                >
                  <ShieldAlert className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={() => logout()}
                className="p-2 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {collapsed && !user && (
            <div className="flex flex-col items-center gap-2">
              <Link href="/auth">
                <div className="p-2 rounded-full bg-[#0075FF]/20 hover:bg-[#0075FF]/30 text-[#0075FF] transition-colors">
                  <UserCircle2 className="h-4 w-4" />
                </div>
              </Link>
              <Link href="/auth?tab=register">
                <div className="p-2 rounded-full bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 transition-colors">
                  <UserPlus className="h-4 w-4" />
                </div>
              </Link>
              <Link href="/partner/login">
                <div className="p-2 rounded-full bg-green-900/20 hover:bg-green-900/30 text-green-400 transition-colors">
                  <Users className="h-4 w-4" />
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}