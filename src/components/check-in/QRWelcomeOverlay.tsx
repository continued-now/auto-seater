'use client';

import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2 } from 'lucide-react';
import { encodeSeatingText } from '@/lib/qr-utils';

interface QRWelcomeOverlayProps {
  guestName: string;
  tableLabel: string | null;
  seatIndex: number | null;
  onDismiss: () => void;
  duration?: number; // ms, default 8000
}

export function QRWelcomeOverlay({
  guestName,
  tableLabel,
  seatIndex,
  onDismiss,
  duration = 8000,
}: QRWelcomeOverlayProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onDismiss]);

  const handleClick = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const seatingText = encodeSeatingText(guestName, tableLabel, seatIndex);
  const hasTable = tableLabel != null;

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center cursor-pointer select-none"
      onClick={handleClick}
    >
      <div className="flex flex-col items-center gap-6 max-w-sm px-6 text-center">
        {/* Check icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 size={48} className="text-emerald-500" />
        </div>

        {/* Name */}
        <h1 className="text-4xl font-bold text-slate-900">
          Welcome, {guestName}!
        </h1>

        {/* Table/seat info */}
        {hasTable ? (
          <p className="text-xl text-cyan-600 font-medium">
            {tableLabel}
            {seatIndex != null && <> &middot; Seat {seatIndex + 1}</>}
          </p>
        ) : (
          <p className="text-lg text-slate-500">
            Your seating will be assigned shortly
          </p>
        )}

        {/* QR code for guest to scan */}
        {hasTable && (
          <div className="mt-2 flex flex-col items-center gap-3">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <QRCodeSVG value={seatingText} size={180} level="M" />
            </div>
            <p className="text-sm text-slate-400">
              Scan for seating details
            </p>
          </div>
        )}

        {/* Tap to dismiss hint */}
        <p className="text-sm text-slate-400 mt-4">
          Tap anywhere to continue
        </p>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100">
        <div
          className="h-full bg-cyan-500 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
