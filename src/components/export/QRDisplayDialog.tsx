'use client';

import { useState, useMemo, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { encodeFloorPlanData, buildShareUrl } from '@/lib/share-encoder';
import { Eye, EyeOff, AlertTriangle, Copy, Check, Maximize2, X } from 'lucide-react';

interface QRDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRDisplayDialog({ open, onOpenChange }: QRDisplayDialogProps) {
  const guests = useSeatingStore((s) => s.guests);
  const venue = useSeatingStore((s) => s.venue);

  const [showNames, setShowNames] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const seatedCount = useMemo(() => guests.filter((g) => g.tableId).length, [guests]);

  const encoded = useMemo(
    () => encodeFloorPlanData(venue, guests, showNames),
    [venue, guests, showNames]
  );

  const shareUrl = useMemo(() => buildShareUrl(encoded), [encoded]);

  const handleToggleNames = useCallback(() => {
    if (!showNames) {
      setPrivacyModalOpen(true);
    } else {
      setShowNames(false);
    }
  }, [showNames]);

  const handleConfirmNames = useCallback(() => {
    setShowNames(true);
    setPrivacyModalOpen(false);
  }, []);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  if (fullscreen) {
    return (
      <>
        <div
          className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            onClick={() => setFullscreen(false)}
          >
            <X size={20} className="text-slate-600" />
          </button>

          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Scan to View Floor Plan
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {showNames ? 'Guest names visible' : 'Anonymized view'} · {seatedCount} seated · {venue.tables.length} tables
          </p>

          <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
            <QRCodeSVG value={shareUrl} size={360} level="L" />
          </div>

          <p className="text-xs text-slate-400 mt-6">
            Tap anywhere to close
          </p>
        </div>

        <PrivacyModal
          open={privacyModalOpen}
          onClose={() => setPrivacyModalOpen(false)}
          onConfirm={handleConfirmNames}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent title="Display Floor Plan QR" className="max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Display a QR code that guests can scan to view the seating layout on their device.
            </p>

            {/* QR Code */}
            <div className="flex justify-center py-2">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <QRCodeSVG value={shareUrl} size={220} level="L" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <span>{venue.tables.length} tables</span>
              <span className="w-px h-3 bg-slate-200" />
              <span>{seatedCount}/{guests.length} seated</span>
              <span className="w-px h-3 bg-slate-200" />
              <span>{showNames ? 'Names visible' : 'Anonymized'}</span>
            </div>

            {/* Name toggle */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                {showNames ? (
                  <Eye size={14} className="text-slate-500" />
                ) : (
                  <EyeOff size={14} className="text-slate-500" />
                )}
                <span className="text-sm text-slate-700">Show guest names</span>
              </div>
              <button
                onClick={handleToggleNames}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                  showNames ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    showNames ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyUrl}
                className="flex-1"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                <span className="ml-1">{copied ? 'Copied' : 'Copy Link'}</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  setFullscreen(true);
                }}
                className="flex-1"
              >
                <Maximize2 size={14} />
                <span className="ml-1">Fullscreen</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PrivacyModal
        open={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        onConfirm={handleConfirmNames}
      />
    </>
  );
}

function PrivacyModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-sm mx-4 animate-in zoom-in-95 fade-in">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Show Guest Names?
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Enabling this will make guest names visible to anyone who scans the QR code. This information may be seen by all attendees.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Keep Anonymous
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>
            Show Names
          </Button>
        </div>
      </div>
    </div>
  );
}
