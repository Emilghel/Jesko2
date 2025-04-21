import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"
import { useLocation } from "wouter"

export default function AccessDenied() {
  const [, navigate] = useLocation()
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Lock className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-center text-white">Access Restricted</CardTitle>
          <CardDescription className="text-center text-gray-400">
            You don't have permission to access the admin panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-300 mb-6">
            This area is restricted to administrators only. Please log in with an admin account or 
            contact your system administrator for access.
          </p>
          
          <div className="flex justify-center">
            <Button onClick={() => navigate("/")}>
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}