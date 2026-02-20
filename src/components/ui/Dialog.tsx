'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export function DialogContent({
  children,
  title,
  description,
  className = '',
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/40 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={`fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto w-full max-w-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
            <X size={16} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
