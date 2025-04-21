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
import { Loader2, AlertTriangle } from "lucide-react";

export interface NuclearDeleteConfirmationDialogProps {
  isOpen: boolean;
  isDeleting?: boolean;
  title: string;
  description: string;
  warningMessage?: string;
  agentName?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function NuclearDeleteConfirmationDialog({
  isOpen,
  isDeleting = false,
  title,
  description,
  warningMessage,
  agentName,
  onClose,
  onConfirm,
}: NuclearDeleteConfirmationDialogProps) {
  const [confirmText, setConfirmText] = React.useState("");
  const isConfirmEnabled = agentName ? confirmText === agentName : confirmText === "NUCLEAR DELETE";

  const handleConfirm = async () => {
    if (!isConfirmEnabled) return;
    await onConfirm();
  };

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
            <p className="mt-1">{warningMessage}</p>
          </div>
        </AlertDialogHeader>

        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {agentName ? (
              <>To confirm, type the agent name <span className="font-medium">"{agentName}"</span> below:</>
            ) : (
              <>To confirm, type <span className="font-medium">"NUCLEAR DELETE"</span> below:</>
            )}
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background"
            placeholder={agentName ? `Type "${agentName}" to confirm` : 'Type "NUCLEAR DELETE" to confirm'}
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
                Deleting...
              </>
            ) : (
              "Nuclear Delete Agent"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}