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
import { Loader2, AlertTriangle, Shield, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  isDeleting: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: (useForce?: boolean) => Promise<void>;
  forceOption?: boolean;
  forceDescription?: string;
}

export function DeleteConfirmationDialog({
  isOpen,
  isDeleting,
  title,
  description,
  onClose,
  onConfirm,
  forceOption = true, // Changed default to true since we now have enhanced deletion
  forceDescription = "Use aggressive deletion (automatically remove dependent records)",
}: DeleteConfirmationDialogProps) {
  const [useForce, setUseForce] = React.useState(true); // Default to true for better success rate
  const [activeTab, setActiveTab] = React.useState("info");

  // Reset useForce and tab when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setUseForce(true);
      setActiveTab("info");
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    try {
      console.log(`Initiating deletion with force=${useForce}`);
      await onConfirm(useForce);
    } catch (error) {
      console.error("Error during deletion confirmation:", error);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
          
          <div className="mt-4 bg-muted/50 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium flex items-center">
                <Shield className="h-4 w-4 mr-1 text-primary" /> Enhanced Deletion System
              </h4>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="info" className="text-xs">Information</TabsTrigger>
                <TabsTrigger value="technical" className="text-xs">Technical Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="mt-2 text-xs text-muted-foreground">
                <p>The enhanced deletion system will:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>First attempt standard deletion</li>
                  <li>If that fails, automatically try aggressive deletion</li>
                  <li>If all else fails, offer nuclear deletion option</li>
                </ul>
              </TabsContent>
              
              <TabsContent value="technical" className="mt-2 text-xs text-muted-foreground">
                <p>Technical deletion process:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Standard: Basic SQL DELETE operation</li>
                  <li>Aggressive: CASCADE DELETE with foreign key handling</li>
                  <li>Nuclear: Direct database procedure execution</li>
                </ol>
              </TabsContent>
            </Tabs>
          </div>
          
          {forceOption && (
            <div className="mt-4 flex items-center space-x-2">
              <Checkbox 
                id="use-force" 
                checked={useForce} 
                onCheckedChange={(checked) => setUseForce(checked === true)}
                disabled={isDeleting}
              />
              <Label 
                htmlFor="use-force" 
                className={`text-sm font-medium leading-none cursor-pointer ${isDeleting ? 'opacity-50' : ''}`}
              >
                {forceDescription}
              </Label>
            </div>
          )}
          
          <Separator className="my-3" />
          
          <div className="text-xs text-muted-foreground">
            <p>If deletion continues to fail, a nuclear deletion option will automatically be offered as a last resort.</p>
          </div>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                {useForce ? "Delete Aggressively" : "Delete Standard"}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}