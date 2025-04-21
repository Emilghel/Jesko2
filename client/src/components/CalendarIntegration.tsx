import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { getGoogleOAuthUrl, useCalendarIntegrations, useDeleteCalendarIntegration, useUpcomingAppointments } from '@/hooks/use-calendar';
import { CalendarIcon, CalendarPlus, Calendar, ExternalLink, Trash2, RefreshCw, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Loader2 } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CalendarIntegration() {
  const { toast } = useToast();
  const [integrationToDelete, setIntegrationToDelete] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  // Get URL params to detect success/error from OAuth redirect
  const searchParams = new URLSearchParams(window.location.search);
  const oauthSuccess = searchParams.get('success');
  const oauthError = searchParams.get('error');

  // Hooks for calendar integration
  const { data: integrations, isLoading: integrationsLoading, isError: integrationsError } = useCalendarIntegrations();
  const { data: appointments, isLoading: appointmentsLoading } = useUpcomingAppointments();
  const deleteIntegration = useDeleteCalendarIntegration();

  // Show toast for OAuth result
  useEffect(() => {
    if (oauthSuccess) {
      toast({
        title: 'Calendar Connected',
        description: 'Your Google Calendar has been successfully connected.',
        variant: 'default',
      });
      
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthError) {
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect to Google Calendar. Please try again.',
        variant: 'destructive',
      });
      
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [oauthSuccess, oauthError, toast]);

  const handleConnectCalendar = () => {
    setConnectLoading(true);
    try {
      // Get the Google OAuth URL and redirect the user
      const googleAuthUrl = getGoogleOAuthUrl();
      // Redirect the user to Google's authorization page
      window.location.href = googleAuthUrl;
    } catch (error) {
      console.error('Error initiating calendar connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize calendar connection. Please try again.',
        variant: 'destructive',
      });
      setConnectLoading(false);
    }
    // Note: We don't set connectLoading to false here because we're redirecting away from the page
  };

  const handleDeleteIntegration = (integrationId: number) => {
    setIntegrationToDelete(integrationId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteIntegration = async () => {
    if (integrationToDelete === null) return;
    
    try {
      await deleteIntegration.mutateAsync(integrationToDelete);
      toast({
        title: 'Integration Removed',
        description: 'Calendar integration has been successfully removed.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove calendar integration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setShowDeleteDialog(false);
      setIntegrationToDelete(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Calendar Integration</h2>
      <p className="text-muted-foreground">
        Connect your calendar to allow AI agents to schedule appointments during calls.
      </p>
      
      {/* Connection status and connect button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar Connection
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to enable AI agents to schedule appointments on your behalf.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {oauthSuccess && (
            <Alert className="mb-4">
              <Check className="h-4 w-4" />
              <AlertTitle>Connection Successful</AlertTitle>
              <AlertDescription>
                Your Google Calendar has been successfully connected.
              </AlertDescription>
            </Alert>
          )}
          
          {oauthError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Failed</AlertTitle>
              <AlertDescription>
                We couldn't connect to your Google Calendar. Please try again.
              </AlertDescription>
            </Alert>
          )}
          
          {integrationsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : integrationsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load calendar integrations. Please refresh the page.
              </AlertDescription>
            </Alert>
          ) : integrations && integrations.length > 0 ? (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between p-4 border rounded-md">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{integration.display_name}</div>
                      <div className="text-sm text-muted-foreground">{integration.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={integration.is_active ? "default" : "secondary"}>
                          {integration.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Connected: {formatDate(integration.created_at)}
                        </span>
                        {integration.last_synced && (
                          <span className="text-xs text-muted-foreground">
                            Last sync: {formatDate(integration.last_synced)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteIntegration(integration.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No calendar connected</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-2 mb-4">
                Connect your Google Calendar to enable AI agents to schedule appointments during calls.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleConnectCalendar}
            disabled={connectLoading}
            className="w-full"
          >
            {connectLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Connect Google Calendar
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Upcoming appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Upcoming Appointments
          </CardTitle>
          <CardDescription>
            View appointments scheduled by your AI agents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointmentsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : appointments && appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="p-4 border rounded-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{appointment.title}</h4>
                      {appointment.description && (
                        <p className="text-sm text-muted-foreground mt-1">{appointment.description}</p>
                      )}
                    </div>
                    <Badge variant={
                      appointment.status === 'scheduled' ? 'default' :
                      appointment.status === 'completed' ? 'success' :
                      appointment.status === 'cancelled' ? 'destructive' :
                      'secondary'
                    }>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Start:</span>{' '}
                      {format(new Date(appointment.start_time), 'MMM d, yyyy h:mm a')}
                    </div>
                    <div>
                      <span className="text-muted-foreground">End:</span>{' '}
                      {format(new Date(appointment.end_time), 'MMM d, yyyy h:mm a')}
                    </div>
                    
                    {appointment.location && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Location:</span>{' '}
                        {appointment.location}
                      </div>
                    )}
                    
                    {appointment.meeting_link && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Meeting Link:</span>{' '}
                        <a href={appointment.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center">
                          Join Meeting <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    )}
                    
                    {appointment.attendees && appointment.attendees.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Attendees:</span>{' '}
                        {appointment.attendees.map(a => a.email).join(', ')}
                      </div>
                    )}
                    
                    {appointment.notes && (
                      <div className="col-span-2 mt-2">
                        <span className="text-muted-foreground block">Notes:</span>
                        <p className="mt-1">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No upcoming appointments</h3>
              <p className="text-sm text-muted-foreground mt-2">
                When your AI agents schedule appointments, they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Calendar Integration</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this calendar integration? Your AI agents will no longer be able to schedule appointments using this calendar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteIntegration}
              disabled={deleteIntegration.isPending}
            >
              {deleteIntegration.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Integration'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}