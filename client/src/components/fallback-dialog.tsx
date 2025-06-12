
import { useState } from "react";
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

interface FallbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  failedProvider: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FallbackDialog({ 
  open, 
  onOpenChange, 
  failedProvider, 
  onConfirm, 
  onCancel 
}: FallbackDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Analysis Failed</AlertDialogTitle>
          <AlertDialogDescription>
            The {failedProvider} analysis service encountered an error. 
            Would you like to try again using Gemini AI instead?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Try with Gemini
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
