'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatArrivalTime } from '@/lib/check-in-utils';
import { dietaryTagColors } from '@/lib/colour-palette';
import { Check, Undo2, UtensilsCrossed, Accessibility } from 'lucide-react';
import type { Guest } from '@/types/guest';

interface CheckInGuestCardProps {
  guest: Guest;
  tableLabel: string | null;
}

export function CheckInGuestCard({ guest, tableLabel }: CheckInGuestCardProps) {
  const checkInGuest = useSeatingStore((s) => s.checkInGuest);
  const undoCheckIn = useSeatingStore((s) => s.undoCheckIn);

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
          <button
            onClick={handleUndo}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Undo check-in"
          >
            <Undo2 size={16} />
          </button>
        </div>
      ) : (
        <Button
          variant="primary"
          size="md"
          onClick={handleCheckIn}
          className="flex-shrink-0 min-w-[100px] min-h-[44px]"
        >
          Check In
        </Button>
      )}
    </div>
  );
}
