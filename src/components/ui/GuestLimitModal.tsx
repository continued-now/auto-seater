'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePurchase } from '@/hooks/usePurchase';
import { FREE_GUEST_LIMIT } from '@/lib/purchase';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface GuestLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuestLimitModal({ open, onOpenChange }: GuestLimitModalProps) {
  const { startCheckout, checkoutLoading } = usePurchase();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleUpgrade = async () => {
    const trimmedEmail = email.trim();

    // Save email to subscriber list if provided
    if (trimmedEmail && trimmedEmail.includes('@')) {
      setSubmitting(true);
      try {
        await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail }),
        });
      } catch {
        // Non-blocking — continue to checkout
      }
      setSubmitting(false);
    }

    // Start checkout with email
    await startCheckout(trimmedEmail || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Guest limit reached">
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {FREE_GUEST_LIMIT}/{FREE_GUEST_LIMIT} guests added
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Free plans are limited to {FREE_GUEST_LIMIT} guests. Upgrade to Pro for unlimited guests.
              </p>
            </div>
          </div>

          <div>
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">
              We&apos;ll use this for your Pro account and receipt.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="primary"
              size="lg"
              onClick={handleUpgrade}
              disabled={checkoutLoading || submitting}
              className="w-full"
            >
              {checkoutLoading || submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                'Upgrade to Pro — $14.99'
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Not now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
