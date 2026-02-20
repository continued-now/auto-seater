'use client';

import { PartyPopper, UserX } from 'lucide-react';

interface CheckInEmptyStateProps {
  type: 'no-results' | 'all-arrived' | 'no-guests';
  searchQuery?: string;
}

export function CheckInEmptyState({ type, searchQuery }: CheckInEmptyStateProps) {
  if (type === 'all-arrived') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
          <PartyPopper size={32} className="text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Everyone is here!</h3>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          All expected guests have checked in. Great job managing arrivals.
        </p>
      </div>
    );
  }

  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <UserX size={32} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">No matches</h3>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          No guests found for &quot;{searchQuery}&quot;. Try a different search term.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <UserX size={32} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">No expected guests</h3>
      <p className="text-sm text-slate-500 text-center max-w-xs">
        Add guests with a confirmed or tentative RSVP status to use check-in mode.
      </p>
    </div>
  );
}
