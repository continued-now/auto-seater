'use client';

import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { encodeGuestQR } from '@/lib/qr-utils';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface QRBadgeExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRBadgeExport({ open, onOpenChange }: QRBadgeExportProps) {
  const guests = useSeatingStore((s) => s.guests);

  const expectedGuests = useMemo(
    () =>
      guests.filter(
        (g) => g.rsvpStatus === 'confirmed' || g.rsvpStatus === 'tentative'
      ),
    [guests]
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="QR Badges" description={`${expectedGuests.length} expected guests`} className="max-w-3xl">
        {expectedGuests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">
              No confirmed or tentative guests to generate badges for.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4 print:hidden">
              <Button onClick={handlePrint} size="sm">
                <Printer size={16} className="mr-1.5" />
                Print Badges
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 qr-badge-grid">
              {expectedGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-lg bg-white"
                >
                  <QRCodeSVG
                    value={encodeGuestQR(guest.id)}
                    size={120}
                    level="M"
                  />
                  <p className="text-sm font-medium text-slate-900 text-center truncate w-full">
                    {guest.name}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
