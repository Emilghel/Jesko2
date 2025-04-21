import { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Lock, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Function component for the error display
function ErrorDisplay({ error, resetError }: { error: Error | null; resetError: () => void }) {
  const [, navigate] = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <CardTitle className="text-2xl text-center text-white">Something went wrong</CardTitle>
          <CardDescription className="text-center text-gray-400">
            The admin panel encountered an error while loading.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-900/20 border-red-800 mb-6">
            <AlertTitle className="text-red-400">Error details:</AlertTitle>
            <AlertDescription className="text-xs font-mono overflow-auto max-h-40 text-red-300">
              {error?.message || "Unknown error"}
              {error?.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Stack trace</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-red-300/70 text-[10px]">
                    {error.stack}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-center space-x-4">
            <Button 
              variant="outline" 
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <Button onClick={resetError}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Function component for access denied display
export function AccessDenied({ customMessage }: { customMessage?: string }) {
  const [, navigate] = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Lock className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-center text-white">Access Restricted</CardTitle>
          <CardDescription className="text-center text-gray-400">
            {customMessage || "You don't have permission to access the admin panel."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-300 mb-6">
            This area is restricted to administrators only. Please log in with an admin account or 
            contact your system administrator for access.
          </p>
          
          <div className="flex justify-center">
            <Button onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// The actual error boundary class component
class AdminErrorBoundaryClass extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Admin panel error:", error);
    console.error("Error info:", errorInfo);
  }
  
  public resetError = () => {
    this.setState({ hasError: false, error: null });
  }

  public render() {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

// Export a wrapper component to provide navigation context
export default function AdminErrorBoundary({ children }: Props) {
  return (
    <AdminErrorBoundaryClass>
      {children}
    </AdminErrorBoundaryClass>
  );
}