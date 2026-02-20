'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';

interface UseQRScannerReturn {
  isScanning: boolean;
  error: string | null;
  startScanning: (elementId: string) => Promise<void>;
  stopScanning: () => Promise<void>;
}

function mapCameraError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
    return 'Camera access denied. Please enable camera permissions in your browser settings.';
  }
  if (msg.includes('NotFoundError') || msg.includes('no camera')) {
    return 'No camera found. Please connect a camera or use manual check-in.';
  }
  if (msg.includes('NotReadableError') || msg.includes('in use')) {
    return 'Camera is in use by another application.';
  }
  return 'Unable to start camera. Please try again.';
}

export function useQRScanner(
  onScan: (decodedText: string) => void
): UseQRScannerReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ value: string; time: number } | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const startScanning = useCallback(async (elementId: string) => {
    setError(null);

    try {
      // Clean up any existing scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch {
          // Ignore cleanup errors
        }
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          const now = Date.now();
          const last = lastScanRef.current;

          // Debounce: ignore same QR within 3s
          if (last && last.value === decodedText && now - last.time < 3000) {
            return;
          }

          lastScanRef.current = { value: decodedText, time: now };
          onScanRef.current(decodedText);
        },
        () => {
          // QR code not found in frame — ignore
        }
      );

      setIsScanning(true);
    } catch (err) {
      setError(mapCameraError(err));
      setIsScanning(false);
    }
  }, []);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        try {
          scannerRef.current.clear();
        } catch {
          // Ignore
        }
        scannerRef.current = null;
      }
    };
  }, []);

  return { isScanning, error, startScanning, stopScanning };
}
