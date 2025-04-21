import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Trash, AlertCircle } from 'lucide-react';
import { emergencyDeleteAgent, persistentEmergencyDeleteAgent } from '@/lib/emergency-agent-delete';
import { useToast } from '@/hooks/use-toast';

interface EmergencyDeleteButtonProps {
  agentId: number;
  agentName?: string;
  onSuccess?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  isDuplicate?: boolean;
}

/**
 * EmergencyDeleteButton - A specialized button for emergency deletion
 * of agents that cannot be deleted through normal means
 */
export function EmergencyDeleteButton({
  agentId,
  agentName = 'this agent',
  onSuccess,
  variant = 'destructive',
  size = 'default',
  className = '',
  isDuplicate = false,
}: EmergencyDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [persistentMode, setPersistentMode] = useState(false);
  const { toast } = useToast();

  const handleEmergencyDelete = async () => {
    setLoading(true);

    try {
      // Use persistent delete if flagged as duplicate or if persistent mode is enabled
      const success = isDuplicate || persistentMode
        ? await persistentEmergencyDeleteAgent(agentId, 5) // More retries for duplicates
        : await emergencyDeleteAgent(agentId);

      if (success) {
        setOpen(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Show error message if the delete failed
        toast({
          title: "Delete Failed",
          description: "Could not delete the agent. Try enabling persistent mode.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in emergency agent deletion:", error);
      toast({
        title: "Delete Error",
        description: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {isDuplicate ? (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            Fix Duplicate
          </>
        ) : (
          <>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Emergency Delete
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Emergency Delete Confirmation
            </DialogTitle>
            <DialogDescription>
              This will use direct database operations to permanently delete{' '}
              <span className="font-semibold">{agentName}</span>.
              {isDuplicate && (
                <p className="mt-2 text-destructive">
                  This appears to be a duplicate agent. This operation will attempt to fix the duplication issue.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 text-sm">
            <p className="font-semibold">Warning: This is an emergency operation</p>
            <p className="mt-1">This bypasses normal deletion channels and directly modifies the database. Use only when standard deletion fails.</p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="persistent-mode"
              checked={persistentMode}
              onChange={() => setPersistentMode(!persistentMode)}
              className="rounded border-gray-300"
            />
            <label htmlFor="persistent-mode" className="text-sm text-gray-700">
              Enable persistent mode (multiple retries with different methods)
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleEmergencyDelete} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4" />
                  <span>Emergency Delete</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}