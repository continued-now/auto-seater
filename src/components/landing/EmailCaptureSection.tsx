'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function EmailCaptureSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="py-16 px-4 sm:px-6 bg-primary-light">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-slate-900">Get seating tips & updates</h2>
        <p className="mt-2 text-sm text-slate-600">
          Join event planners getting tips on seating arrangements, venue layouts, and AutoSeater updates.
        </p>
        {status === 'success' ? (
          <p className="mt-6 text-sm font-medium text-primary">You&apos;re subscribed!</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="flex-1 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-2 focus:outline-primary"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="h-10 px-5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {status === 'loading' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                'Subscribe'
              )}
            </button>
          </form>
        )}
        {status === 'error' && (
          <p className="mt-2 text-sm text-red-500">Something went wrong. Please try again.</p>
        )}
      </div>
    </section>
  );
}
