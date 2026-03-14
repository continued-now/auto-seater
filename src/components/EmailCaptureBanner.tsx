'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { X, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'emailCaptureShown';

interface EmailCaptureBannerProps {
  show: boolean;
}

export function EmailCaptureBanner({ show }: EmailCaptureBannerProps) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!show) return;
    if (typeof window === 'undefined') return;
    const alreadyShown = localStorage.getItem(STORAGE_KEY);
    if (!alreadyShown) {
      setVisible(true);
    }
  }, [show]);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Email saved! We\'ll keep your progress safe.');
        dismiss();
      } else {
        toast.error(data.error || 'Something went wrong');
      }
    } catch {
      toast.error('Failed to save email');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-4 py-3 sm:px-6 sm:py-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">
            Want to save your progress across devices?
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter your email and we&apos;ll help you keep your seating plan safe.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 flex-1 sm:w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-500 focus:border-transparent"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </Button>
        </form>
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 sm:static p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
