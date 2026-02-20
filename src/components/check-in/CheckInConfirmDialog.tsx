'use client';

import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { Guest } from '@/types/guest';

interface CheckInConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdName: string;
  members: Guest[];
  onConfirm: () => void;
}

export function CheckInConfirmDialog({
  open,
  onOpenChange,
  householdName,
  members,
  onConfirm,
}: CheckInConfirmDialogProps) {
  const uncheckedMembers = members.filter((m) => m.checkedInAt === null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Check in household?" description={`Check in all members of "${householdName}"?`}>
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm font-medium text-slate-700 mb-2">
              {uncheckedMembers.length} member{uncheckedMembers.length !== 1 ? 's' : ''} will be checked in:
            </p>
            <ul className="space-y-1">
              {uncheckedMembers.map((m) => (
                <li key={m.id} className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  {m.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onConfirm}>
              Check in all ({uncheckedMembers.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
