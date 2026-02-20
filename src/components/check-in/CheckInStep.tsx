'use client';

import { useState, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { CheckInHeader } from './CheckInHeader';
import { CheckInSearch } from './CheckInSearch';
import { CheckInGuestCard } from './CheckInGuestCard';
import { CheckInHouseholdGroup } from './CheckInHouseholdGroup';
import { CheckInEmptyState } from './CheckInEmptyState';
import {
  computeCheckInStats,
  getExpectedGuests,
  filterCheckInGuests,
  type CheckInFilter,
} from '@/lib/check-in-utils';

export function CheckInStep() {
  const guests = useSeatingStore((s) => s.guests);
  const households = useSeatingStore((s) => s.households);
  const venue = useSeatingStore((s) => s.venue);
  const checkInSearchQuery = useSeatingStore((s) => s.checkInSearchQuery);
  const setCheckInSearchQuery = useSeatingStore((s) => s.setCheckInSearchQuery);
  const setCurrentStep = useSeatingStore((s) => s.setCurrentStep);

  const [filterTab, setFilterTab] = useState<CheckInFilter>('expected');

  const expectedGuests = useMemo(() => getExpectedGuests(guests), [guests]);
  const stats = useMemo(() => computeCheckInStats(guests), [guests]);

  // Fuse.js search
  const fuse = useMemo(
    () =>
      new Fuse(expectedGuests, {
        keys: ['name', 'email', 'phone'],
        threshold: 0.35,
        includeScore: true,
      }),
    [expectedGuests]
  );

  const filteredGuests = useMemo(() => {
    let result = filterCheckInGuests(guests, filterTab);

    if (checkInSearchQuery.trim()) {
      const searchResults = fuse.search(checkInSearchQuery);
      const matchIds = new Set(searchResults.map((r) => r.item.id));
      result = result.filter((g) => matchIds.has(g.id));
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [guests, filterTab, checkInSearchQuery, fuse]);

  // Group guests by household
  const { householdGroups, ungroupedGuests } = useMemo(() => {
    const householdMap = new Map<string, typeof filteredGuests>();
    const ungrouped: typeof filteredGuests = [];

    for (const guest of filteredGuests) {
      if (guest.householdId) {
        if (!householdMap.has(guest.householdId)) {
          householdMap.set(guest.householdId, []);
        }
        householdMap.get(guest.householdId)!.push(guest);
      } else {
        ungrouped.push(guest);
      }
    }

    const groups = Array.from(householdMap.entries())
      .map(([id, members]) => ({
        household: households.find((h) => h.id === id)!,
        members,
      }))
      .filter((g) => g.household);

    return { householdGroups: groups, ungroupedGuests: ungrouped };
  }, [filteredGuests, households]);

  const tableMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of venue.tables) map.set(t.id, t.label);
    return map;
  }, [venue.tables]);

  const handleExit = useCallback(() => {
    setCurrentStep('seating');
    setCheckInSearchQuery('');
  }, [setCurrentStep, setCheckInSearchQuery]);

  const filterTabs: { key: CheckInFilter; label: string; count: number }[] = [
    { key: 'expected', label: 'Expected', count: stats.pending },
    { key: 'arrived', label: 'Arrived', count: stats.arrived },
    { key: 'all', label: 'All', count: stats.total },
  ];

  if (expectedGuests.length === 0) {
    return (
      <div className="h-dvh flex flex-col bg-slate-50">
        <CheckInHeader stats={stats} onExit={handleExit} />
        <div className="flex-1 flex items-center justify-center">
          <CheckInEmptyState type="no-guests" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-slate-50">
      <CheckInHeader stats={stats} onExit={handleExit} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Search */}
          <CheckInSearch
            value={checkInSearchQuery}
            onChange={setCheckInSearchQuery}
          />

          {/* Filter tabs */}
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  filterTab === tab.key
                    ? 'bg-cyan-50 text-cyan-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Guest list */}
          {filteredGuests.length === 0 ? (
            filterTab === 'expected' && stats.pending === 0 ? (
              <CheckInEmptyState type="all-arrived" />
            ) : (
              <CheckInEmptyState
                type="no-results"
                searchQuery={checkInSearchQuery}
              />
            )
          ) : (
            <div className="space-y-2">
              {/* Household groups */}
              {householdGroups.map(({ household, members }) => (
                <CheckInHouseholdGroup
                  key={household.id}
                  household={household}
                  members={members}
                  tables={venue.tables}
                />
              ))}

              {/* Ungrouped guests */}
              {ungroupedGuests.map((guest) => (
                <CheckInGuestCard
                  key={guest.id}
                  guest={guest}
                  tableLabel={guest.tableId ? (tableMap.get(guest.tableId) ?? null) : null}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
