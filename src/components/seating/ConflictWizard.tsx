'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  X,
  ArrowRight,
  ArrowLeftRight,
  SkipForward,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ConstraintViolation, Constraint } from '@/types/constraint';
import type { Guest } from '@/types/guest';
import type { Table } from '@/types/venue';

interface ConflictWizardProps {
  violations: ConstraintViolation[];
  constraints: Constraint[];
  guests: Guest[];
  tables: Table[];
  onClose: () => void;
}

interface Suggestion {
  label: string;
  description: string;
  type: 'move' | 'swap';
  action: () => void;
}

export function ConflictWizard({
  violations: initialViolations,
  constraints,
  guests,
  tables,
  onClose,
}: ConflictWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  const assignGuestToTable = useSeatingStore((s) => s.assignGuestToTable);
  const swapGuests = useSeatingStore((s) => s.swapGuests);
  const getViolations = useSeatingStore((s) => s.getViolations);
  const storeGuests = useSeatingStore((s) => s.guests);
  const storeTables = useSeatingStore((s) => s.venue.tables);

  // Re-check violations live from the store so fixes are reflected
  const liveViolations = useMemo(
    () => getViolations().filter((v) => v.severity !== 'warning'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getViolations, storeGuests, storeTables, constraints]
  );

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const constraintMap = useMemo(
    () => new Map(constraints.map((c) => [c.id, c])),
    [constraints]
  );

  const guestMap = useMemo(() => {
    const map = new Map<string, Guest>();
    for (const g of storeGuests) map.set(g.id, g);
    return map;
  }, [storeGuests]);

  const tableMap = useMemo(() => {
    const map = new Map<string, Table>();
    for (const t of storeTables) map.set(t.id, t);
    return map;
  }, [storeTables]);

  // The error-level violations we're stepping through
  const errorViolations = useMemo(
    () => initialViolations.filter((v) => v.severity !== 'warning'),
    [initialViolations]
  );

  const totalConflicts = errorViolations.length;

  // Clamp index
  const safeIndex = Math.min(currentIndex, totalConflicts - 1);
  const currentViolation = totalConflicts > 0 ? errorViolations[safeIndex] : null;

  // Check if the current violation is still active (hasn't been resolved by a prior fix)
  const isCurrentStillActive = useMemo(() => {
    if (!currentViolation) return false;
    return liveViolations.some(
      (v) => v.constraintId === currentViolation.constraintId
    );
  }, [currentViolation, liveViolations]);

  // Find the next available seat index for a table
  const findNextSeatIndex = useCallback(
    (tableId: string): number => {
      const seated = storeGuests.filter((g) => g.tableId === tableId);
      const occupiedSeats = new Set(seated.map((g) => g.seatIndex));
      for (let i = 0; i < 100; i++) {
        if (!occupiedSeats.has(i)) return i;
      }
      return seated.length;
    },
    [storeGuests]
  );

  // Check if a table has room for one more guest
  const tableHasRoom = useCallback(
    (tableId: string): boolean => {
      const table = tableMap.get(tableId);
      if (!table) return false;
      return table.assignedGuestIds.length < table.capacity;
    },
    [tableMap]
  );

  // Generate suggestions for the current violation
  const suggestions = useMemo<Suggestion[]>(() => {
    if (!currentViolation || !isCurrentStillActive) return [];

    const constraint = constraintMap.get(currentViolation.constraintId);
    if (!constraint) return [];

    const [guestAId, guestBId] = constraint.guestIds;
    const guestA = guestMap.get(guestAId);
    const guestB = guestMap.get(guestBId);
    if (!guestA || !guestB) return [];

    const result: Suggestion[] = [];

    if (constraint.type === 'must-sit-together') {
      // Suggest moving guest A to guest B's table
      if (guestB.tableId && tableHasRoom(guestB.tableId)) {
        const tableB = tableMap.get(guestB.tableId);
        result.push({
          label: `Move ${guestA.name}`,
          description: `to ${tableB?.label ?? 'their table'}`,
          type: 'move',
          action: () => {
            const seatIdx = findNextSeatIndex(guestB.tableId!);
            assignGuestToTable(guestA.id, guestB.tableId!, seatIdx);
            toast.success(`Moved ${guestA.name} to ${tableB?.label}`);
          },
        });
      }

      // Suggest moving guest B to guest A's table
      if (guestA.tableId && tableHasRoom(guestA.tableId)) {
        const tableA = tableMap.get(guestA.tableId);
        result.push({
          label: `Move ${guestB.name}`,
          description: `to ${tableA?.label ?? 'their table'}`,
          type: 'move',
          action: () => {
            const seatIdx = findNextSeatIndex(guestA.tableId!);
            assignGuestToTable(guestB.id, guestA.tableId!, seatIdx);
            toast.success(`Moved ${guestB.name} to ${tableA?.label}`);
          },
        });
      }

      // Suggest swap: find someone at guest B's table who has no conflicting constraints with guest A
      if (guestA.tableId && guestB.tableId) {
        const guestsAtTableB = storeGuests.filter(
          (g) => g.tableId === guestB.tableId && g.id !== guestB.id
        );
        for (const candidate of guestsAtTableB.slice(0, 3)) {
          // Check the candidate won't cause new "must-sit-together" violations if moved to A's table
          const candidateConstraints = constraints.filter(
            (c) =>
              c.guestIds.includes(candidate.id) &&
              c.type === 'must-sit-together'
          );
          const wouldBreak = candidateConstraints.some((cc) => {
            const otherId = cc.guestIds.find((id) => id !== candidate.id)!;
            const other = guestMap.get(otherId);
            // Moving candidate to A's table - check if their partner is at B's table (would break) or A's table (fine)
            return other?.tableId === guestB.tableId;
          });
          if (wouldBreak) continue;

          // Check candidate won't violate "must-not-sit-together" at A's table
          const notTogetherConflicts = constraints.filter(
            (c) =>
              c.guestIds.includes(candidate.id) &&
              c.type === 'must-not-sit-together'
          );
          const wouldConflict = notTogetherConflicts.some((cc) => {
            const otherId = cc.guestIds.find((id) => id !== candidate.id)!;
            const other = guestMap.get(otherId);
            return other?.tableId === guestA.tableId;
          });
          if (wouldConflict) continue;

          const tableA = tableMap.get(guestA.tableId);
          const tableB = tableMap.get(guestB.tableId);
          result.push({
            label: `Swap ${guestA.name} with ${candidate.name}`,
            description: `${guestA.name} goes to ${tableB?.label}, ${candidate.name} goes to ${tableA?.label}`,
            type: 'swap',
            action: () => {
              swapGuests(guestA.id, candidate.id);
              toast.success(`Swapped ${guestA.name} and ${candidate.name}`);
            },
          });
          break; // Only show one swap suggestion per direction
        }
      }
    }

    if (constraint.type === 'must-not-sit-together') {
      // Find another table with room for guest A
      for (const t of storeTables) {
        if (t.id === guestA.tableId) continue;
        if (t.assignedGuestIds.length >= t.capacity) continue;
        // Check this table doesn't also have a must-not-sit-together violation for guest A
        const conflictsAtTable = constraints.some(
          (c) =>
            c.type === 'must-not-sit-together' &&
            c.guestIds.includes(guestA.id) &&
            c.guestIds.some(
              (id) => id !== guestA.id && guestMap.get(id)?.tableId === t.id
            )
        );
        if (conflictsAtTable) continue;

        result.push({
          label: `Move ${guestA.name}`,
          description: `to ${t.label}`,
          type: 'move',
          action: () => {
            const seatIdx = findNextSeatIndex(t.id);
            assignGuestToTable(guestA.id, t.id, seatIdx);
            toast.success(`Moved ${guestA.name} to ${t.label}`);
          },
        });
        break; // Just suggest the first valid table
      }

      // Find another table with room for guest B
      for (const t of storeTables) {
        if (t.id === guestB.tableId) continue;
        if (t.assignedGuestIds.length >= t.capacity) continue;
        const conflictsAtTable = constraints.some(
          (c) =>
            c.type === 'must-not-sit-together' &&
            c.guestIds.includes(guestB.id) &&
            c.guestIds.some(
              (id) => id !== guestB.id && guestMap.get(id)?.tableId === t.id
            )
        );
        if (conflictsAtTable) continue;

        result.push({
          label: `Move ${guestB.name}`,
          description: `to ${t.label}`,
          type: 'move',
          action: () => {
            const seatIdx = findNextSeatIndex(t.id);
            assignGuestToTable(guestB.id, t.id, seatIdx);
            toast.success(`Moved ${guestB.name} to ${t.label}`);
          },
        });
        break;
      }

      // Swap suggestion: find someone at a different table to swap with guest A
      if (guestA.tableId) {
        for (const t of storeTables) {
          if (t.id === guestA.tableId) continue;
          // Don't swap into the table if guestB is there
          if (t.id === guestB.tableId) continue;

          for (const candidateId of t.assignedGuestIds.slice(0, 2)) {
            const candidate = guestMap.get(candidateId);
            if (!candidate) continue;

            // Check candidate won't conflict at guestA's table
            const wouldConflict = constraints.some(
              (c) =>
                c.type === 'must-not-sit-together' &&
                c.guestIds.includes(candidate.id) &&
                c.guestIds.some(
                  (id) =>
                    id !== candidate.id &&
                    guestMap.get(id)?.tableId === guestA.tableId
                )
            );
            if (wouldConflict) continue;

            result.push({
              label: `Swap ${guestA.name} with ${candidate.name}`,
              description: `${guestA.name} goes to ${t.label}, ${candidate.name} goes to ${tableMap.get(guestA.tableId)?.label}`,
              type: 'swap',
              action: () => {
                swapGuests(guestA.id, candidate.id);
                toast.success(`Swapped ${guestA.name} and ${candidate.name}`);
              },
            });
            break;
          }
          if (result.length >= 3) break;
        }
      }
    }

    return result;
  }, [
    currentViolation,
    isCurrentStillActive,
    constraintMap,
    guestMap,
    tableMap,
    storeGuests,
    storeTables,
    constraints,
    tableHasRoom,
    findNextSeatIndex,
    assignGuestToTable,
    swapGuests,
  ]);

  const handleApplyFix = useCallback(
    (suggestion: Suggestion) => {
      suggestion.action();
      setResolvedCount((c) => c + 1);
      // Auto-advance after a brief moment
      setTimeout(() => {
        if (safeIndex < totalConflicts - 1) {
          setCurrentIndex((i) => i + 1);
        }
      }, 300);
    },
    [safeIndex, totalConflicts]
  );

  const handleSkip = useCallback(() => {
    if (currentViolation) {
      setSkippedIds((prev) => new Set(prev).add(currentViolation.constraintId));
    }
    if (safeIndex < totalConflicts - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [safeIndex, totalConflicts, currentViolation]);

  const handlePrev = useCallback(() => {
    if (safeIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [safeIndex]);

  const handleNext = useCallback(() => {
    if (safeIndex < totalConflicts - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [safeIndex, totalConflicts]);

  const isFinished = safeIndex >= totalConflicts - 1 && (
    !isCurrentStillActive || skippedIds.has(currentViolation?.constraintId ?? '')
  );

  if (totalConflicts === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div ref={panelRef} className="bg-white rounded-xl border border-slate-200 shadow-2xl w-[calc(100vw-2rem)] max-w-md p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
            <CheckCircle2 size={24} className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No conflicts found</h3>
          <p className="text-sm text-slate-500 mb-4">All constraint violations have been resolved.</p>
          <Button variant="primary" size="md" onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  }

  const constraint = currentViolation ? constraintMap.get(currentViolation.constraintId) : null;
  const guestA = constraint ? guestMap.get(constraint.guestIds[0]) : null;
  const guestB = constraint ? guestMap.get(constraint.guestIds[1]) : null;
  const tableA = guestA?.tableId ? tableMap.get(guestA.tableId) : null;
  const tableB = guestB?.tableId ? tableMap.get(guestB.tableId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div ref={panelRef} className="bg-white rounded-xl border border-slate-200 shadow-2xl w-[calc(100vw-2rem)] max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="text-sm font-semibold text-slate-900">Conflict Resolution Wizard</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-4 pt-3 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            Conflict {safeIndex + 1} of {totalConflicts}
          </span>
          <div className="flex items-center gap-2">
            {resolvedCount > 0 && (
              <Badge color="#059669" bgColor="#D1FAE5">
                <CheckCircle2 size={10} className="mr-1" />
                {resolvedCount} resolved
              </Badge>
            )}
            <Badge color="#64748B" bgColor="#F1F5F9">
              {liveViolations.length} remaining
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mx-4 mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${((safeIndex + 1) / totalConflicts) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-4">
          {!isCurrentStillActive ? (
            <div className="text-center py-4">
              <div className="mx-auto w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <p className="text-sm font-medium text-green-700 mb-1">Already resolved</p>
              <p className="text-xs text-slate-500">
                This conflict was fixed by a previous action.
              </p>
            </div>
          ) : (
            <>
              {/* Violation description */}
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-700">{currentViolation?.message}</p>
                {constraint?.reason && (
                  <p className="text-xs text-slate-400 mt-1">Reason: {constraint.reason}</p>
                )}
              </div>

              {/* Guest cards */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-900 truncate">{guestA?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tableA ? tableA.label : 'Unassigned'}
                  </p>
                </div>
                <div className="shrink-0">
                  {constraint?.type === 'must-sit-together' ? (
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                      <ArrowLeftRight size={14} className="text-amber-600" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                      <X size={14} className="text-red-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-900 truncate">{guestB?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tableB ? tableB.label : 'Unassigned'}
                  </p>
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Suggested fixes
                </p>
                {suggestions.length === 0 ? (
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-slate-500">
                      No automatic fix available. Try manually rearranging guests.
                    </p>
                  </div>
                ) : (
                  suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleApplyFix(s)}
                      className="w-full text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                            {s.type === 'move' ? (
                              <ArrowRight size={12} className="text-blue-500 shrink-0" />
                            ) : (
                              <ArrowLeftRight size={12} className="text-teal-500 shrink-0" />
                            )}
                            {s.label}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                        </div>
                        <span className="text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          Apply
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={safeIndex === 0}
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline ml-0.5">Prev</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={safeIndex >= totalConflicts - 1}
            >
              <span className="hidden sm:inline mr-0.5">Next</span>
              <ChevronRight size={14} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {isCurrentStillActive && !isFinished && (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                <SkipForward size={14} />
                <span className="ml-1">Skip</span>
              </Button>
            )}
            {(isFinished || safeIndex >= totalConflicts - 1) && (
              <Button variant="primary" size="sm" onClick={onClose}>
                {liveViolations.length === 0 ? 'All resolved' : 'Done'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
