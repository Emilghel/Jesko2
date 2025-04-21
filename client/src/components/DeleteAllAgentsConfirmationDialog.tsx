import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

export interface DeleteAllAgentsConfirmationDialogProps {
  isOpen: boolean;
  isDeleting?: boolean;
  agentCount?: number;
  title?: string;
  description?: string;
  onClose: () => void;
  onConfirm: (useForce?: boolean) => Promise<void>;
}

export function DeleteAllAgentsConfirmationDialog({
  isOpen,
  title,
  description,
  onClose,
  onConfirm,
}: DeleteAllAgentsConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [useForce, setUseForce] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const isConfirmEnabled = confirmText === "DELETE ALL";

  const handleConfirm = async () => {
    if (!isConfirmEnabled) return;
    
    setIsDeleting(true);
    try {
      await onConfirm(useForce);
    } catch (error) {
      console.error("Error deleting all agents:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setConfirmText("");
      setUseForce(false);
      setIsDeleting(false);
    }
  }, [isOpen]);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {description}
          </AlertDialogDescription>
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              WARNING
            </div>
            <p className="mt-1">
              This action will delete all of your AI agents and cannot be undone.
              Any active calls or scheduled calls will be terminated.
            </p>
          </div>
        </AlertDialogHeader>

        <div className="mt-4 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="use-force" 
              checked={useForce} 
              onCheckedChange={(checked) => setUseForce(checked === true)}
            />
            <Label 
              htmlFor="use-force" 
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Use force delete (removes dependent records first)
            </Label>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            To confirm, type <span className="font-medium">"DELETE ALL"</span> below:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background"
            placeholder='Type "DELETE ALL" to confirm'
            autoFocus
          />
        </div>

        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting All Agents...
              </>
            ) : (
              "Delete All Agents"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}