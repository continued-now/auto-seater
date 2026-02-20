'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, ScanLine, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { useQRScanner } from '@/hooks/useQRScanner';
import { decodeGuestQR } from '@/lib/qr-utils';
import { QRWelcomeOverlay } from './QRWelcomeOverlay';
import { Button } from '@/components/ui/Button';

interface QRScannerViewProps {
  onClose: () => void;
}

const SCANNER_ELEMENT_ID = 'qr-scanner-feed';

export function QRScannerView({ onClose }: QRScannerViewProps) {
  const guests = useSeatingStore((s) => s.guests);
  const venue = useSeatingStore((s) => s.venue);
  const checkInGuest = useSeatingStore((s) => s.checkInGuest);

  const [welcomeData, setWelcomeData] = useState<{
    guestName: string;
    tableLabel: string | null;
    seatIndex: number | null;
  } | null>(null);

  const handleScan = useCallback(
    (raw: string) => {
      const guestId = decodeGuestQR(raw);

      if (!guestId) {
        toast.error('Unrecognized QR code');
        return;
      }

      const guest = guests.find((g) => g.id === guestId);

      if (!guest) {
        toast.error('Guest not found');
        return;
      }

      if (guest.checkedInAt) {
        const time = new Date(guest.checkedInAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        toast.info(`${guest.name} already checked in at ${time}`);
        return;
      }

      // Check in the guest
      checkInGuest(guestId);

      // Resolve table label
      const table = guest.tableId
        ? venue.tables.find((t) => t.id === guest.tableId)
        : null;

      setWelcomeData({
        guestName: guest.name,
        tableLabel: table?.label ?? null,
        seatIndex: guest.seatIndex,
      });
    },
    [guests, venue.tables, checkInGuest]
  );

  const { isScanning, error, startScanning, stopScanning } =
    useQRScanner(handleScan);

  // Start scanning on mount
  useEffect(() => {
    // Small delay to ensure the DOM element is rendered
    const timer = setTimeout(() => {
      startScanning(SCANNER_ELEMENT_ID);
    }, 100);
    return () => {
      clearTimeout(timer);
    };
  }, [startScanning]);

  const handleDismissWelcome = useCallback(() => {
    setWelcomeData(null);
    // Restart scanning
    startScanning(SCANNER_ELEMENT_ID);
  }, [startScanning]);

  const handleRetry = useCallback(() => {
    startScanning(SCANNER_ELEMENT_ID);
  }, [startScanning]);

  const handleClose = useCallback(() => {
    stopScanning();
    onClose();
  }, [stopScanning, onClose]);

  // Show welcome overlay
  if (welcomeData) {
    return (
      <QRWelcomeOverlay
        guestName={welcomeData.guestName}
        tableLabel={welcomeData.tableLabel}
        seatIndex={welcomeData.seatIndex}
        onDismiss={handleDismissWelcome}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
        <div className="flex items-center gap-2 text-white">
          <ScanLine size={20} />
          <span className="font-semibold text-lg">QR Scanner</span>
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Close scanner"
        >
          <X size={20} />
        </button>
      </div>

      {/* Camera area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
              <ScanLine size={32} className="text-slate-500" />
            </div>
            <p className="text-slate-300 text-lg font-medium">{error}</p>
            <Button
              variant="ghost"
              onClick={handleRetry}
              className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
            >
              <RefreshCw size={16} className="mr-2" />
              Try Again
            </Button>
          </div>
        ) : (
          <div className="relative w-full max-w-md mx-auto aspect-square">
            <div
              id={SCANNER_ELEMENT_ID}
              className="w-full h-full rounded-xl overflow-hidden"
            />
            {/* Scan line animation */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
                <div className="qr-scan-line" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-4 py-4 bg-slate-800 text-center">
        <p className="text-slate-400 text-sm">
          {error
            ? 'Use manual check-in as a fallback'
            : isScanning
              ? 'Point camera at guest QR code'
              : 'Starting camera...'}
        </p>
      </div>
    </div>
  );
}
