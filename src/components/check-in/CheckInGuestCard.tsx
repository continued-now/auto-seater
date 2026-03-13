'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatArrivalTime } from '@/lib/check-in-utils';
import { dietaryTagColors } from '@/lib/colour-palette';
import { Check, Undo2, UtensilsCrossed, Accessibility, ArrowRightLeft, UserX } from 'lucide-react';
import type { Guest } from '@/types/guest';

interface CheckInGuestCardProps {
  guest: Guest;
  tableLabel: string | null;
}

export function CheckInGuestCard({ guest, tableLabel }: CheckInGuestCardProps) {
  const checkInGuest = useSeatingStore((s) => s.checkInGuest);
  const undoCheckIn = useSeatingStore((s) => s.undoCheckIn);
  const venue = useSeatingStore((s) => s.venue);
  const assignGuestToTable = useSeatingStore((s) => s.assignGuestToTable);
  const unassignGuest = useSeatingStore((s) => s.unassignGuest);
  const updateGuest = useSeatingStore((s) => s.updateGuest);

  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const isCheckedIn = guest.checkedInAt !== null;

  const handleCheckIn = useCallback(() => {
    checkInGuest(guest.id);
    toast.success(`${guest.name} checked in`);
  }, [checkInGuest, guest.id, guest.name]);

  const handleUndo = useCallback(() => {
    undoCheckIn(guest.id);
    toast('Check-in undone');
  }, [undoCheckIn, guest.id]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-l-4 bg-white rounded-lg shadow-sm ${
        isCheckedIn
          ? 'border-l-emerald-500 bg-emerald-50/30'
          : 'border-l-amber-400'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-slate-900 truncate">
            {guest.name}
          </span>
          {guest.dietaryTags.length > 0 && (
            <span className="flex items-center gap-0.5 flex-shrink-0">
              <UtensilsCrossed size={12} className="text-amber-500" />
              {guest.dietaryTags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  color={dietaryTagColors[tag] ?? '#64748B'}
                  bgColor={(dietaryTagColors[tag] ?? '#64748B') + '18'}
                >
                  {tag}
                </Badge>
              ))}
            </span>
          )}
          {guest.accessibilityTags.length > 0 && (
            <Accessibility size={14} className="text-blue-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {tableLabel && (
            <span className="text-sm text-blue-600 font-medium">{tableLabel}</span>
          )}
          {!tableLabel && (
            <span className="text-sm text-slate-400">No table assigned</span>
          )}
          {isCheckedIn && guest.checkedInAt && (
            <span className="text-xs text-slate-400">
              Arrived {formatArrivalTime(guest.checkedInAt)}
            </span>
          )}
        </div>
      </div>

      {isCheckedIn ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-emerald-600">
            <Check size={16} />
            <span className="text-sm font-medium">In</span>
          </div>

          {/* Move (checked-in) */}
          <div className="relative">
            <button
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
              title="Move to another table"
              aria-label="Move to another table"
            >
              <ArrowRightLeft size={16} />
            </button>
            {showMoveMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoveMenu(false)} />
                <div className="absolute right-0 bottom-full mb-1 z-20 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px] max-h-48 overflow-y-auto">
                  {venue.tables.map((table) => {
                    const seatsLeft = table.capacity - table.assignedGuestIds.length;
                    const isCurrent = guest.tableId === table.id;
                    return (
                      <button
                        key={table.id}
                        onClick={() => {
                          if (isCurrent || seatsLeft <= 0) return;
                          const allGuests = useSeatingStore.getState().guests;
                          const occupiedSeats = new Set(
                            allGuests.filter((g) => g.tableId === table.id && g.seatIndex !== null).map((g) => g.seatIndex!)
                          );
                          let freeSeat = 0;
                          for (let i = 0; i < table.capacity; i++) {
                            if (!occupiedSeats.has(i)) { freeSeat = i; break; }
                          }
                          assignGuestToTable(guest.id, table.id, freeSeat);
                          toast.success(`Moved ${guest.name} to ${table.label}`);
                          setShowMoveMenu(false);
                        }}
                        disabled={seatsLeft <= 0 && !isCurrent}
                        className={`w-full px-3 py-1.5 text-left text-sm flex items-center justify-between cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        <span>{table.label}</span>
                        <span className="text-xs text-slate-400">
                          {isCurrent ? 'Current' : `${seatsLeft} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* No-show (checked-in) */}
          <button
            onClick={() => {
              if (guest.tableId) unassignGuest(guest.id);
              updateGuest(guest.id, { rsvpStatus: 'declined' });
              toast(`${guest.name} marked as no-show`);
            }}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Mark as no-show"
            aria-label="Mark as no-show"
          >
            <UserX size={16} />
          </button>

          <button
            onClick={handleUndo}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Undo check-in"
            aria-label="Undo check-in"
          >
            <Undo2 size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Quick swap */}
          <div className="relative">
            <button
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
              title="Move to another table"
              aria-label="Move to another table"
            >
              <ArrowRightLeft size={16} />
            </button>
            {showMoveMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoveMenu(false)} />
                <div className="absolute right-0 bottom-full mb-1 z-20 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px] max-h-48 overflow-y-auto">
                  {venue.tables.map((table) => {
                    const seatsLeft = table.capacity - table.assignedGuestIds.length;
                    const isCurrent = guest.tableId === table.id;
                    return (
                      <button
                        key={table.id}
                        onClick={() => {
                          if (isCurrent || seatsLeft <= 0) return;
                          const allGuests = useSeatingStore.getState().guests;
                          const occupiedSeats = new Set(
                            allGuests.filter((g) => g.tableId === table.id && g.seatIndex !== null).map((g) => g.seatIndex!)
                          );
                          let freeSeat = 0;
                          for (let i = 0; i < table.capacity; i++) {
                            if (!occupiedSeats.has(i)) { freeSeat = i; break; }
                          }
                          assignGuestToTable(guest.id, table.id, freeSeat);
                          toast.success(`Moved ${guest.name} to ${table.label}`);
                          setShowMoveMenu(false);
                        }}
                        disabled={seatsLeft <= 0 && !isCurrent}
                        className={`w-full px-3 py-1.5 text-left text-sm flex items-center justify-between cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        <span>{table.label}</span>
                        <span className="text-xs text-slate-400">
                          {isCurrent ? 'Current' : `${seatsLeft} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* No-show */}
          <button
            onClick={() => {
              if (guest.tableId) unassignGuest(guest.id);
              updateGuest(guest.id, { rsvpStatus: 'declined' });
              toast(`${guest.name} marked as no-show`);
            }}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Mark as no-show"
            aria-label="Mark as no-show"
          >
            <UserX size={16} />
          </button>

          <Button
            variant="primary"
            size="md"
            onClick={handleCheckIn}
            className="flex-shrink-0 min-w-[100px] min-h-[44px]"
          >
            Check In
          </Button>
        </div>
      )}
    </div>
  );
}
