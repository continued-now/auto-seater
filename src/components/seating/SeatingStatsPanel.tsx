'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, UtensilsCrossed } from 'lucide-react';
import { dietaryTagColors } from '@/lib/colour-palette';
import type { Guest, DietaryTag } from '@/types/guest';
import type { Table } from '@/types/venue';

const DIETARY_OPTIONS: DietaryTag[] = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'nut-allergy',
  'dairy-free',
  'halal',
  'kosher',
  'shellfish-allergy',
  'other',
];

function formatTag(s: string) {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface SeatingStatsPanelProps {
  guests: Guest[];
  tables: Table[];
}

export function SeatingStatsPanel({ guests, tables }: SeatingStatsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const totalSeats = useMemo(
    () => tables.reduce((sum, t) => sum + t.capacity, 0),
    [tables]
  );
  const filledSeats = useMemo(
    () => tables.reduce((sum, t) => sum + t.assignedGuestIds.length, 0),
    [tables]
  );
  const fillRate = totalSeats > 0 ? filledSeats / totalSeats : 0;
  const fillPct = Math.round(fillRate * 100);

  const dietaryBreakdown = useMemo(
    () =>
      DIETARY_OPTIONS.map((tag) => ({
        tag,
        count: guests.filter((g) => g.dietaryTags.includes(tag)).length,
      })).filter((d) => d.count > 0),
    [guests]
  );

  const totalWithDietary = useMemo(
    () => guests.filter((g) => g.dietaryTags.length > 0).length,
    [guests]
  );

  if (tables.length === 0 && guests.length === 0) return null;

  // Collapsed pill
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="absolute bottom-3 right-3 z-10 flex items-center gap-2 bg-white rounded-full border border-slate-200 shadow-lg px-3 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="relative w-5 h-5">
          <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="2.5"
            />
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke={fillPct >= 80 ? '#16a34a' : fillPct >= 50 ? '#d97706' : '#2563eb'}
              strokeWidth="2.5"
              strokeDasharray={`${fillRate * 50.27} 50.27`}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-xs font-semibold text-slate-700 tabular-nums">{fillPct}%</span>
        <ChevronUp size={12} className="text-slate-400" />
      </button>
    );
  }

  // Expanded card
  return (
    <div className="absolute bottom-3 right-3 z-10 w-[280px] bg-white rounded-xl border border-slate-200 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Header */}
      <button
        onClick={() => setExpanded(false)}
        className="w-full flex items-center justify-between px-3 py-2 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <span className="text-xs font-semibold text-slate-900">Seating Stats</span>
        <ChevronUp size={12} className="text-slate-400 rotate-180" />
      </button>

      <div className="px-3 py-2.5 space-y-3">
        {/* Section 1 — Seating Overview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-500">Seating Overview</span>
            <span className="text-[11px] font-bold text-slate-700 tabular-nums">{fillPct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${fillPct}%`,
                backgroundColor: fillPct >= 80 ? '#16a34a' : fillPct >= 50 ? '#d97706' : '#2563eb',
              }}
            />
          </div>
          <div className="flex gap-1.5 mt-2">
            <span className="text-[10px] font-medium rounded-md px-1.5 py-0.5" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
              {filledSeats} seated
            </span>
            <span className="text-[10px] font-medium rounded-md px-1.5 py-0.5" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
              {guests.length - filledSeats} unseated
            </span>
            <span className="text-[10px] font-medium rounded-md px-1.5 py-0.5" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
              {totalSeats} capacity
            </span>
          </div>
        </div>

        {/* Section 2 — Table Occupancy */}
        {tables.length > 0 && (
          <div>
            <span className="text-[11px] font-medium text-slate-500 block mb-1.5">Table Occupancy</span>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {tables.map((table) => {
                const fill = table.capacity > 0 ? table.assignedGuestIds.length / table.capacity : 0;
                const fillColor =
                  table.assignedGuestIds.length > table.capacity
                    ? '#DC2626'
                    : fill > 0.8
                    ? '#D97706'
                    : table.assignedGuestIds.length > 0
                    ? '#16A34A'
                    : '#cbd5e1';
                return (
                  <div key={table.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600 w-16 truncate shrink-0">{table.label}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(fill * 100, 100)}%`,
                          backgroundColor: fillColor,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 tabular-nums w-8 text-right shrink-0">
                      {table.assignedGuestIds.length}/{table.capacity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 3 — Dietary Summary */}
        {dietaryBreakdown.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <UtensilsCrossed size={10} className="text-slate-400" />
              <span className="text-[11px] font-medium text-slate-500">
                Dietary ({totalWithDietary} guest{totalWithDietary !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {dietaryBreakdown.map(({ tag, count }) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium rounded-md px-1.5 py-0.5"
                  style={{
                    backgroundColor: (dietaryTagColors[tag] ?? '#64748B') + '18',
                    color: dietaryTagColors[tag] ?? '#64748B',
                  }}
                >
                  {formatTag(tag)} {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
