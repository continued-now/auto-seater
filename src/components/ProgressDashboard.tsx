'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Activity } from 'lucide-react';

export function ProgressDashboard() {
  const guests = useSeatingStore((s) => s.guests);
  const venue = useSeatingStore((s) => s.venue);
  const eventDate = useSeatingStore((s) => s.eventDate);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  const metrics = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => g.rsvpStatus === 'confirmed').length;
    const seated = guests.filter(
      (g) => g.rsvpStatus === 'confirmed' && g.tableId != null
    ).length;
    const checkedIn = guests.filter(
      (g) => g.rsvpStatus === 'confirmed' && g.checkedInAt != null
    ).length;

    const rsvpPct = total > 0 ? confirmed / total : 0;
    const seatingPct = confirmed > 0 ? seated / confirmed : 0;
    const checkinPct = confirmed > 0 ? checkedIn / confirmed : 0;

    const readiness = rsvpPct * 0.3 + seatingPct * 0.5 + checkinPct * 0.2;

    let daysUntil: number | null = null;
    let daysLabel = 'No date set';
    if (eventDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const event = new Date(eventDate + 'T00:00:00');
      daysUntil = Math.ceil((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) daysLabel = 'Past';
      else if (daysUntil === 0) daysLabel = 'Today';
      else if (daysUntil === 1) daysLabel = '1d';
      else daysLabel = `${daysUntil}d`;
    }

    return {
      total,
      confirmed,
      seated,
      checkedIn,
      rsvpPct,
      seatingPct,
      checkinPct,
      readiness,
      daysUntil,
      daysLabel,
    };
  }, [guests, eventDate]);

  // Don't render when there are no guests
  if (guests.length === 0) return null;

  const readinessPct = Math.round(metrics.readiness * 100);
  const color =
    readinessPct >= 80
      ? 'emerald'
      : readinessPct >= 50
        ? 'amber'
        : 'red';

  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      bar: 'bg-emerald-500',
      barBg: 'bg-emerald-100',
      dot: 'bg-emerald-500',
      hoverBg: 'hover:bg-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      bar: 'bg-amber-500',
      barBg: 'bg-amber-100',
      dot: 'bg-amber-500',
      hoverBg: 'hover:bg-amber-100',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      bar: 'bg-red-500',
      barBg: 'bg-red-100',
      dot: 'bg-red-500',
      hoverBg: 'hover:bg-red-100',
    },
  };

  const c = colorMap[color];

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      {/* Collapsed pill */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${c.bg} ${c.border} ${c.text} ${c.hoverBg}`}
      >
        <Activity size={12} />
        <span>
          {metrics.daysLabel !== 'No date set' && metrics.daysLabel !== 'Past'
            ? `${metrics.daysLabel} · `
            : ''}
          {readinessPct}% ready
        </span>
      </button>

      {/* Expanded dropdown */}
      {expanded && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setExpanded(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-lg shadow-lg border border-slate-200 p-4 min-w-[260px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-800">Event Readiness</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${c.bg} ${c.text}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                {readinessPct}%
              </span>
            </div>

            {/* Days until event */}
            <div className="mb-3 pb-3 border-b border-slate-100">
              <div className="text-xs text-slate-500">
                {metrics.daysUntil === null
                  ? 'No date set'
                  : metrics.daysUntil < 0
                    ? 'Event has passed'
                    : metrics.daysUntil === 0
                      ? 'Event is today!'
                      : metrics.daysUntil === 1
                        ? '1 day until event'
                        : `${metrics.daysUntil} days until event`}
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              <ProgressRow
                label="RSVP"
                value={`${metrics.confirmed}/${metrics.total} confirmed`}
                pct={metrics.rsvpPct}
              />
              <ProgressRow
                label="Seating"
                value={`${metrics.seated}/${metrics.confirmed} seated`}
                pct={metrics.seatingPct}
              />
              <ProgressRow
                label="Check-in"
                value={`${metrics.checkedIn}/${metrics.confirmed} checked in`}
                pct={metrics.checkinPct}
              />
            </div>

            {/* Overall bar */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">Overall</span>
                <span className={`font-bold ${c.text}`}>{readinessPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                  style={{ width: `${readinessPct}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProgressRow({
  label,
  value,
  pct,
}: {
  label: string;
  value: string;
  pct: number;
}) {
  const pctRound = Math.round(pct * 100);
  const barColor =
    pctRound >= 80
      ? 'bg-emerald-500'
      : pctRound >= 50
        ? 'bg-amber-500'
        : 'bg-red-400';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pctRound}%` }}
        />
      </div>
    </div>
  );
}
