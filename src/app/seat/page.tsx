'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { decodeSeatData } from '@/lib/seat-encoder';
import type { SeatData } from '@/lib/seat-encoder';
import FindSeatView from '@/components/find-seat/FindSeatView';
import { Suspense } from 'react';

function SeatPageInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SeatData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const encoded = searchParams.get('data');
    if (!encoded) {
      setError(true);
      return;
    }
    const decoded = decodeSeatData(encoded);
    if (!decoded) {
      setError(true);
      return;
    }
    setData(decoded);
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-xs">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Invalid Link</h1>
          <p className="text-sm text-slate-500">
            This seat link is invalid or has expired. Please ask your host for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return <FindSeatView data={data} />;
}

export default function SeatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-teal-500 rounded-full animate-spin" />
        </div>
      }
    >
      <SeatPageInner />
    </Suspense>
  );
}
