import { ReactNode, useState, useEffect } from "react";
import SidebarNav from "./SidebarNav";
import AgentsSidebar from "./AgentsSidebar";
import { useLocation } from "wouter";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [contentPadding, setContentPadding] = useState({ left: "pl-60", right: "pr-0" }); // Default paddings
  const [isSidebarPage, setIsSidebarPage] = useState(true);
  const [hasAgentsSidebar, setHasAgentsSidebar] = useState(false);

  // Check for pages that should have sidebars
  useEffect(() => {
    // Pages where left sidebar should not be shown
    const excludedPages = ["/auth", "/partners/login", "/partner/login"];
    const shouldShowSidebar = !excludedPages.includes(location);
    setIsSidebarPage(shouldShowSidebar);
    
    // Pages where the agents sidebar (right sidebar) should be shown
    const hasAgentsSidebar = location.startsWith("/my-agents");
    setHasAgentsSidebar(hasAgentsSidebar);
    
    // Update right padding based on whether we're on a page that shows the agent sidebar
    setContentPadding(prev => ({
      ...prev,
      right: hasAgentsSidebar ? "pr-60" : "pr-0" // Default to expanded
    }));
  }, [location]);

  // Listen for left sidebar collapse/expand events
  useEffect(() => {
    const handleSidebarResize = (e: CustomEvent) => {
      const isCollapsed = e.detail.collapsed;
      setContentPadding(prev => ({
        ...prev,
        left: isCollapsed ? "pl-20" : "pl-60"
      }));
    };

    window.addEventListener("sidebar-resize" as any, handleSidebarResize);
    return () => {
      window.removeEventListener("sidebar-resize" as any, handleSidebarResize);
    };
  }, []);

  // Listen for right sidebar (agent sidebar) collapse/expand events
  useEffect(() => {
    const handleAgentsSidebarResize = (e: CustomEvent) => {
      const isCollapsed = e.detail.collapsed;
      setContentPadding(prev => ({
        ...prev,
        right: isCollapsed ? "pr-16" : "pr-60"
      }));
    };

    window.addEventListener("agents-sidebar-resize" as any, handleAgentsSidebarResize);
    return () => {
      window.removeEventListener("agents-sidebar-resize" as any, handleAgentsSidebarResize);
    };
  }, []);

  if (!isSidebarPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <SidebarNav />
      <div className={`flex-1 overflow-auto transition-all duration-300 ${contentPadding.left} ${contentPadding.right}`}>
        {children}
      </div>
      {hasAgentsSidebar && <AgentsSidebar />}
    </div>
  );
}