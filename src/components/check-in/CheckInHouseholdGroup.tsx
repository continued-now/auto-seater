'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { CheckInGuestCard } from './CheckInGuestCard';
import { CheckInConfirmDialog } from './CheckInConfirmDialog';
import { Button } from '@/components/ui/Button';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import type { Guest, Household } from '@/types/guest';
import type { Table } from '@/types/venue';

interface CheckInHouseholdGroupProps {
  household: Household;
  members: Guest[];
  tables: Table[];
}

export function CheckInHouseholdGroup({ household, members, tables }: CheckInHouseholdGroupProps) {
  const checkInHousehold = useSeatingStore((s) => s.checkInHousehold);
  const [expanded, setExpanded] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  const tableMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tables) map.set(t.id, t.label);
    return map;
  }, [tables]);

  const uncheckedCount = members.filter((m) => m.checkedInAt === null).length;
  const allCheckedIn = uncheckedCount === 0;

  const handleConfirmCheckIn = useCallback(() => {
    checkInHousehold(household.id);
    setShowConfirm(false);
  }, [checkInHousehold, household.id]);

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Users size={14} className="text-slate-400" />
          <span>{household.name}</span>
          <span className="text-xs text-slate-400">({members.length})</span>
        </button>
        {!allCheckedIn && uncheckedCount > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirm(true)}
            className="ml-auto text-xs"
          >
            Check in all
          </Button>
        )}
        {allCheckedIn && (
          <span className="ml-auto text-xs text-emerald-600 font-medium">All arrived</span>
        )}
      </div>
      {expanded && (
        <div className="space-y-2 pl-2">
          {members.map((member) => (
            <CheckInGuestCard
              key={member.id}
              guest={member}
              tableLabel={member.tableId ? (tableMap.get(member.tableId) ?? null) : null}
            />
          ))}
        </div>
      )}
      <CheckInConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        householdName={household.name}
        members={members}
        onConfirm={handleConfirmCheckIn}
      />
    </div>
  );
}
