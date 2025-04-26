import { Switch, Route, Link, useLocation, Redirect } from "wouter";
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import TestCall from "@/pages/TestCall";
import TwilioTest from "@/pages/TwilioTest";
import TwilioDebug from "@/pages/TwilioDebug";
import { TwilioAgentTest } from "@/pages/TwilioAgentTest";
import AuthPage from "@/pages/AuthPage";
import AuthResetPage from "@/pages/AuthResetPage";
import DebugAuth from "@/pages/DebugAuth";
import HomePage from "@/pages/HomePage";
import NotificationDemo from "@/pages/NotificationDemo";
import { MyAgentsPage } from "@/pages/MyAgents";
import SavedAgents from "@/pages/SavedAgents";
import EditAgentPage from "@/pages/EditAgentPage";

import AdminPanel from "@/pages/AdminPanel";
import AdminPanelSimple from "@/pages/AdminPanelSimple";
import AdminPanel1 from "@/pages/AdminPanel1";
import BasicAdminPage from "@/pages/BasicAdminPage";
import AccessDenied from "@/pages/AccessDenied";
import OwnYourAI from "@/pages/OwnYourAI";
import PersonalityPromptsPage from "@/pages/admin/PersonalityPromptsPage";
import PricingPage from "@/pages/PricingPage";
import CheckoutPage from "@/pages/CheckoutPage";
import TokenCheckoutPage from "@/pages/TokenCheckoutPage";
import PaymentVerificationPage from "@/pages/PaymentVerificationPage";
import PaymentSuccessPage from "@/pages/payment-success";
import AudioVisualizationDemo from "@/pages/AudioVisualizationDemo";
import AIVoiceoverPage from "@/pages/AIVoiceoverPage";
import AITokenPricingPage from "@/pages/AITokenPricingPage";
import AIImagePage from "@/pages/AIImagePage";
import AIVideoMagicPage from "@/pages/AIVideoMagicPage";
import AIClipStudioPage from "@/pages/AIClipStudioPage";
import SimpleAIClipStudioPage from "@/pages/SimpleAIClipStudioPage";
import CaptionStylePage from "@/pages/CaptionStylePage";
import SimpleCaptionStylePage from "@/pages/SimpleCaptionStylePage";
import AIAudioTranscriptionPage from "@/pages/AIAudioTranscriptionPage";
import FreeStockVideosPage from "@/pages/FreeStockVideosPage";
import SimpleStockVideosPage from "@/pages/SimpleStockVideosPage";
import CallTestPage from "@/pages/CallTestPage";
import LeadsPage from "@/pages/LeadsPage";
import AdminCoinPage from "@/pages/AdminCoinPage";
import BecomePartnerPage from "@/pages/BecomePartnerPage";
import PartnerDashboardPage from "@/pages/PartnerDashboardPage";
import PartnerLoginPage from "@/pages/PartnerLoginPage";
import PartnerLoginTest from "@/pages/PartnerLoginTest";
import DirectPartnerDashboardAccess from "@/pages/DirectPartnerDashboardAccess";
import ReferralTest from "@/pages/ReferralTest";
import ReferralTestPage from "@/pages/ReferralTestPage";
import FallbackCharacterCreationPage from "@/pages/FallbackCharacterCreationPage";
import DirectRedirect from "@/components/DirectRedirect";
import SimpleCharacterCreation from "@/pages/SimpleCharacterCreation";
import { Settings } from "@/pages/Settings";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PartnerProtectedRoute } from "@/components/PartnerProtectedRoute";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { FloatingChatBubble } from "@/components/FloatingChatBubble";
import { NotificationProvider } from "@/contexts/notification-context";
import { PlanProvider } from "@/contexts/plan-context";
import { LoadingProvider } from "@/contexts/LoadingContext";
import MemberCounter from "@/components/MemberCounter";
import MemberJoinNotification from "@/components/MemberJoinNotification";
import CoinBalance from "@/components/CoinBalance";
import BuyTokensButton from "@/components/BuyTokensButton";
import MainLayout from "@/components/MainLayout";
import AdminDirectButton from "@/components/AdminDirectButton";
import DirectTokensLink from "@/components/DirectTokensLink";

