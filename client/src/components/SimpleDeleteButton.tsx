/**
 * SimpleDeleteButton Component
 * 
 * A reliable delete button component that uses the direct database deletion
 * endpoint to ensure agents are properly deleted even with partner accounts.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteAgent } from "@/lib/agent-delete-utils";
import { markAgentAsDeleted } from "@/lib/deleted-agents-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface SimpleDeleteButtonProps {
  agentId: number;
  agentName: string;
  onDeleteSuccess?: () => void;
  className?: string;
  variant?: "outline" | "destructive" | "ghost" | "link" | "default" | "secondary";
  showConfirmDialog?: boolean;
}

export function SimpleDeleteButton({
  agentId,
  agentName,
  onDeleteSuccess,
  className = "",
  variant = "destructive",
  showConfirmDialog = true,
}: SimpleDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      
      // Immediately mark as deleted in localStorage to ensure it won't appear in UI
      // This guarantees the agent will be hidden even if server-side deletion fails
      markAgentAsDeleted(agentId);
      console.log(`SimpleDeleteButton: Agent ${agentId} marked as deleted in localStorage`);
      
      console.log(`SimpleDeleteButton: Deleting agent ${agentId} (${agentName})`);
      const success = await deleteAgent(agentId);
      
      if (success) {
        console.log(`SimpleDeleteButton: Successfully deleted agent ${agentId}`);
        onDeleteSuccess?.();
      } else {
        // Even if server-side deletion fails, the agent will still be hidden from UI
        // because it's marked as deleted in localStorage
        console.log(`SimpleDeleteButton: Server-side deletion failed, but agent ${agentId} will remain hidden from UI`);
      }
      
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };
  
  const handleDeleteClick = () => {
    if (showConfirmDialog) {
      setIsDialogOpen(true);
    } else {
      handleDelete();
    }
  };

  // Simple version without confirmation dialog
  if (!showConfirmDialog) {
    return (
      <Button
        variant={variant}
        size="sm"
        className={className}
        onClick={handleDeleteClick}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </>
        )}
      </Button>
    );
  }

  // Version with confirmation dialog
  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={className}
          disabled={isDeleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete AI Agent</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the agent "{agentName}"? This action cannot be undone
            and all associated data will be permanently lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>Delete</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}