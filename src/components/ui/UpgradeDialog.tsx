'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Check, Zap, Loader2, RotateCcw } from 'lucide-react';
import { usePurchase } from '@/hooks/usePurchase';
import { toast } from 'sonner';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const PRO_FEATURES = [
  'Unlimited guests (free: 50)',
  'Auto-assign seating algorithm',
  'Multi-room venue layouts',
  'AI Photo-to-Room generator',
  'AI Layout Advisor & optimizer',
  'Place card & escort card exports',
  'Watermark-free PDF exports',
  'Custom table dimensions',
];

export function UpgradeDialog({ open, onOpenChange, feature }: UpgradeDialogProps) {
  const { startCheckout, checkoutLoading, restorePurchase } = usePurchase();
  const [email, setEmail] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [restoreSessionId, setRestoreSessionId] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Upgrade to Pro" className="max-w-md">
        <div className="space-y-5">
          {feature && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-800">{feature}</span> is a Pro feature.
                Upgrade once and use it for your entire event.
              </p>
            </div>
          )}

          <div className="text-center">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">$14.99</span>
              <span className="text-slate-500 text-sm">one-time</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">No subscription. Pay once, use forever.</p>
          </div>

          <ul className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-slate-700">{f}</span>
              </li>
            ))}
          </ul>

          <div>
            <label className="text-xs text-slate-500 block mb-1">Email (for receipt)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-2 focus:outline-blue-500"
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => startCheckout(email || undefined)}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <><Zap size={16} /> Upgrade to Pro &mdash; $14.99</>
            )}
          </Button>

          <p className="text-[11px] text-slate-400 text-center">
            Secure payment via Stripe. 30-day money-back guarantee.
          </p>

          <div className="border-t border-slate-100 pt-3">
            {!showRestore ? (
              <button
                type="button"
                onClick={() => setShowRestore(true)}
                className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors text-center"
              >
                Already purchased? Restore access
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <RotateCcw size={12} /> Restore your purchase
                </p>
                <p className="text-[11px] text-slate-400">
                  Enter the Stripe session ID from your confirmation email (starts with <code className="font-mono">cs_</code>).
                </p>
                <input
                  type="text"
                  value={restoreSessionId}
                  onChange={(e) => setRestoreSessionId(e.target.value)}
                  placeholder="cs_live_..."
                  className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm font-mono focus:outline-2 focus:outline-blue-500"
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={async () => {
                      const id = restoreSessionId.trim();
                      if (!id.startsWith('cs_')) {
                        toast.error('Invalid session ID. It should start with cs_');
                        return;
                      }
                      setRestoreLoading(true);
                      const ok = await restorePurchase(id);
                      setRestoreLoading(false);
                      if (ok) {
                        toast.success('Purchase restored! Welcome back to Pro.');
                        onOpenChange(false);
                      } else {
                        toast.error('Could not verify this session ID. Please check and try again.');
                      }
                    }}
                    disabled={restoreLoading || !restoreSessionId.trim()}
                  >
                    {restoreLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Verifying...</> : 'Restore'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowRestore(false); setRestoreSessionId(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