function Navigation() {
  const { user, logout, isPartner } = useAuth();
  const [location] = useLocation();
  const [isPartnerUser, setIsPartnerUser] = useState(false);
  
  // Debug navigation to help troubleshoot routing issues
  useEffect(() => {
    console.log(`🚀 Navigation changed to: ${location}`);
    console.log(`URL search params: ${window.location.search}`);
    
    // No need to handle checkout routes as they have been removed
  }, [location]);
  
  // Determine partner status using multiple checks for reliability
  useEffect(() => {
    // Check various indicators of partner status
    const partnerRole = user?.role === 'partner';
    const partnerFlag = user?.is_partner === true;
    const partnerFunction = isPartner ? isPartner() : false;
    const partnerToken = localStorage.getItem('partnerToken') !== null;
    
    // Partner badge from localStorage (can be pre-set in special login cases)
    const partnerInfoExists = localStorage.getItem('partnerInfo') !== null;
    
    // Check if any partner email convention is being used
    const partnerEmail = user?.email && (
      user.email.endsWith('@partner.com') || 
      user.email.includes('partner') ||
      user.email === 'zach@partner.com' ||
      user.email === 'mulondo@partner.com'
    );
    
    // Debug the complete user object
    console.log("Current user object:", user);
    
    // Set as partner if any of these are true
    const isUserPartner = partnerRole || partnerFlag || partnerFunction || partnerToken || partnerInfoExists || partnerEmail;
    setIsPartnerUser(Boolean(isUserPartner));
    
    // Force partner token if missing but should be a partner
    if (isUserPartner && !partnerToken) {
      console.log("Setting partner token based on detection");
      localStorage.setItem('partnerToken', 'auto_detected_partner_token');
    }
    
    console.log("Partner detection:", {
      partnerRole, partnerFlag, partnerFunction, partnerToken, partnerInfoExists, partnerEmail,
      result: isUserPartner
    });
  }, [user, isPartner]);

  // Only hide navigation on auth and partner login pages
  if (location === "/auth" || location === "/partners/login") {
    return null;
  }

  return (
    <nav className="bg-[#0F172A] p-4 border-b border-[#1E293B]">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/home">
            <span className="text-xl font-bold bg-gradient-to-r from-[#33C3BD] to-[#0075FF] bg-clip-text text-transparent cursor-pointer">
              WarmLeadNetwork AI
            </span>
          </Link>
        </div>
        <div className="flex gap-4 items-center">
          <MemberCounter />
          <div className="w-px h-5 bg-gray-700 mx-1"></div>
          <Link href="/home">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Homepage</span>
          </Link>
          <Link href="/dashboard">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Dashboard</span>
          </Link>

          <Link href="/ai-video-magic">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">AI Video Magic</span>
          </Link>
          {/* Only show stock videos link for admins */}
          {user?.is_admin && (
            <Link href="/stock-videos">
              <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Stock Videos</span>
            </Link>
          )}
          <Link href="/pricing">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Pricing</span>
          </Link>
          
          <Link href="/own-your-ai">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Own Your AI</span>
          </Link>

          {/* Partner Dashboard tab - with comprehensive checks */}
          {(user && isPartnerUser) || localStorage.getItem('partnerToken') ? (
            <Link href="/partner/direct-access">
              <span className="text-green-300 hover:text-green-400 transition-colors px-3 py-1 text-sm cursor-pointer bg-green-900/20 rounded">Partner Dashboard</span>
            </Link>
          ) : (
            // Also provide an always-visible button to make it accessible 
            <Link href="/partner/direct-access">
              <span className="text-gray-300 hover:text-green-400 transition-colors px-3 py-1 text-sm cursor-pointer">Partner Access</span>
            </Link>
          )}
          <Link href="/ai-voiceover">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">AI Voiceover</span>
          </Link>
          <Link href="/ai-image">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">AI Image</span>
          </Link>
          <Link href="/ai-audio-transcription">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">AI Transcription</span>
          </Link>
          <Link href="/saved-agents">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer bg-indigo-900/30 rounded">Saved Agents</span>
          </Link>

          <Link href="/referral-test">
            <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer bg-blue-900/20 rounded-full">Referral Test</span>
          </Link>
          
          {/* Admin link - only visible if user is admin AND not a partner */}
          {user?.is_admin && !isPartnerUser && (
            <Link href="/admin">
              <span className="text-cyan-300 hover:text-cyan-400 transition-colors px-3 py-1 text-sm cursor-pointer bg-cyan-900/30 rounded">Admin Panel</span>
            </Link>
          )}
          
          {/* User is logged in */}
          {user ? (
            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-gray-800/50 rounded-full px-3 py-1.5">
                  <CoinBalance showLabel={true} iconSize={16} />
                </div>
                <Link href="/ai-tokens">
                  <button className="px-3 py-1 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded hover:from-blue-700 hover:to-indigo-700 transition-colors">
                    Buy Credits
                  </button>
                </Link>
              </div>
              {isPartnerUser ? (
                <Link href="/partner/direct-access">
                  <div className="text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
                    {user.displayName || user.username}
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-900/30 text-green-400 rounded-full">Partner</span>
                  </div>
                </Link>
              ) : (
                <div className="text-sm text-gray-300">
                  {user.displayName || user.username}
                  {user.is_admin && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-cyan-900/30 text-cyan-400 rounded-full">Admin</span>
                  )}
                </div>
              )}
              <Link href="/settings">
                <button className="px-3 py-1 text-xs bg-gray-800/60 text-gray-300 rounded hover:bg-gray-700 transition-colors">
                  Settings
                </button>
              </Link>
              <button
                onClick={() => logout()}
                className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth">
                <span className="text-gray-300 hover:text-[#33C3BD] transition-colors px-3 py-1 text-sm cursor-pointer">Login</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/home" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth-reset" component={AuthResetPage} />
        <Route path="/debug-auth" component={DebugAuth} />
        <Route path="/notifications" component={NotificationDemo} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/character-creation-old" component={FallbackCharacterCreationPage} />
        <Route path="/test">
          <ProtectedRoute>
            <TestCall />
          </ProtectedRoute>
        </Route>
        <Route path="/twilio-test">
          <ProtectedRoute>
            <TwilioTest />
          </ProtectedRoute>
        </Route>
        <Route path="/twilio-debug">
          <ProtectedRoute>
            <TwilioDebug />
          </ProtectedRoute>
        </Route>
        <Route path="/twilio-agent-test">
          <ProtectedRoute>
            <TwilioAgentTest />
          </ProtectedRoute>
        </Route>
        <Route path="/call-test">
          <ProtectedRoute>
            <CallTestPage />
          </ProtectedRoute>
        </Route>
        {/* My AI Agents routes */}
        <Route path="/my-agents">
          <ProtectedRoute>
            <MyAgentsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/my-agents/create">
          <ProtectedRoute>
            <MyAgentsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/my-agents/manage">
          <ProtectedRoute>
            <MyAgentsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/my-agents/delete">
          <ProtectedRoute>
            <MyAgentsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/my-agents/call-history">
          <ProtectedRoute>
            <MyAgentsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/my-agents/connect-leads">
          <ProtectedRoute>
            <MyAgentsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/my-agents/phone-settings">
          <ProtectedRoute>
            <MyAgentsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin" component={BasicAdminPage} />
        <Route path="/admin-simple" component={AdminPanelSimple} />
        {/* Handle /admin-emergency and redirect to the HTML page */}
        <Route path="/admin-emergency">
          <Redirect to="/admin-emergency.html" />
        </Route>
        <Route path="/admin-full">
          <AdminProtectedRoute>
            <AdminPanel />
          </AdminProtectedRoute>
        </Route>
        <Route path="/admin/personality-prompts">
          <AdminProtectedRoute>
            <PersonalityPromptsPage />
          </AdminProtectedRoute>
        </Route>
        <Route path="/admin/coins">
          <AdminProtectedRoute>
            <AdminCoinPage />
          </AdminProtectedRoute>
        </Route>
        <Route path="/admin-panel-1">
          <AdminProtectedRoute>
            <AdminPanel1 />
          </AdminProtectedRoute>
        </Route>
        <Route path="/own-your-ai" component={OwnYourAI} />
        <Route path="/pricing" component={PricingPage} />
        {/* Checkout routes */}
        <Route path="/checkout">
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        </Route>
        <Route path="/token-checkout">
          <ProtectedRoute>
            <TokenCheckoutPage />
          </ProtectedRoute>
        </Route>
        <Route path="/payment-success" component={PaymentSuccessPage} />
        <Route path="/payment/verify/:paymentId">
          <ProtectedRoute>
            <PaymentVerificationPage />
          </ProtectedRoute>
        </Route>
        <Route path="/payment/verify">
          <ProtectedRoute>
            <PaymentVerificationPage />
          </ProtectedRoute>
        </Route>
        <Route path="/audio-visualization" component={AudioVisualizationDemo} />
        <Route path="/ai-voiceover" component={AIVoiceoverPage} />
        <Route path="/ai-image" component={AIImagePage} />
        <Route path="/ai-video-magic" component={AIVideoMagicPage} />
        <Route path="/free-stock-videos">
          <AdminProtectedRoute>
            <SimpleStockVideosPage />
          </AdminProtectedRoute>
        </Route>
        <Route path="/stock-videos">
          <AdminProtectedRoute>
            <SimpleStockVideosPage />
          </AdminProtectedRoute>
        </Route>
        <Route path="/free-stock-videos-complex">
          <AdminProtectedRoute>
            <FreeStockVideosPage />
          </AdminProtectedRoute>
        </Route>
        <Route path="/ai-clip-studio" component={SimpleAIClipStudioPage} />
        <Route path="/ai-clip-studio-old" component={AIClipStudioPage} />
        {/* Caption style removed as it's no longer needed */}
        <Route path="/caption-style" component={SimpleAIClipStudioPage} />
        <Route path="/caption-style-old" component={CaptionStylePage} />
        <Route path="/ai-audio-transcription" component={AIAudioTranscriptionPage} />
        <Route path="/ai-tokens" component={AITokenPricingPage} />
        <Route path="/ai-token-pricing" component={AITokenPricingPage} />
        
        {/* Token and subscription checkout routes are now implemented */}
        
        {/* Saved Agents page with simplified deletion */}
        <Route path="/saved-agents">
          <ProtectedRoute>
            <SavedAgents />
          </ProtectedRoute>
        </Route>
        
        {/* Edit Agent page */}
        <Route path="/edit-agent/:id">
          <ProtectedRoute>
            <EditAgentPage />
          </ProtectedRoute>
        </Route>
        
        {/* Settings routes */}
        <Route path="/settings">
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        </Route>
        <Route path="/settings/calendar">
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        </Route>
        <Route path="/settings/profile">
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        </Route>

        {/* Partner routes */}
        <Route path="/partner/apply">
          <ProtectedRoute>
            <BecomePartnerPage />
          </ProtectedRoute>
        </Route>
        {/* Also keep the old path for backward compatibility */}
        <Route path="/partners/apply">
          <ProtectedRoute>
            <BecomePartnerPage />
          </ProtectedRoute>
        </Route>
        <Route path="/partner/login" component={PartnerLoginPage} />
        {/* Also keep the old path for backward compatibility */}
        <Route path="/partners/login" component={PartnerLoginPage} />
        {/* Direct Partner Dashboard without protection - for easier access */}
        <Route path="/partner/dashboard" component={PartnerDashboardPage} />
        
        {/* Direct access page that sets up tokens automatically */}
        <Route path="/partner/direct-access" component={DirectPartnerDashboardAccess} />
        <Route path="/partner/login-test" component={PartnerLoginTest} />
        <Route path="/referral-test" component={ReferralTest} />
        <Route path="/referral-test-page" component={ReferralTestPage} />
        
        {/* Default route - redirect to homepage */}
        <Route path="/">
          <HomePage />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <PlanProvider>
            <LoadingProvider>
              <Router />
              <FloatingChatBubble />
              <MemberJoinNotification />
              <BuyTokensButton />
              <AdminDirectButton />
              <DirectTokensLink />
              <Toaster />
            </LoadingProvider>
          </PlanProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
