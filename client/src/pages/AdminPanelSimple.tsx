import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import AccessDenied from "./AccessDenied";

export default function AdminPanelSimple() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  
  // Check if user is authorized
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [isLoading, user, navigate]);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-t-4 border-cyan-400 border-solid rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-lg w-full">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Error Loading Admin Panel</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="flex gap-4">
            <button 
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
              onClick={() => navigate("/")}
            >
              Return Home
            </button>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
              onClick={() => setError(null)}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show access denied if not admin
  if (user && !user.is_admin) {
    return <AccessDenied />;
  }
  
  // Only show content if user is admin
  if (user?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>
          <p className="text-gray-400 mb-4">Welcome, {user.displayName || user.username}!</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Users</h2>
              <p className="text-3xl font-bold text-cyan-400">-</p>
              <p className="text-gray-400 text-sm">Total registered users</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Partners</h2>
              <p className="text-3xl font-bold text-green-400">-</p>
              <p className="text-gray-400 text-sm">Total partner accounts</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Withdrawals</h2>
              <p className="text-3xl font-bold text-amber-400">-</p>
              <p className="text-gray-400 text-sm">Pending withdrawal requests</p>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="flex gap-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500">
                Manage Users
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500">
                Manage Partners
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-500">
                System Settings
              </button>
              <button 
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
                onClick={() => navigate("/")}
              >
                Return to Home
              </button>
            </div>
          </div>
          
          <p className="text-gray-500 text-sm">
            Note: This is a simplified admin panel. Visit the full admin panel at 
            <button 
              className="text-cyan-400 ml-1 hover:underline"
              onClick={() => navigate("/admin")}
            >
              /admin
            </button>
          </p>
        </div>
      </div>
    );
  }
  
  // Fallback (should never reach this due to the redirects above)
  return null;
}