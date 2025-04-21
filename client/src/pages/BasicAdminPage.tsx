import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export default function BasicAdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    // Simple function to check if user is admin
    async function checkAdmin() {
      try {
        setIsLoading(true);
        
        // Get auth token
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setIsAdmin(false);
          setError("Authentication required");
          return;
        }
        
        // Simple fetch to /api/user
        const response = await fetch('/api/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const userData = await response.json();
        console.log("User data:", userData);
        
        // Check if user is admin
        if (userData && userData.is_admin === true) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          setError("Admin access required");
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
        setIsAdmin(false);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAdmin();
  }, []);
  
  // Simple loading state
  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#111827', 
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px',
            height: '50px',
            margin: '0 auto',
            border: '3px solid rgba(255,255,255,0.3)',
            borderRadius: '50%',
            borderTopColor: '#38bdf8',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '1rem' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  // Access denied state
  if (!isAdmin) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#111827',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '1rem'
      }}>
        <div style={{ 
          maxWidth: '500px',
          backgroundColor: '#1f2937',
          borderRadius: '0.5rem',
          padding: '2rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '50px',
              height: '50px',
              margin: '0 auto',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Access Restricted</h2>
            <p style={{ color: '#9ca3af' }}>{error || 'You do not have permission to access this page.'}</p>
          </div>
          
          <p style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            This area is restricted to administrators only. Please log in with an admin account or contact your system administrator for access.
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button 
              onClick={() => navigate('/')}
              style={{
                backgroundColor: '#4b5563',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Return Home
            </button>
            <button 
              onClick={() => navigate('/auth')}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Admin panel content - very basic with inline styles for reliability
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#111827',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          Basic Admin Panel
        </h1>
        <p style={{ marginBottom: '2rem', color: '#9ca3af' }}>
          This is a simplified admin panel for emergency access.
        </p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ 
            backgroundColor: '#1f2937', 
            borderRadius: '0.5rem',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Users</h2>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38bdf8', marginBottom: '0.5rem' }}>-</p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Total registered users</p>
          </div>
          
          <div style={{ 
            backgroundColor: '#1f2937', 
            borderRadius: '0.5rem',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Partners</h2>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>-</p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Total partner accounts</p>
          </div>
          
          <div style={{ 
            backgroundColor: '#1f2937', 
            borderRadius: '0.5rem',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Withdrawals</h2>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '0.5rem' }}>-</p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Pending withdrawal requests</p>
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: '#1f2937', 
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              border: 'none',
              cursor: 'pointer'
            }}>
              Manage Users
            </button>
            <button style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              border: 'none',
              cursor: 'pointer'
            }}>
              Manage Partners
            </button>
            <button style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              border: 'none',
              cursor: 'pointer'
            }}>
              System Settings
            </button>
            <a 
              href="/admin-direct"
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                backgroundColor: '#ec4899',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                border: 'none',
                cursor: 'pointer',
                marginRight: '0.5rem',
                textDecoration: 'none',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                fontWeight: 'inherit'
              }}
            >
              Direct Admin Panel
            </a>
            <button 
              onClick={() => navigate('/')}
              style={{
                backgroundColor: '#4b5563',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
        
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Note: This is a basic admin panel for emergency access. For the full admin panel features, please ensure all system components are working correctly.
        </p>
      </div>
    </div>
  );
}